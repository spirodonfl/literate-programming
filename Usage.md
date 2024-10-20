# Introduction

This JavaScript parser is designed for literate programming, allowing you to create and manage code blocks within markdown or HTML files. It processes various types of code blocks, handles imports and references, and generates output files based on the content of these blocks.

By the way, did you know Markdown is really just HTML under the hood? Why are you using Markdown, then?

## Usage

To use this parser, follow these steps:

1. Set up your project structure with md/html files containing code blocks.
2. Configure the parser using command-line arguments or configuration values in your entry or config.md file.
3. Run the parser to process your files and generate output.

## Configuration

### Command-line Arguments

You can configure the parser using the following command-line arguments:

- --input-path=<path>: Set the input directory for your files.
- --output-path=<path>: Set the output directory for generated files.

### Configuration Options

You can put these configuration values in an entry file or a config.md file

```
<!-- lit config include zig-sdk.md,another-sdk.md -->
<!-- lit config ignore zig-sdk.md,another-sdk.md,*.js,folder/* -->
<!-- lit config input_path ./ -->
<!-- lit config output_path ./ -->
```

## Code Block Types

The parser supports several types of code blocks:

### Custom Blocks

Define custom code blocks using the "hidden comment" html capability:

```
<!-- lit block some_block -->

Your content here

<!-- lit end_block -->

<!-- lit block code_block -->
'''
$code = true;
if ($code == TRUE) {
    return "yep";
}
'''
<!-- lit end_block -->
```

Note that `some_block` here is the "name" of this block and you can reference it by this name. Clashing names will cause an error that you must resolve before output files can be generated.

### Output Blocks

This will generate a file with the path and name you provide. It will pull in other blocks and resolve any references.

```
<!-- lit output to_some_odin_file.odin -->
<!-- lit block some_block -->
<!-- lit block another_block from ./src/a_file.html -->
<!-- lit file ./pull/entire/file.js -->
'''
$code_in_output = 333;
$more_code_here = 334;
'''
<!-- lit end_output -->
```

Note: triple quotes are actually triple backticks

### Injection Blocks

TODO: Inject blocks into existing files

### Reference Blocks

TODO: I've forgotten the use case for this. Maybe for rendering the file on the browser and showing the reference without actually putting into the documentation file?

### Import Blocks

Import code from other files, like raw code, for use in your documentation. The parser will inject the code into your documentation file.

```
<!-- lit reference a_block_name from_some_file.html -->
<!-- lit reference another_block_name from_another_file.md as internal_block_reference_name -->
```

## Output Generation

The parser processes all Markdown files in the input directory and its subdirectories.