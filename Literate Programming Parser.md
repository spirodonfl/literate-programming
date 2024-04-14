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

``` javascript code_block_class
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

``` javascript output_block_class
class OutputBlock {
    constructor(file_path, code, source_file) {
        this.file_path = file_path;
        this.code = code;
        this.source_file = source_file;
    }
}
```

### Variable referencing

Code blocks that have already been defined in code blocks and given a variable name can be referenced in both *other* code blocks and output code blocks. This does mean you could end up with a circular reference scenario so take care not to do that. We're all adults here. You can do it.

Your output block can therefore reference any code block as a variable to be replaced or injected. This markdown file is full of examples as to how this is done but you can see that the output block at the end of this markdown references all the other code blocks that are "named".
### Injections

Another option, as an alternative to generating full output files, is to create injection points in existing files.

This still follows the code block and output block patterns (three ticks with extra information) but you pass in an "inject" command instead. Something like this: `[three ticks] inject some_var_name some_file_to_inject_into.js`

In your `some_file_to_inject_into.js` file, you would be required to have a text like this: `{{{ some_var_name }}}` which is processed by the "tangler" and then replaced with whatever is inside the appropriate code block.
### Options

We want the tangler to accept external options depending on the use case so we can make necessary adaptations as to how it works.

The `folder_prefix` option let's us indicate what folder we're going to use to generate our output files from. By default, we use the current project folder but it might be that you want to use an entirely different folder altogether so your markdown can stay in a completely different place.

The `output_file` option let's us choose *one specific* output file from all processed output blocks to generate. This way, you don't have to generate every single output file if there are multiple files generated by the markdown and you can be very surgical about what you generate.

The `md_file` option let's us choose *one specific* markdown file to actually fully process. If that markdown file has zero, one or more output files, only those output files will get generated, even if a million other markdown files in the project generate their own output files too. What this *does not do* is limit what code blocks get processed since you can have multi-markdown-file dependencies to code blocks that even one markdown file is required to process to output everything properly.

Note that at the end of this code block, we immediately instantiate `Options` and that's because we ideally only have one instance of that class. This isn't the most fool-proof way to ensure there's only one instance but it signifies its intent to any developer reading it.

``` javascript options_class
class Options {
    constructor() {
        this.folder_prefix = './';
        this.output_file = false;
        this.md_file = false;
    }

    setFolderPrefix(value) {
        this.folder_prefix = value;
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

``` javascript read_cli_parameters
const args = process.argv.slice(2);
args.forEach(arg => {
	if (arg.startsWith("--folder-prefix=")) {
		options.setFolderPrefix(arg.slice(16));
	} else if (arg.startsWith("--output-file=")) {
		options.setOutputFile(arg.slice(14));
	} else if (arg.startsWith("--md-file=")) {
		options.setMdFile(arg.slice(10));
	}
});
console.log(options);
```

We need to store the code blocks and output blocks we find in arrays so we can iterate over them later. You can find more information about what these arrays will actually store -> [[#Code Blocks]] and [[#Output Blocks]].

``` javascript block_arrays
let code_blocks = [];
let output_blocks = [];
```

We want to call our `processDirectory` function and pass it the `folder_prefix` from the options class as well as the arrays to store things that are found during processing. You can find out more about this function [[#Process directory]].

``` javascript call_process_directory
processDirectory(options.folder_prefix, output_blocks, code_blocks);
```

Assuming that `processDirectory` executed everything it needed to correctly, we should have an array of output blocks (most likely) which we then need to filter based on whether or not the `md_file` and / or `output_file` options were passed in. We only want to process output blocks that meet those optional criteria.

``` javascript filter_output_blocks
if (options.output_file) {
	output_blocks = output_blocks.filter(block => block.file_path === options.output_file);
}
if (options.md_file) {
	output_blocks = output_blocks.filter(block => block.source_file.match(options.md_file));
}
```

At this point, we have zero or more output blocks. Simply calling `forEach` iterates over any available output blocks in the array. Whenever we have one, we need to do a recursive check to see if the code blocks reference other code blocks. Thus, recursive.

``` javascript iterate_output_blocks
console.log(`Found ${code_blocks.length} code blocks.`);
console.log(`Found ${output_blocks.length} output blocks`);
output_blocks.forEach(output => {
    {{{ process_output_block }}}
});
```

We have to process all of these code blocks and inject all the code in all the right places. This is actually a self referential example right now. You'll note that the code block immediately previous to this paragraph references a code block we are about to define! This is a perfect example of what we're trying to accomplish.

If you want to see what `replacePlaceholdersRecursively` is all about then go to [[#Recursive code block processing]].

When we're done, we have to essentially generate the output file that's intended. To do that, we use Nodes `fs` library and join our `folder_prefix` to our `file_path` where the `file_path` is the name of the file we're generating. An example would be a `folder_prefix` of `./` with a `file_path` of `some_file.js` which would end up being `./some_file.js`.

We ensure that the path to the directory actually exists and, if not, we create it. That's what `mkdirSync` is for. We then write the file with the fully generated output.

``` javascript process_output_block
let updated_code = output.code;
updated_code = replacePlaceholdersRecursively(updated_code, code_blocks);

const output_file_path = path.join(options.folder_prefix, output.file_path);
fs.mkdirSync(path.dirname(output_file_path), { recursive: true });
fs.writeFileSync(output_file_path, updated_code);
console.log(`Wrote file ${output_file_path}`);
```

Our `main` function is therefore composed as such:

``` javascript main_function
function main() {
    {{{ read_cli_parameters }}}

    {{{ block_arrays }}}

    {{{ call_process_directory }}}

    {{{ filter_output_blocks }}}

    {{{ iterate_output_blocks }}}
}
```

### Recursive code block processing

Essentially, code blocks can reference each other and, during the "tangling" process, we have to fill in "placeholder" areas of code blocks with the processed areas of other code blocks.

By the time `replacePlaceholdersRecursively` is called, we've already processed all the code blocks in the mark down file(s) so we have a variable that we can reference for each one. This means we can loop through all code blocks and find any code block that uses the formatter of `{{{ some_code_block_variable_name }}}` and replace it with the pre-processed code block.

Then we update the `code` parameter of the code block with the newly processed code which ultimately gets all tangled up with the output file.

We also do some simple checks to see what the leading spaces and/or tabs are for the current line so that we can try our best to retain proper indentation. Have a look at the [[#GOTCHAS]] section for a bit more information on this.

``` javascript replace_placeholders_recursively_function
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
                    let replacement = `// Source: ${block.source_file}\n// Anchor: ${block.var_name}\n${block.code}`;
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

``` javascript process_directory_function
function processDirectory(dirPath, output_blocks, code_blocks) {
    fs.readdirSync(dirPath).forEach(entry => {
        const entryPath = path.join(dirPath, entry);
        const stat = fs.statSync(entryPath);
        if (stat.isDirectory()) {
            processDirectory(entryPath, output_blocks, code_blocks);
        } else if (entry.endsWith('.md')) {
            processMarkdownFile(entryPath, output_blocks, code_blocks);
        }
    });
}
```

### Process markdown file

This function begins by reading a markdown file and splitting up the contents of the file by new lines. We have to track several things here.

First, we need to know when we're in a code block of *any* kind, even one that's not intended to be processed. `in_code_block` serves that purpose. It's starts as false and, when we read the first three ticks of a new line, we assume we're now in a code block, so we turn it on. As we process the next set of new lines, we do a number of appropriate things but, ultimately, we're looking for another set of three ticks so we know the code block has ended, effectively putting `in_code_block` to false.

The first line that initiates `in_code_block` to be true is parsed to see if it has any additional attributes. These attribute are split by spaces and then ingested into appropriate variables and stored for the duration of the code block.

Further lines become part of the code that we store for output purposes. That would be the `code_buffer`.

``` javascript read_and_split_markdown_file
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
let in_code_block = false;
let current_var_name = null;
let current_output_file = null;
let current_type = null;
let code_buffer = '';
let inject = false;
let output = false;
```

Right now, in a special case, if the code block is set to be "injected", we immediately process it. This is for use cases where you want to inject code into existing codebases.

Any code block or output block that's processed ends up in the appropriate array with the appropriately parsed attributes for that block.

``` javascript process_each_line
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

When we detect that a code block has started, we simply take the line the block started in and create a split array based on spaces. This lets us see if there is more than the initial 3 backticks that initiated the code block.

``` javascript code_block_started
in_code_block = true;
const parts = line.split(' ');
parts.shift();
current_type = parts.shift();
current_var_name = parts.shift();
current_output_file = parts.shift();
inject = parts.includes('inject');
```

When the code block ends (triggered by another 3 backticks) we can essentially bundle up the information we've gathered so far and take any appropriate actions. This code needs cleanup but you can tell that we deal with the "inject" and the "output" attributes. We instantiate any classes we need (right now, either the code or the output class) and we added it to the array of blocks so we can process them later on near the end of the "main" function.

``` javascript code_block_ended
in_code_block = false;
if (inject) {
	// Handle subfolder paths in the output file name
	const outputFilePath = path.join(options.folder_prefix, current_output_file);
	fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
	if (fs.existsSync(outputFilePath)) {
		const outputContent = fs.readFileSync(outputFilePath, 'utf8');
		var placeholder = `{{{ ${current_var_name} }}}`;
		const relativeSourceFile = path.relative(process.cwd(), filePath);
		var output = `// Source: ${relativeSourceFile}\n// Anchor: ${current_var_name}\n`;
		output += code_buffer;
		const updatedContent = outputContent.replace(placeholder, output);
		fs.writeFileSync(outputFilePath, updatedContent);
		console.log(`Injected code block '${current_var_name}' into '${outputFilePath}'.`);
	} else {
		console.error(`Error: Output file '${outputFilePath}' does not exist.`);
	}
} else if (current_type === 'output') {
	// TODO: This is weird, fix it
	current_output_file = current_var_name;
	// Handle subfolder paths in the output file name
	const outputFilePath = path.join(options.folder_prefix, current_output_file);
	const relativeSourceFile = path.relative(process.cwd(), filePath);
	output_blocks.push(new OutputBlock(current_output_file, code_buffer, relativeSourceFile));
} else {
	const relativeSourceFile = path.relative(process.cwd(), filePath);
	code_blocks.push(new CodeBlock(current_var_name, code_buffer, relativeSourceFile));
}
current_var_name = null;
current_output_file = null;
code_buffer = '';
inject = false;
```

TODOs
* Extract the "inject" process into its own thing and process it as part of everything else (output and code blocks) instead of on-demand. This should allow you to merge repetitive code and make the loops simpler.
* What if the line is just a code block and doesn't have anything more than the initial 3 backticks or the 3 backticks and maybe just a code "type" but *nothing more* ?

``` javascript process_markdown_file_function
function processMarkdownFile(filePath, output_blocks, code_blocks) {
    {{{ read_and_split_markdown_file }}}
    
    {{{ process_each_line }}}
}
```
# PARSER OUTPUT
``` output parser_v_0.2.js
// Version: 0.2

const fs = require('fs');
const path = require('path');

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

* Have an option to take all blocks in current md file (they just have to be tagged with one var_name) and spit it all out, in order, to an output file. Additionally add a way to order the blocks numerically
* What if you need to have the same variable name either in the same markdown file or in two or more different ones and they serve different purposes? Ideally, variable names should be unique to the markdown file. If you have a variable name used in multiple places, then you should be able to reference a different file to get the variable from. For example `{{{ some_block }}}` vs `{{{ relative/path/to/markdown.md:some_block }}}`
* The "Source:" stuff needs to have better referencing. For example, what if your MD project/folder is in an ENTIRELY different place than the output folder which actually leads to...
* Add an option to prefix the output path so you can generate output files in a completely different directory
* Have options that live inside the "index" or "main" markdown file maybe in a code block so that you don't have to pass in CLI parameters... potentially
* If the file you're about to output does not match the existing file, get confirmation. Note that there's a difference between a change because you changed the markdown file vs a change because someone put code into the output file that is NOT part of your markdown file so you would have to do some kind of comparison between code that exists in the output file and code that doesn't. In reality what you really want to know is if the existing output file has code that does not exist in the intended output file and, maybe, if so, first ask for confirmation (or have an override/force option) and then store the removed lines in some kind of backup file to be restored later and pruned after a certain period of time. JUST IN CASE
* Fix newlines at the end of every "block" unless we just keep that for some reason?