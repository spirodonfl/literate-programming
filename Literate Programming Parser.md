## What is this?

It is based on [Donald Knuths "Literate Programming"](https://en.wikipedia.org/wiki/Literate_programming) paradigm where you essentially write your software as a form of an essay. Then a tool "tangles" the code blocks together into the finalized code.
## How does this work?

You write out your program using markdown with code blocks. You only need a traditional markdown format.

Each code block can be setup to get "tangled" into outputs or files with that code pieced together. This markdown file you're reading right now is actually self compiled so it's a perfect example.
## The "Tangler"

### Code Blocks

When we parse markdown files we should store code blocks that meet certain criteria in an array of code blocks so we can process them later. Therefore, we'll write a class to hold these code blocks.

Code blocks are typically indicated by using three ticks (a tick being the \` character) on a new line and then another three ticks to indicate the end of the block.

What's nice about this format is you can then add extra information on the beginning line. Examples of this kind of format are visible in almost all the code blocks in this very markdown file.

You begin a code block with three ticks followed by the type of code (usually the programming language) so that you can get highlighting (if it's available in your viewer), then followed by the "variable" that you can later reference that code block by for tangling purposes.

Therefore, our code block class should at least have the variable name and the code that is actually between the opening line (first three ticks) and ending line (last three ticks).

There is a `source_file` parameter so we can also keep track of where the code came from when we generate our output files. This is a good way to see the origin of code if you were to only look at the output code and not the markdown. Consider it a `back reference` of sorts.

``` javascript lit-type:code lit-name:code_block_class
// Some comment here
class CodeBlock {
    constructor(var_name, code, source_file) {
        this.var_name = var_name;
        this.code = code;
        this.source_file = source_file;
    }
}
```

### Output Blocks

When we parse markdown files we have some code blocks which are actually output blocks. These blocks essentially tell the tangler to generate files for output.

An output block is similar to a code block in that it begins with three ticks and ends with three ticks. The difference is that the first three ticks are not followed by the code type or a variable name.

Instead, the first line needs to contain a `command` that it must output (or generate) an external file. So a typical first line would contain something like this `[three ticks] output some_file.js` and you can expect to see `some_file.js` get generated with any contents within the output block.

Therefore, our output class needs to know which file it's going to generate, what code will get generated and the source of the markdown file that generated the file.

``` javascript lit-type:code lit-name:output_block_class
class OutputBlock {
    constructor(file_path, code, source_file) {
        this.file_path = file_path;
        this.code = code;
        this.source_file = source_file;
    }
}
```

### Injection Blocks

Sometimes you don't want to output a whole file. For example, you may have an existing codebase where you'd like to add some new code to some specific file(s) and would like to document those updates without having to import the entire codebase.

Injections provide a way for you to add a reference in your existing code anywhere you like using the form `{{{ some_literate_variable_name_reference }}}` and you would use that to define a code block of the same name so that the code block is processed and injected into whatever file you define.

Therefore, we can call these injection blocks and provide a class for them.

``` javascript lit-type:code lit-name:injection_block_class
class InjectionBlock {
    constructor(var_name, file_path, code, source_file) {
        this.file_path = file_path;
        this.code = code;
        this.source_file = source_file;
        this.var_name = var_name;
    }
}
```

This class looks identical to the code block class but, when processed later on, we'll see an important distinction in its processing.

### Configuration Blocks

Sometimes we may want to document our configuration for our parser as well and for a variety of reasons. Further, we may want to do more complex "tangling" in a variety of ways. In order to accommodate this and ensure we give developers an opportunity to describe why a configuration is structured the way it is, we can have configuration blocks that are essentially markdown code locks but with special attributes. Anything inside these blocks can be processed as configuration values.

``` javascript lit-type:code lit-name:configuration_block_class
class ConfigurationBlock {
    constructor(var_name, code) {
        this.code = code;
        this.var_name = var_name;
    }
}
```
### Paths

We want to make sure that paths to our source files and output files are properly handled. This is a relatively straightforward function to handle in Node.

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
### Variable referencing

Code blocks that have already been defined in code blocks and given a variable name can be referenced in both *other* code blocks and output code blocks. This does mean you could end up with a circular reference scenario so take care not to do that. We're all adults here. You can do it.

Your output block can therefore reference any code block as a variable to be replaced or injected. This markdown file is full of examples as to how this is done but you can see that the output block at the end of this markdown references all the other code blocks that are "named".
### Options

We want the tangler to accept external options depending on the use case so we can make necessary adaptations as to how it works.

The `input_path` option let's us indicate what folder we're going to use to generate our output files from. By default, we use the current project folder but it might be that you want to use an entirely different folder altogether so your markdown can stay in a completely different place.

The `output_file` option let's us choose *one specific* output file from all processed output blocks to generate. This way, you don't have to generate every single output file if there are multiple files generated by the markdown and you can be very surgical about what you generate.

The `md_file` option let's us choose *one specific* markdown file to actually fully process. If that markdown file has zero, one or more output files, only those output files will get generated, even if a million other markdown files in the project generate their own output files too. What this *does not do* is limit what code blocks get processed since you can have multi-markdown-file dependencies to code blocks that even one markdown file is required to process to output everything properly.

Note that at the end of this code block, we immediately instantiate `Options` and that's because we ideally only have one instance of that class. This isn't the most fool-proof way to ensure there's only one instance but it signifies its intent to any developer reading it.

``` javascript lit-type:code lit-name:options_class
class Options {
    constructor() {
        this.input_path = './';
        this.output_path = './';
        this.output_file = false;
        this.md_file = false;
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

### Main function

This function is going to run at the very end of our javascript file since it will be the entry point into everything else.

We start by reading in CLI parameters, if they've been passed in, and setting those values in the instantiated options class (which is named as `options`). Look at the [[#Options]] section for more information. We simply use Node's built-in "process" mechanism to read arguments from the command.

Note that CLI parameters will override configuration values provided by any `config.md` file.

``` javascript lit-type:code lit-name:read_cli_parameters
const args = process.argv.slice(2);
args.forEach(arg => {
	if (arg.startsWith("--input-path=")) {
		options.setInputPath(arg.slice(13));
	} else if (arg.startsWith("--output-file=")) {
		options.setOutputFile(arg.slice(14));
	} else if (arg.startsWith("--md-file=")) {
		options.setMdFile(arg.slice(10));
	} else if (arg.startsWith("--output-path=")) {
        options.setOutputPath(arg.slice(14));
	}
});
console.log(options);
```

We need to store the code blocks and output blocks we find in arrays so we can iterate over them later. You can find more information about what these arrays will actually store -> [[#Code Blocks]], [[#Output Blocks]], [[#Injection Blocks]] and [[#Configuration Blocks]].

``` javascript lit-type:code lit-name:block_arrays
let code_blocks = [];
let output_blocks = [];
let injection_blocks = [];
let configuration_blocks = [];
```

We want to call our `processDirectory` function and pass it the `input_path` from the options class as well as the arrays to store things that are found during processing. You can find out more about this function [[#Process directory]].

``` javascript lit-type:code lit-name:call_process_directory
processDirectory(options.input_path, output_blocks, code_blocks, injection_blocks, configuration_blocks);
```

Assuming that `processDirectory` executed everything it needed to correctly, we should have an array of output blocks (most likely) which we then need to filter based on whether or not the `md_file` and / or `output_file` options were passed in. We only want to process output blocks that meet those optional criteria.

``` javascript lit-type:code lit-name:filter_output_blocks
if (options.include_files && options.include_files.length > 0) {
    let new_output_blocks = [];
    for (let block = 0; block < output_blocks.length; ++block) {
        let output_block = output_blocks[block];
        let source_file_path = handlePath(output_block.file_path, options);
        let should_be_added = false;
        for (let i = 0; i < options.include_files.length; ++i) {
            let file = options.include_files[i];
            let ignore_file_path = handlePath(file, options);
            if (source_file_path[0] === ignore_file_path[0]) {
                should_be_added = true;
                break;
            }
        }
        if (should_be_added) {
            new_output_blocks.push(output_block);
        }
    }
    output_blocks = new_output_blocks;
}
if (options.ignore_files && options.ignore_files.length > 0) {
    let new_output_blocks = [];
    for (let block = 0; block < output_blocks.length; ++block) {
        let output_block = output_blocks[block];
        let source_file_path = handlePath(output_block.file_path, options);
        let should_be_ignored = false;
        for (let i = 0; i < options.ignore_files.length; ++i) {
            let file = options.ignore_files[i];
            let ignore_file_path = handlePath(file, options);
            if (source_file_path[0] === ignore_file_path[0]) {
                should_be_ignored = true;
                break;
            }
        }
        if (!should_be_ignored) {
            new_output_blocks.push(output_block);
        }
    }
    output_blocks = new_output_blocks;
}
if (options.include_files && options.include_files.length > 0) {
    let new_output_blocks = [];
    for (let block = 0; block < output_blocks.length; ++block) {
        let output_block = output_blocks[block];
        let source_file_path = handlePath(output_block.source_file, options);
        let should_be_added = false;
        for (let i = 0; i < options.include_files.length; ++i) {
            let file = options.include_files[i];
            let ignore_file_path = handlePath(file, options);
            if (source_file_path[0] === ignore_file_path[0]) {
                should_be_added = true;
                break;
            }
        }
        if (should_be_added) {
            new_output_blocks.push(output_block);
        }
    }
    output_blocks = new_output_blocks;
}
if (options.ignore_files && options.ignore_files.length > 0) {
    let new_output_blocks = [];
    for (let block = 0; block < output_blocks.length; ++block) {
        let output_block = output_blocks[block];
        let source_file_path = handlePath(output_block.source_file, options);
        let should_be_ignored = false;
        for (let i = 0; i < options.ignore_files.length; ++i) {
            let file = options.ignore_files[i];
            let ignore_file_path = handlePath(file, options);
            if (source_file_path[0] === ignore_file_path[0]) {
                should_be_ignored = true;
                break;
            }
        }
        if (!should_be_ignored) {
            new_output_blocks.push(output_block);
        }
    }
    output_blocks = new_output_blocks;
}
```

We want to ensure we process any configuration blocks, first and foremost, since those will determine further action. That's done by *forcing* a check of a `config.md` file since, in some cases, we may ask the parser to limit itself to reading only one markdown file, which would naturally exclude a possible config file. To see the various kinds of configurations that we can process, refer to the [[#Configurations]] section.

``` javascript lit-type:code lit-name:iterate_config_blocks
const config_path = handlePath('config.md', options);
if (fs.existsSync(config_path[0])) {
    try {
        console.log('Found a config.md file. Processing...');
	    processMarkdownFile(config_path[0], output_blocks, code_blocks, injection_blocks, configuration_blocks);
    } catch (err) {
	    console.error('Could not read config.md file');
    }
} else {
    console.log('No config.md file. Using defaults.');
}
console.log(`Found ${configuration_blocks.length} config blocks.`);
configuration_blocks.forEach(configuration => {
    {{{ process_configuration_block }}}
});
```

At this point, we have zero or more output blocks. Simply calling `forEach` iterates over any available output blocks in the array. Whenever we have one, we need to do a recursive check to see if the code blocks reference other code blocks. Thus, recursive.

``` javascript lit-type:code lit-name:iterate_output_blocks
console.log(`Found ${code_blocks.length} code blocks.`);
console.log(`Found ${output_blocks.length} output blocks`);
output_blocks.forEach(output => {
    {{{ process_output_block }}}
});
```

We also want to iterate over our injection blocks and deal with those too.

``` javascript lit-type:code lit-name:iterate_injection_blocks
console.log(`Found ${injection_blocks.length} injection blocks`);
injection_blocks.forEach(injection => {
    {{{ process_injection_block }}}
});
```

We have to process all of these code blocks and inject all the code in all the right places. This is actually a self referential example right now. You'll note that the code block immediately previous to this paragraph references a code block we are about to define! This is a perfect example of what we're trying to accomplish.

If you want to see what `replacePlaceholdersRecursively` is all about then go to [[#Recursive code block processing]].

When we're done, we have to essentially generate the output file that's intended. To do that, we use Nodes `fs` library and join our `input_path` to our `file_path` where the `file_path` is the name of the file we're generating. An example would be a `input_path` of `./` with a `file_path` of `some_file.js` which would end up being `./some_file.js`.

We ensure that the path to the directory actually exists and, if not, we create it. That's what `mkdirSync` is for. We then write the file with the fully generated output.

``` javascript lit-type:code lit-name:process_output_block
let updated_code = output.code;
updated_code = replacePlaceholdersRecursively(updated_code, code_blocks);
// TODO: Need a relative directory instead of absolute, in processMarkdown, around OutBlock class construct
// Maybe at processDirectory, store a "last_directory" variable or something
// if (!output.file_path.includes(path.sep)) {
//     output.file_path = path.dirname(output.source_file) + path.sep + output.file_path;
// }
let output_file_path = handlePath(output.file_path, options);
if (options.output_path !== './') {
    output_file_path = handlePath(options.output_path + output.file_path, options);
}
fs.mkdirSync(path.dirname(output_file_path[0]), { recursive: true });
fs.writeFileSync(output_file_path[0], updated_code);
console.log(`Wrote file ${output_file_path[0]}`);
```

Now we can also deal with our injection blocks which are more surgical in nature.

``` javascript lit-type:code lit-name:process_injection_block
const outputFilePath = path.join(options.input_path, injection.file_path);
fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
if (fs.existsSync(outputFilePath)) {
    const outputContent = fs.readFileSync(outputFilePath, 'utf8');
    let placeholder = `{{{ ${injection.var_name} }}}`;
    const relativeSourceFile = path.relative(process.cwd(), filePath);
    let output = '';
    if (options.output_source) {
        output += `// Source: ${relativeSourceFile}\n`;
        output += `// Anchor: ${injection.var_name}\n`;
    }
    output += injection.code;
    const updatedContent = outputContent.replace(placeholder, output);
    fs.writeFileSync(outputFilePath, updatedContent);
    console.log(`Injected code block '${injection.var_name}' into '${outputFilePath}'.`);
} else {
    console.error(`Error: Output file '${outputFilePath}' does not exist.`);
}
```
### Configurations

We may want to specify that only particular markdown files are processed. We can do so by listing them with their relative or absolute paths.

We would need to use the `lit-type:config` attribute along with `lit-name:whitelist` to indicate this.

```
/example/path/to/markdown.md
relative/path/to/markdown.md
```

We may want to specify that particular markdown files are *skipped* (blacklist). We do same in the same way we whitelist.

We would need to use the `lit-type:config` attribute along with `lit-name:blacklist` to indicate this.

We may want to provide some general parameters, including some that you might use CLI parameters for.

```
input_path=/some/path/to/a/bunch/of/markdown/files/to/process
output_path=/some/path/to/put/output/files/into
```

We can use the `lit-type:config` and the `lit-name:general` attributes to indicate this.

When we finally get around to processing the configuration blocks, we tackle each one. The whitelist/blacklist of files should just be an array of files based on newlines from the code block read. The other configuration values can just be a second split using the `=` sign where the left side is the name of the configuration value and the right side is the value itself.

``` javascript lit-type:code lit-name:process_configuration_block
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
```
### The "main" function

Our `main` function is therefore composed as such:

``` javascript lit-type:code lit-name:main_function
function main() {
    {{{ helpers/Helpers.md:test_output }}}

    {{{ block_arrays }}}    
        
    {{{ read_cli_parameters }}}
    
    {{{ iterate_config_blocks }}}

    {{{ call_process_directory }}}

    {{{ filter_output_blocks }}}

    {{{ iterate_output_blocks }}}

    {{{ iterate_injection_blocks }}}
}
```

### Recursive code block processing

Essentially, code blocks can reference each other and, during the "tangling" process, we have to fill in "placeholder" areas of code blocks with the processed areas of other code blocks.

By the time `replacePlaceholdersRecursively` is called, we've already processed all the code blocks in the mark down file(s) so we have a variable that we can reference for each one. This means we can loop through all code blocks and find any code block that uses the formatter of `{{{ some_code_block_variable_name }}}` and replace it with the pre-processed code block.

Then we update the `code` parameter of the code block with the newly processed code which ultimately gets all tangled up with the output file.

We also do some simple checks to see what the leading spaces and/or tabs are for the current line so that we can try our best to retain proper indentation. Have a look at the [[#GOTCHAS]] section for a bit more information on this.

``` javascript lit-type:code lit-name:replace_placeholders_recursively_function
function replacePlaceholdersRecursively(code, codeBlocks) {
    let updated_code = code;
    let placeholdersFound = true;

    while (placeholdersFound) {
        placeholdersFound = false;

        let lines = updated_code.split('\n');
        for (let l = 0; l < lines.length; ++l) {
            let line = lines[l];
            const leading_spaces = line.match(/^\s*/)[0].length;
            const leading_tabs = line.match(/^\t*/)[0].length;
            codeBlocks.forEach(block => {
                const placeholder = `{{{ ${block.var_name} }}}`;
                if (line.includes(placeholder)) {
                    placeholdersFound = true;
                    let replacement = '';
                    if (options.output_source) {
                        replacement += `// Source: ${block.source_file}\n`;
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
            });
        }
        updated_code = lines.join('\n');
    }

    return updated_code;
}
```

### Process directory

This function takes the current project path and iterates, recursively, over the directory structure in order to find all files ending in `md` (indicating they are a markdown file) and then runs the [[#Process markdown file]] function to grab their output and code blocks.

``` javascript lit-type:code lit-name:process_directory_function
function processDirectory(dirPath, output_blocks, code_blocks, injection_blocks, configuration_blocks) {
    fs.readdirSync(dirPath).forEach(entry => {
        const entryPath = path.join(dirPath, entry);
        const stat = fs.statSync(entryPath);
        if (stat.isDirectory()) {
            console.log('DIRECTORY: ' + entry);
            processDirectory(entryPath, output_blocks, code_blocks, injection_blocks, configuration_blocks);
        } else if (entry.endsWith('.md')) {
            processMarkdownFile(entryPath, output_blocks, code_blocks, injection_blocks, configuration_blocks);
        }
    });
}
```

### Process markdown file

This function begins by reading a markdown file and splitting up the contents of the file by new lines. We have to track several things here.

First, we need to know when we're in a code block of *any* kind, even one that's not intended to be processed. `in_code_block` serves that purpose. It's starts as false and, when we read the first three ticks of a new line, we assume we're now in a code block, so we turn it on. As we process the next set of new lines, we do a number of appropriate things but, ultimately, we're looking for another set of three ticks so we know the code block has ended, effectively putting `in_code_block` to false.

The first line that initiates `in_code_block` to be true is parsed to see if it has any additional attributes. These attribute are split by spaces and then ingested into appropriate variables and stored for the duration of the code block.

Further lines become part of the code that we store for output purposes. That would be the `code_buffer`.

``` javascript lit-type:code lit-name:read_and_split_markdown_file
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
let in_code_block = false;
let current_var_name = null;
let current_output_file = null;
let current_type = null;
let code_buffer = '';
let is_lit = false;
```

Any code block or output block that's processed ends up in the appropriate array with the appropriately parsed attributes for that block.

``` javascript lit-type:code lit-name:process_each_line
lines.forEach(line => {
	if (line.startsWith('```') && !in_code_block) {
        {{{ code_block_started }}}
	} else if (line.startsWith('```') && in_code_block) {
        {{{ code_block_ended }}}
	} else if (in_code_block) {
        code_buffer += line + '\n';
	}
});
```

When we detect that a code block has started, we simply take the line the block started in and create a split array based on spaces. This lets us see if there is more than the initial 3 backticks that initiated the code block. We further split it up by looking for the "lit-" prefix identifying that we want this code block to be parsed by our literate programming tool.

*Note: We need to trim extra spaces when we're doing JS splitting of patterns so we add that to the attribute*

``` javascript lit-type:code lit-name:code_block_started
in_code_block = true;
if (line.match('lit-', 'g')) {
	is_lit = true;
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
```

When the code block ends (triggered by another 3 backticks) we can essentially bundle up the information we've gathered so far and take any appropriate actions. This code needs cleanup but you can tell that we deal with the "inject" and the "output" attributes. We instantiate any classes we need (right now, either the code or the output class) and we added it to the array of blocks so we can process them later on near the end of the "main" function.

``` javascript lit-type:code lit-name:code_block_ended
in_code_block = false;
if (is_lit) {
	if (current_type === 'injection') {
		injection_blocks.push(new InjectionBlock(current_output_file, code_buffer, filePath));
	} else if (current_type === 'output') {
		output_blocks.push(new OutputBlock(current_output_file, code_buffer, filePath));
	} else if (current_type === 'code') {
		code_blocks.push(new CodeBlock(current_var_name, code_buffer, filePath));
	} else if (current_type === 'config') {
		configuration_blocks.push(new ConfigurationBlock(current_var_name, code_buffer));
	}
}
current_var_name = null;
current_output_file = null;
current_type = null;
code_buffer = '';
is_lit = false;
```

``` javascript lit-type:code lit-name:process_markdown_file_function
function processMarkdownFile(filePath, output_blocks, code_blocks, injection_blocks, configuration_blocks) {
    {{{ read_and_split_markdown_file }}}
    
    {{{ process_each_line }}}
}
```
# PARSER OUTPUT

``` javascript lit-type:output lit-file:parser_v_0.3.js
// Version: 0.3

const fs = require('fs');
const path = require('path');
const os = require('os');

{{{ handle_path_function }}}

{{{ configuration_block_class }}}

{{{ injection_block_class }}}

{{{ code_block_class }}}

{{{ output_block_class }}}

{{{ options_class }}}

{{{ main_function }}}

{{{ replace_placeholders_recursively_function }}}

{{{ process_directory_function }}}

{{{ process_markdown_file_function }}}

main();
```
# GOTCHAS

Currently there is no only one thing you need to consider when using this tool. Spacing, tabs or general indentation. Depending on which editor you're using to do the markdown, the output of the file might have weird spacing and/or tabs. I have found that a good way to mitigate this is manually add in the spaces instead of using tabs as some markdown editors have weird symbols for tabs. The upside here is that the code is broken up so that you don't have to worry about the overall spacing of the file and adding in 2 - 4 spaces at the beginning of every line isn't that big a deal.
# How do I run this?

For now, this is done using Node. A simple command would be: `node parser.js` which would take any markdown files in the current directory and process them.

As per the pretty in-depth written coverage in this markdown file, you do have two other parameters. Have a look at the [[#Options]] section for more information.

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