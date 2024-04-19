## What is this?

It is based on [Donald Knuths "Literate Programming"](https://en.wikipedia.org/wiki/Literate_programming) paradigm where you essentially write your software as a form of an essay. Then a tool "tangles" the code blocks together into the finalized code.
## How does this work?

You write out your program using markdown with code blocks. You only need a traditional markdown format.

Each code block can be setup to get "tangled" into outputs or files with that code pieced together. This markdown file you're reading right now is actually self compiled so it's a perfect example.

## The "Tangler"

### Markdown Code Blocks

As per the [Markdown Syntax Guidelines](https://www.markdownguide.org/basic-syntax/) the way to generate a [Code Block](https://www.markdownguide.org/basic-syntax/#code) is to start with 3 backticks, then the code, then end with 3 backticks.

We are going to create a class that holds a generic structure for markdown blocks along with some special attributes which are going to be explained later.

Further classes will inherit from this class.

``` javascript lit-type:code lit-name:md_block_class
class MDCodeBlock {
    constructor() {
        this.code = null;
        this.start_line_number = null;
        this.end_line_number = null;
        this.source_file = null;
    }

    setSourceFile(file) {
        this.source_file = file;
    }

    setCode(code) {
        this.code = code;
    }

    setStartLineNumber(number) {
        this.start_line_number = number;
    }

    setEndLineNumber(number) {
        this.end_line_number = number;
    }
}
```

### Configuration Blocks

Sometimes we may want to document our configuration for our parser as well and for a variety of reasons. Further, we may want to do more complex "tangling" in a variety of ways. In order to accommodate this and ensure we give developers an opportunity to describe why a configuration is structured the way it is, we can have configuration blocks that are essentially markdown code locks but with special attributes. Anything inside these blocks can be processed as configuration values.

``` javascript lit-type:code lit-name:configuration_block_class
class ConfigurationBlock extends MDCodeBlock {
    constructor(var_name) {
        super();

        this.var_name = var_name;
    }
}
```

### Injection Blocks

Sometimes you don't want to output a whole file. For example, you may have an existing codebase where you'd like to add some new code to some specific file(s) and would like to document those updates without having to import the entire codebase.

Injections let you add an `anchor` in your existing codebase, anywhere, like this: `{{{ an_anchor_to_inject_stuff_info }}}` and it will get swapped with whatever code block is named after that anchor.

Therefore, we can call these injection blocks and provide a class for them. They also need `file_path` so we know what file to look for the placeholder and the `var_name` is what we call the `anchor`.

``` javascript lit-type:code lit-name:injection_block_class
class InjectionBlock extends MDCodeBlock {
    constructor(var_name, file_path) {
        super();

        this.file_path = file_path;
        this.var_name = var_name;
    }
}
```

### Code Blocks

Code blocks, in the literate context, are nothing more than regular [Markdown Code Blocks](#markdown-code-blocks) but with special attributes. An example of initiating a code block would be: `javascript lit-type:code lit-name:some_name_for_this_block` and would be preceded by the typical 3 backticks.

This class should therefore extend `MDCodeBlock` and store the `var_name` as a reference name that further blocks can reference. For examples of how this works, go down to the [PARSER OUTPUT](#parser-output) section to see it in action.

Essentially all referenced `lit` blocks can be referenced with three opening squirrely brackets, the name of the block (the `var_name`) and closed with three squirrely brackets, like this: `{{{ var_name }}}`.

``` javascript lit-type:code lit-name:code_block_class
class CodeBlock extends MDCodeBlock {
    constructor(var_name) {
        super();

        this.var_name = var_name;
    }
}
```

### Output Blocks

When we parse markdown files we have some code blocks which are actually output blocks. These blocks essentially tell the tangler to generate files for output.

An example of creating an output block would look something like this `[three ticks] lit_type:output lit-file:some_file.js` and you can expect to see `some_file.js` get generated with any contents within the output block.

We extend the `MDCodeBlock` class and add a `file_path` parameter which is the location and filename of our output file. The `relative_directory` exists so we can provide a default directory path if none exists in the `lit-file` attribute.

``` javascript lit-type:code lit-name:output_block_class
class OutputBlock extends MDCodeBlock {
    constructor(file_path, relative_directory) {
        super();

        this.file_path = file_path;
        this.relative_directory = relative_directory;
    }
}
```

This class looks identical to the code block class but, when processed later on, we'll see an important distinction in its processing.

### Import Blocks

``` javascript lit-type:code lit-name:import_block_class
class ImportBlock extends MDCodeBlock {
    constructor() {
        super();

        this.path = null;
        this.line_start = null;
        this.line_end = null;
        this.tag = null;
    }

    setPath(path) {
        this.path = path;
    }

    setLineStart(number) {
        this.line_start = number;
    }

    setLineEnd(number) {
        this.line_end = number;
    }

    setTag(tag) {
        this.tag = tag;
    }
}
```

### Reference Blocks

This class stores information where we want to pull in text from other source files and reference them *BUT* we don't want to store them in the markdown file.

For example, think of a scenario where you may want to tangle several markdown code blocks along with existing source code not covered in the markdown structure to create an entirely new output file. Maybe you have some helper functions which don't require any explanation in markdown file and you'd like to tangle those up with the output for something more complex.

``` javascript lit-type:code lit-name:reference_block_class
class ReferenceBlock extends MDCodeBlock {
    constructor(var_name) {
        super();

        this.path = null;
        this.line_start = null;
        this.line_end = null;
        this.tag = null;

        this.var_name = var_name;
    }

    setPath(path) {
        this.path = path;
    }

    setLineStart(number) {
        this.line_start = number;
    }

    setLineEnd(number) {
        this.line_end = number;
    }

    setTag(tag) {
        this.tag = tag;
    }
}
```

### Options

We want the tangler to accept external options depending on the use case so we can make necessary adaptations as to how it works.

The `input_path` option let's us indicate what folder we're going to use to generate our output files from. By default, we use the current project folder but it might be that you want to use an entirely different folder altogether so your markdown can stay in a completely different place.

The `output_path` option is prepended to any and all output blocks so that you can essentially have an entirely diffent directory where your output files end up in.

We also have the ability to ignore certain files and specifically only allow certain files. These files are filtered during the output block phase. The idea is that you may want to only have certain output files processed and output OR only certain markdown files processed at all. Or excluded. Or whatever your needs are. This filters them using the code [Filter code](#filtering-output-blocks) where we iterate over the arrays of blocks we've processed and flush out the ones we excluded and keep the ones we've included.

Note that at the end of this code block, we immediately instantiate `Options` and that's because we ideally only have one instance of that class. This isn't the most fool-proof way to ensure there's only one instance but it signifies its intent to any developer reading it.

``` javascript lit-type:code lit-name:options_class
class Options {
    constructor() {
        this.input_path = './';
        this.output_path = './';
        this.ignore_files = [];
        this.include_files = [];
        this.output_source = true;
        this.output_source_absolute_paths = false;
    }

    setOutputSourceAbsolutePaths(value) {
        this.output_source_absolute_paths = value;
    }

    setOutputSource(value) {
        this.output_source = value;
    }

    setInputPath(value) {
        this.input_path = value;
    }

    setOutputPath(value) {
        this.output_path = value;
        if (value !== './') {
            let isDirectory = !path.extname(this.output_path);
            let endsWithSlash = this.output_path.endsWith(path.sep);
            if (isDirectory && !endsWithSlash) {
    	        this.output_path += path.sep;
    	    }
    	}
    }

    setOutputFile(value) {
        this.output_file = value;
    }
    
    setMdFile(value) {
        this.md_file = value;
    }
}
let options = new Options();
```

### Storing our blocks

Before we move forward, we should store our blocks into arrays that we can iterate and process after.

You can find more information about what these arrays will actually store -> [Code Blocks](#code-blocks), [Output Blocks](#output-blocks), [Injection Blocks](#injection-blocks), [Configuration Blocks](#configuration-blocks), [Import Blocks](#import-blocks) and [Reference Blocks](#reference-blocks).

``` javascript lit-type:code lit-name:block_arrays
let code_blocks = [];
let output_blocks = [];
let injection_blocks = [];
let configuration_blocks = [];
let import_blocks = [];
let reference_blocks = [];
```

### Processing Injection Blocks

Since injection blocks are more surgical in nature in that they take code in the markdown and inject that code into source code by looking for placeholders, we have to literally read in the target file and search for that placeholder.

It's important to note that injection blocks are *dependent* on the user to write the placeholder into target files at the desired destination.

``` javascript lit-type:code lit-name:process_injection_blocks_function
function processInjectionBlocks() {
    console.log(`Found ${injection_blocks.length} injection blocks`);
    injection_blocks.forEach(injection => {
        const outputFilePath = path.join(options.input_path, injection.file_path);
        fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
        if (fs.existsSync(outputFilePath)) {
            const outputContent = fs.readFileSync(outputFilePath, 'utf8');
            let placeholder = `{{{ ${injection.var_name} }}}`;
            const relativeSourceFile = path.relative(process.cwd(), filePath);
            let output = '';
            if (options.output_source) {
                if (options.output_source_absolute_paths) {
                    output += `// Source: ${handlePath(relativeSourceFile, options)[0]}\n`;
                } else {
                    output += `// Source: ${block.source_file}\n`;
                }
                output += `// Anchor: ${injection.var_name}\n`;
            }
            output += injection.code;
            const updatedContent = outputContent.replace(placeholder, output);
            fs.writeFileSync(outputFilePath, updatedContent);
            console.log(`Injected code block '${injection.var_name}' into '${outputFilePath}'.`);
        } else {
            console.error(`Error: Output file '${outputFilePath}' does not exist.`);
        }
    });
}
```

### Filtering Output Blocks

If we've passed in options to exclude or include particular files then we should filter our output blocks based on that. Note that we will be using this to check both the intended output files (if any) and the source files since those match up to the kind of options we allow.

An example for this type of configuration value would be like this (in `config.md`):

```
path/to/markdown/file/to/exclude.md
path/to/output/file/to/exclude.js
```

Note how you can exclude based on both the source markdown file and also the intended output file.

``` javascript lit-type:code lit-name:filter_output_blocks_function
function filterOutputBlocks(filter_type, path_type) {
    let cross_reference = (filter_type === 0) ? options.include_files : options.ignore_files;
    let new_output_blocks = [];
    for (let block = 0; block < output_blocks.length; ++block) {
        let output_block = output_blocks[block];
        let block_path = (path_type === 0) ? output_block.file_path : output_block.source_file;
        let source_file_path = handlePath(block_path, options);
        let should_be_filtered = false;
        for (let i = 0; i < cross_reference.length; ++i) {
            let file = cross_reference[i];
            let file_path = handlePath(file, options);
            if (source_file_path[0] === file_path[0]) {
                should_be_filtered = true;
                break;
            }
        }
        if (filter_type === 0 && should_be_filtered) {
            new_output_blocks.push(output_block);
        } else if (filter_type === 1 && !should_be_filtered) {
            new_output_blocks.push(output_block);
        }
    }
    output_blocks = new_output_blocks;
}
```

### Processing Import Blocks

Import blocks need to read text from target files based on either line numbers or by tags.

Line numbers are simply provided with a start and end. If no ending line number is provided then the process will read to the end of the file.

Tags are read by looking for comments in the target file. The tag structure is demonstrated below.

```
// lit-tag: some_tag_to_import
[CODE HERE]
// lit-tag: some_tag_to_import
```

Note that it requires two tags of the same name to indicate a start and end. Just like line numbers, if no ending tag is found, the processor will read to the end of the file.

``` javascript lit-type:code lit-name:process_import_blocks_function
function processImportBlocks() {
    console.log(`Found ${import_blocks.length} import blocks`);
    import_blocks.forEach(import_block => {
        let import_block_lines = import_block.code.split('\n');
        import_block_lines.forEach(line => {
            const config = line.split('=');
            if (config[0] === 'path') {
                import_block.setPath(config[1]);
            } else if (config[0] === 'line_start') {
                import_block.setLineStart(config[1]);
            } else if (config[0] === 'line_end') {
                import_block.setLineEnd(config[1]);
            } else if (config[0] === 'tag') {
                import_block.setTag(config[1]);
            }
        });

        let import_content = readContent(import_block);

        if (import_content !== '') {
            let source_file = import_block.source_file;
            let source_file_path = handlePath(source_file, options);
            let source_content = fs.readFileSync(source_file_path[0], 'utf8');
            let source_lines = source_content.split('\n');
            let new_source_content = '';
            for (let i = 0; i < source_lines.length; ++i) {
                if (i === (import_block.start_line_number - 1)) {
                    source_lines[i] = '```\n';
                }
                if (i === import_block.start_line_number) {
                    source_lines[i] = import_content;
                }
                if (i > import_block.start_line_number && i < (import_block.end_line_number - 1)) {
                    continue;
                }
                new_source_content += source_lines[i] + '\n';
            }
            fs.writeFileSync(source_file_path[0], new_source_content);
            console.log(`Imported code block '${import_block.path}' into '${source_file_path[0]}'.`);
        }
    });
}
```

### Processing Reference Blocks

This function is actually used to *setup* the reference blocks by reading their configuration values so we can actually ingest the references later on.

An example of a reference block.

```
path=some/path/to/a/file.js
line_start=20
line_end=30
tag=tag_to_reference
```

Note how it looks very similar to the import process. This stores ingested file text "ephemerally", however, such that it's not actually brought into the source markdown at all but available "in memory", at "runtime".

We can see the use of this during the `replacePlaceholdersRecursively` function where reference blocks are brought in during that iteration.

``` javascript lit-type:code lit-name:process_reference_blocks_function
function processReferenceBlocks() {
    console.log(`Found ${reference_blocks.length} reference blocks`);
    reference_blocks.forEach(reference_block => {
        let reference_block_lines = reference_block.code.split('\n');
        reference_block_lines.forEach(line => {
            const config = line.split('=');
            if (config[0] === 'path') {
                reference_block.setPath(config[1]);
            } else if (config[0] === 'line_start') {
                reference_block.setLineStart(config[1]);
            } else if (config[0] === 'line_end') {
                reference_block.setLineEnd(config[1]);
            } else if (config[0] === 'tag') {
                reference_block.setTag(config[1]);
            }
        });
    });
}
```

### Processing Configuration Blocks

This function is a bit misleading because it checks for the existence of multiple configuration blocks but, for the time being, we only expect to see one configuration block per project, as defined in a `config.md` file.

In the future, there may be more, including specific override configurations for unique situations, so we can prepare for that pretty easily here.

``` javascript lit-type:code lit-name:process_configuration_blocks_function
function processConfigurationBlocks() {
    console.log(`Found ${configuration_blocks.length} config blocks.`);
    configuration_blocks.forEach(configuration => {
        const configuration_lines = configuration.code.split("\n");
        if (configuration.var_name === 'include') {
            configuration_lines.forEach(conf_line => {
                options.include_files.push(conf_line);
            });
        } else if (configuration.var_name === 'ignore') {
            configuration_lines.forEach(conf_line => {
                options.ignore_files.push(conf_line);
            });
        } else if (configuration.var_name === 'general') {
            configuration_lines.forEach(line => {
                const entry = line.split('=');
                if (entry[0] === 'output_source') {
                    if (entry[1] === 'true') {
                        options.setOutputSource(true);
                    } else {
                        options.setOutputSource(false);
                    }
                } else if (entry[0] === 'output_source_absolute_paths') {
                    if (entry[1] === 'true') {
                        options.setOutputSourceAbsolutePaths(true);
                    } else {
                        options.setOutputSourceAbsolutePaths(false);
                    }
                }
            });
        }
        
    });
}
```

### Processing Output Blocks

Output blocks should be the last thing we process. We ultimately need *all other* blocks to be fully processed in order to ensure that our output blocks get the text they need during this generate. The `replacePlaceholdersRecursively` function handles iterating over any final blocks not processed (mostly code blocks) and then generating the final output text.

``` javascript lit-type:code lit-name:process_output_blocks_function
function processOutputBlocks() {
    console.log(`Found ${code_blocks.length} code blocks.`);
    console.log(`Found ${output_blocks.length} output blocks`);
    output_blocks.forEach(output => {
        let updated_code = output.code;
        updated_code = replacePlaceholdersRecursively(updated_code);
        if (!output.file_path.includes(path.sep)) {
            output.file_path = output.relative_directory + output.file_path;
        }
        let output_file_path = handlePath(output.file_path, options);
        if (options.output_path !== './') {
            output_file_path = handlePath(options.output_path + output.file_path, options);
        }
        fs.mkdirSync(path.dirname(output_file_path[0]), { recursive: true });
        fs.writeFileSync(output_file_path[0], updated_code);
        console.log(`Wrote file ${output_file_path[0]}`);
        
    });
}
```

### Reading configuration.md Markdown

This simple function checks for the existence of a `config.md` file and runs the `processMarkdownFile` function (which we use to process all other markdowns) which will, in turn, pull out any configuration blocks.

``` javascript lit-type:code lit-name:read_config_markdown_function
function readConfigMarkdown() {
    const config_path = handlePath('config.md', options);
    if (fs.existsSync(config_path[0])) {
        try {
            console.log('Found a config.md file. Processing...');
            processMarkdownFile(config_path[0], '');
        } catch (err) {
            console.error('Could not read config.md file');
        }
    } else {
        console.log('No config.md file. Using defaults.');
    }
}
```

### Read CLI Arguments

When we run the "tangler" we just want to read any CLI arguments passed in.

``` javascript lit-type:code lit-name:read_cli_arguments_function
function readCLIArguments() {
    const args = process.argv.slice(2);
    args.forEach(arg => {
        if (arg.startsWith("--input-path=")) {
            options.setInputPath(arg.slice(13));
        } else if (arg.startsWith("--output-path=")) {
            options.setOutputPath(arg.slice(14));
        }
    });
    console.log(options);
}
```

### Read Content

This is a general function used by the reference and import processes to read the contents of a target file and look for specific lines that meet either the line numbers provided or the tag(s) provided. This will return any content in the target file between the lines / tags.

``` javascript lit-type:code lit-name:read_content_function
function readContent(block) {
    const import_path = handlePath(block.path, options);
    let import_lines = fs.readFileSync(import_path[0], 'utf8').split('\n');
    let import_start = 0;
    let import_end = import_lines.length;
    let import_content = '';
    if (block.tag) {
        let found_tag = false;
        for (let i = 0; i < import_lines.length; ++i) {
            if (import_lines[i].includes('lit-tag: ' + block.tag) && !found_tag) {
                found_tag = true;
                import_start = i;
            } else if (import_lines[i].includes('lit-tag: ' + block.tag) && found_tag) {
                found_tag = false;
                import_end = i;
            }

            if (found_tag && i >= (import_start + 1)) {
                import_content += import_lines[i] + '\n';
            }
        }
        if (!found_tag) {
            console.error(`Could not find tag '${block.tag}' in file '${import_path[0]}'`);
        }
    } else {
        if (block.line_start) {
            import_start = block.line_start;
        }
        if (block.line_end) {
            import_end = block.line_end;
        }
        for (let i = import_start; i < import_end; ++i) {
            import_content += import_lines[i] + '\n';
        }
    }

    return import_content;
}
```

### Replace Placeholders Recursively

If you've read everything up to this point, you'll get the idea pretty easily. Essentially we need to over every "block" we've pulled in prior to this function being called and make sure we recursively replace placeholder values all the way throughout.

This is run *before* we output files.

You can imagine two different blocks requiring a reference to a third block and the two blocks will have a placeholder like `{{{ some_initial_block_to_process }}}` which means we have to recursively process everything until we find no further placeholders to swap out.

``` javascript lit-type:code lit-name:replace_placeholders_recursively_function
function replacePlaceholdersRecursively(code) {
    let updated_code = code;
    let placeholdersFound = true;

    while (placeholdersFound) {
        placeholdersFound = false;

        let lines = updated_code.split('\n');
        for (let l = 0; l < lines.length; ++l) {
            let line = lines[l];
            const leading_spaces = line.match(/^\s*/)[0].length;
            const leading_tabs = line.match(/^\t*/)[0].length;
            reference_blocks.forEach(block => {
                const placeholder = `{{{ ${block.var_name} }}}`;
                if (line.includes(placeholder)) {
                    placeholdersFound = true;
                    let replacement = '';
                    if (options.output_source) {
                        if (options.output_source_absolute_paths) {
                            replacement += `// Source: ${handlePath(block.source_file, options)[0]}\n`;
                        } else {
                            replacement += `// Source: ${block.source_file}\n`;
                        }
                        replacement += `// Anchor: ${block.var_name}\n`;
                    }
                    let reference_content = readContent(block);
                    replacement += reference_content;
                    replacement = replacement.split('\n');
                    for (let r = 0; r < replacement.length; ++r) {
                        if (r === 0) { continue; }
                        let replacement_line = '';
                        for (let space = 0; space < leading_spaces; ++space) {
                            replacement_line += ' ';
                        }
                        for (let tab = 0; tab < leading_tabs; ++tab) {
                            replacement_line += '\t';
                        }
                        replacement_line += replacement[r];
                        replacement[r] = replacement_line;
                    }
                    lines[l] = line.replace(placeholder, replacement.join('\n'));
                }
            });
            code_blocks.forEach(block => {
                const placeholder = `{{{ ${block.var_name} }}}`;
                if (line.includes(placeholder)) {
                    placeholdersFound = true;
                    let replacement = '';
                    if (options.output_source) {
                        if (options.output_source_absolute_paths) {
                            replacement += `// Source: ${handlePath(block.source_file, options)[0]}\n`;
                        } else {
                            replacement += `// Source: ${block.source_file}\n`;
                        }
                        replacement += `// Anchor: ${block.var_name}\n`;
                    }
                    replacement += `${block.code}`;
                    replacement = replacement.split('\n');
                    for (let r = 0; r < replacement.length; ++r) {
                        if (r === 0) { continue; }
                        let replacement_line = '';
                        for (let space = 0; space < leading_spaces; ++space) {
                            replacement_line += ' ';
                        }
                        for (let tab = 0; tab < leading_tabs; ++tab) {
                            replacement_line += '\t';
                        }
                        replacement_line += replacement[r];
                        replacement[r] = replacement_line;
                    }
                    lines[l] = line.replace(placeholder, replacement.join('\n'));
                }
                const source_placeholder = `{{{ ${block.source_file}:${block.var_name} }}}`;
                if (line.includes(source_placeholder)) {
                    placeholdersFound = true;
                    let replacement = '';
                    if (options.output_source) {
                        if (options.output_source_absolute_paths) {
                            replacement += `// Source: ${handlePath(block.source_file, options)[0]}\n`;
                        } else {
                            replacement += `// Source: ${block.source_file}\n`;
                        }
                        replacement += `// Anchor: ${block.var_name}\n`;
                    }
                    replacement += `${block.code}`;
                    replacement = replacement.split('\n');
                    for (let r = 0; r < replacement.length; ++r) {
                        if (r === 0) { continue; }
                        let replacement_line = '';
                        for (let space = 0; space < leading_spaces; ++space) {
                            replacement_line += ' ';
                        }
                        for (let tab = 0; tab < leading_tabs; ++tab) {
                            replacement_line += '\t';
                        }
                        replacement_line += replacement[r];
                        replacement[r] = replacement_line;
                    }
                    lines[l] = line.replace(source_placeholder, replacement.join('\n'));
                }
            });
        }
        updated_code = lines.join('\n');
    }

    return updated_code;
}
```

### Processing Project Directory

This function lets us pass an initial directory (usually from our options) to iterate over and pull out markdown files that need to get "tangled".

``` javascript lit-type:code lit-name:process_directory_function
function processDirectory(dirPath, current_project_directory) {
    fs.readdirSync(dirPath).forEach(entry => {
        const entryPath = path.join(dirPath, entry);
        const stat = fs.statSync(entryPath);
        if (stat.isDirectory()) {
            current_project_directory += entry + path.sep;
            processDirectory(entryPath, current_project_directory);
        } else if (entry.endsWith('.md')) {
            processMarkdownFile(entryPath, current_project_directory);
        }
    });
}
```

### Processing Markdown Files

This function deals with reading markdown files, line by line, and looking for code blocks with the special `lit-*` attributes. Based on those attributes, we parse out content inside the block and put them into their appropriate classes and arrays for later processing.

``` javascript lit-type:code lit-name:process_markdown_file_function
function processMarkdownFile(filePath, current_project_directory) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let in_code_block = false;
    let current_var_name = null;
    let current_output_file = null;
    let current_type = null;
    let code_buffer = '';
    let current_start_line = 0;
    let is_lit = false;
    let current_line = 0;
    
    lines.forEach(line => {
        ++current_line;
        if (line.startsWith('```') && !in_code_block) {
            in_code_block = true;
            if (line.match('lit-', 'g')) {
                is_lit = true;
                current_start_line = current_line;
                let parts = line.split('lit-');
                for (let p = 0; p < parts.length; ++p) {
                    let attributes = parts[p].split(':');
                    if (attributes.length < 2) { continue; }
                    if (attributes[0] === 'type') {
                        current_type = attributes[1].trim();
                    } else if (attributes[0] === 'name') {
                        current_var_name = attributes[1].trim();
                    } else if (attributes[0] === 'file') {
                        current_output_file = attributes.slice(1).join(':').trim();
                    }
                }
            }
            
        } else if (line.startsWith('```') && in_code_block) {
            in_code_block = false;
            if (is_lit) {
                if (current_type === 'injection') {
                    let block = new InjectionBlock(current_var_name, current_output_file);
                    block.setSourceFile(filePath);
                    block.setCode(code_buffer);
                    block.setStartLineNumber(current_start_line);
                    block.setEndLineNumber(current_line);
                    injection_blocks.push(block);
                } else if (current_type === 'output') {
                    let block = new OutputBlock(current_output_file, current_project_directory);
                    block.setSourceFile(filePath);
                    block.setCode(code_buffer);
                    block.setStartLineNumber(current_start_line);
                    block.setEndLineNumber(current_line);
                    output_blocks.push(block);
                } else if (current_type === 'code') {
                    let block = new CodeBlock(current_var_name);
                    block.setSourceFile(filePath);
                    block.setCode(code_buffer);
                    block.setStartLineNumber(current_start_line);
                    block.setEndLineNumber(current_line);
                    code_blocks.push(block);
                } else if (current_type === 'config') {
                    let block = new ConfigurationBlock(current_var_name);
                    block.setSourceFile(filePath);
                    block.setCode(code_buffer);
                    block.setStartLineNumber(current_start_line);
                    block.setEndLineNumber(current_line);
                    configuration_blocks.push(block);
                } else if (current_type === 'import') {
                    let block = new ImportBlock();
                    block.setSourceFile(filePath);
                    block.setCode(code_buffer);
                    block.setStartLineNumber(current_start_line);
                    block.setEndLineNumber(current_line);
                    import_blocks.push(block);
                } else if (current_type === 'reference') {
                    let block = new ReferenceBlock(current_var_name);
                    block.setSourceFile(filePath);
                    block.setCode(code_buffer);
                    block.setStartLineNumber(current_start_line);
                    block.setEndLineNumber(current_line);
                    reference_blocks.push(block);
                }
            }
            current_var_name = null;
            current_output_file = null;
            current_type = null;
            code_buffer = '';
            current_start_line = 0;
            is_lit = false;
            
        } else if (in_code_block) {
            code_buffer += line + '\n';
        }
    });   
}
```

### Path Handling

This is simply a way to get both the absolute and relative paths of a target, with operating system specificities in mind.

``` javascript lit-type:code lit-name:handle_path_function
function handlePath(inputPath, options) {
    const isWindows = os.platform() === 'win32';
    const pathModule = isWindows ? path.win32 : path;
    let absolutePath;

    if (pathModule.isAbsolute(inputPath)) {
        absolutePath = inputPath;
    } else {
        absolutePath = pathModule.resolve(options.input_path, inputPath);
    }

    const relativePath = path.relative(options.input_path, absolutePath);
    return [absolutePath, relativePath];
}
```

## The Main Function

At this point, we're ready to execute everything.

``` javascript lit-type:code lit-name:main_function
function main() {    
    readCLIArguments();
    
    readConfigMarkdown();
    
    processConfigurationBlocks();

    processDirectory(options.input_path, '');

    processImportBlocks();

    processReferenceBlocks();
    
    filterOutputBlocks(0, 0);
    filterOutputBlocks(0, 1);
    filterOutputBlocks(1, 0);
    filterOutputBlocks(1, 1);
    
    processOutputBlocks();

    processInjectionBlocks();
}

main();
```

# General Concepts and Use Cases

### Variable referencing

Code blocks that have already been defined and given a variable name can be referenced in, both, *other* code blocks *and* output code blocks. This does mean you could end up with a circular reference scenario so take care not to do that. We're all adults here. You can do it.

Your output block can therefore reference any code block as a variable to be replaced or injected. This markdown file is full of examples as to how this is done but you can see that the output block at the end of this markdown references all the other code blocks that are "named".

### Configurations

We may want to specify that only particular markdown files are processed. We can do so by listing them with their relative or absolute paths.

We would need to use the `lit-type:config` attribute along with `lit-name:include` to indicate this.

Note that we can also put target output files on these lists.

```
/example/path/to/markdown.md
relative/path/to/markdown.md
relative/path/to/intended/output/file.js
```

We may want to specify that particular markdown files are ignored. We do same in the same way we include.

We would need to use the `lit-type:config` attribute along with `lit-name:ignore` to indicate this.

We may want to provide some general parameters, including some that you might use CLI parameters for.

```
input_path=/some/path/to/a/bunch/of/markdown/files/to/process
output_path=/some/path/to/put/output/files/into
```

We can use the `lit-type:config` and the `lit-name:general` attributes to indicate this.

# PARSER OUTPUT

``` javascript lit-type:output lit-file:parser_v_0.3.js
// Version: 0.3

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('Current working directory: ' + process.cwd());

{{{ md_block_class }}}

{{{ configuration_block_class }}}

{{{ injection_block_class }}}

{{{ code_block_class }}}

{{{ output_block_class }}}

{{{ import_block_class }}}

{{{ reference_block_class }}}

{{{ options_class }}}

{{{ block_arrays }}}

{{{ process_injection_blocks_function }}}

{{{ process_output_blocks_function }}}

{{{ filter_output_blocks_function }}}

{{{ process_import_blocks_function }}}

{{{ process_reference_blocks_function }}}

{{{ process_configuration_blocks_function }}}

{{{ read_config_markdown_function }}}

{{{ read_cli_arguments_function }}}

{{{ read_content_function }}}

{{{ replace_placeholders_recursively_function }}}

{{{ process_directory_function }}}

{{{ process_markdown_file_function }}}

{{{ handle_path_function }}}

{{{ main_function }}}

main();
```

# GOTCHAS

Currently there is no only one thing you need to consider when using this tool. Spacing, tabs or general indentation. Depending on which editor you're using to do the markdown, the output of the file might have weird spacing and/or tabs. I have found that a good way to mitigate this is manually add in the spaces instead of using tabs as some markdown editors have weird symbols for tabs. The upside here is that the code is broken up so that you don't have to worry about the overall spacing of the file and adding in 2 - 4 spaces at the beginning of every line isn't that big a deal.

# How do I run this?

For now, this is done using Node. A simple command would be: `node parser.js` which would take any markdown files in the current directory and process them.

As per the pretty in-depth written coverage in this markdown file, you do have two other parameters. Have a look at the [Options](#options) section for more information.

A zig version is coming so that a standalone binary can be executed without any external dependencies.

# TODOs

* If you encounter the same variable name over and over
    * Overwrite with the latest found variable (code block)
* Configuration options (and implementations) for
    * backing up files if you are overriding
    * ask for confirmations before overriding
* Fix newlines at the end of every "block" unless we just keep that for some reason?
* Add a section about use cases, specifically highlighting when you'd want to use this for an entire codebase or only portions of one and also when you'd want to use this to inject into an existing codebase.
* Fix issues with indents / spacing
* Cleanup the `process_injection_block` with the `handlePath` function available now
* Might need a way to process only a certain set of injection blocks
* A configuration option to only run "imports"
* Update import options to include a variable reference in case you want to do an immediate import to code block conversion with a variable name reference
* If using tags to to imports & references, what if you have _nested_ tags?
