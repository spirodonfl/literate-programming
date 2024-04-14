const fs = require('fs');
const path = require('path');

// Source: lit-parser\Literate Programming Parser.md
// Anchor: code_block_class
class CodeBlock {
    constructor(var_name, code, source_file) {
        this.var_name = var_name;
        this.code = code;
        this.source_file = source_file;
    }
}


// Source: lit-parser\Literate Programming Parser.md
// Anchor: output_block_class
class OutputBlock {
    constructor(file_path, code, source_file) {
        this.file_path = file_path;
        this.code = code;
        this.source_file = source_file;
    }
}


// Source: lit-parser\Literate Programming Parser.md
// Anchor: options_class
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


// Source: lit-parser\Literate Programming Parser.md
// Anchor: main_function
function main() {
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

    const projectDirPath = options.folder_prefix;
    let code_blocks = [];
    let output_blocks = [];

    processDirectory(projectDirPath, output_blocks, code_blocks);

    if (options.output_file) {
        output_blocks = output_blocks.filter(block => block.file_path === options.output_file);
    }
    if (options.md_file) {
        output_blocks = output_blocks.filter(block => block.source_file.match(options.md_file));
    }

    console.log(`Found ${code_blocks.length} code blocks.`);
    console.log(`Found ${output_blocks.length} output blocks`);
    output_blocks.forEach(output => {
        let updated_code = output.code;
        updated_code = replacePlaceholdersRecursively(updated_code, code_blocks);

        const output_file_path = path.join(options.folder_prefix, output.file_path);
        fs.mkdirSync(path.dirname(output_file_path), { recursive: true });
        fs.writeFileSync(output_file_path, updated_code);
        console.log(`Wrote file ${output_file_path}`);
    });
}

// Source: lit-parser\Literate Programming Parser.md
// Anchor: replace_placeholders_recursively_function
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


// Source: lit-parser\Literate Programming Parser.md
// Anchor: process_directory_function
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


// Source: lit-parser\Literate Programming Parser.md
// Anchor: process_markdown_file_function
function processMarkdownFile(filePath, output_blocks, code_blocks) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let in_code_block = false;
    let current_var_name = null;
    let current_output_file = null;
    let current_type = null;
    let code_buffer = '';
    let inject = false;
    let output = false;

    lines.forEach(line => {
        if (line.startsWith('```') && !in_code_block) {
            in_code_block = true;
            const parts = line.split(' ');
            parts.shift(); // Remove the first part
            current_type = parts.shift();
            current_var_name = parts.shift();
            current_output_file = parts.shift();
            inject = parts.includes('inject');
        } else if (line.startsWith('```') && in_code_block) {
            in_code_block = false;
            if (inject) {
                // Handle subfolder paths in the output file name
                const outputFilePath = path.join(options.folder_prefix, current_output_file);
                // Ensure the directory exists
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
        } else if (in_code_block) {
            code_buffer += line + '\n';
        }
    });
}


main();
