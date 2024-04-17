// Version: 0.3

const fs = require('fs');
const path = require('path');
const os = require('os');

// Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
// Anchor: handle_path_function
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


// Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
// Anchor: configuration_block_class
class ConfigurationBlock {
    constructor(var_name, code) {
        this.code = code;
        this.var_name = var_name;
    }
}


// Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
// Anchor: injection_block_class
class InjectionBlock {
    constructor(var_name, file_path, code, source_file) {
        this.file_path = file_path;
        this.code = code;
        this.source_file = source_file;
        this.var_name = var_name;
    }
}


// Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
// Anchor: code_block_class
class CodeBlock {
    constructor(var_name, code, source_file) {
        this.var_name = var_name;
        this.code = code;
        this.source_file = source_file;
    }
}


// Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
// Anchor: output_block_class
class OutputBlock {
    constructor(file_path, code, source_file) {
        this.file_path = file_path;
        this.code = code;
        this.source_file = source_file;
    }
}


// Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
// Anchor: options_class
class Options {
    constructor() {
        this.input_path = './';
        this.output_path = './';
        this.output_file = false;
        this.md_file = false;
        this.whitelisted_files = [];
        this.blacklisted_files = [];
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


// Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
// Anchor: main_function
function main() {
    // Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
    // Anchor: block_arrays
    let code_blocks = [];
    let output_blocks = [];
    let injection_blocks = [];
    let configuration_blocks = [];
        
        
    // Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
    // Anchor: read_cli_parameters
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
    
    
    // Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
    // Anchor: iterate_config_blocks
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
        // Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
        // Anchor: process_configuration_block
        const configuration_lines = configuration.code.split("\n");
        if (configuration.var_name === 'whitelist') {
            options.whitelisted_files.push(line);
        } else if (configuration.var_name === 'blacklist') {
            options.blacklisted_files.push(line);
        } else if (configuration.var_name === 'general') {
            configuration_lines.forEach(line => {
                const entry = line.split('=');
                // General configurations will go here in the future
            });
        }
        
    });
    

    // Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
    // Anchor: call_process_directory
    processDirectory(options.input_path, output_blocks, code_blocks, injection_blocks, configuration_blocks);
    

    // Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
    // Anchor: filter_output_blocks
    if (options.output_file) {
    	output_blocks = output_blocks.filter(block => block.file_path === options.output_file);
    }
    if (options.md_file) {
    	output_blocks = output_blocks.filter(block => block.source_file.match(options.md_file));
    }
    

    // Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
    // Anchor: iterate_output_blocks
    console.log(`Found ${code_blocks.length} code blocks.`);
    console.log(`Found ${output_blocks.length} output blocks`);
    output_blocks.forEach(output => {
        // Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
        // Anchor: process_output_block
        let updated_code = output.code;
        updated_code = replacePlaceholdersRecursively(updated_code, code_blocks);
        let output_file_path = handlePath(output.file_path, options);
        if (options.output_path !== './') {
            output_file_path = handlePath(options.output_path + output.file_path, options);
        }
        fs.mkdirSync(path.dirname(output_file_path[0]), { recursive: true });
        fs.writeFileSync(output_file_path[0], updated_code);
        console.log(`Wrote file ${output_file_path[0]}`);
        
    });
    

    // Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
    // Anchor: iterate_injection_blocks
    console.log(`Found ${injection_blocks.length} injection blocks`);
    injection_blocks.forEach(injection => {
        // Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
        // Anchor: process_injection_block
        const outputFilePath = path.join(options.input_path, injection.file_path);
        fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
        if (fs.existsSync(outputFilePath)) {
            const outputContent = fs.readFileSync(outputFilePath, 'utf8');
            let placeholder = `{{{ ${injection.var_name} }}}`;
            const relativeSourceFile = path.relative(process.cwd(), filePath);
            let output = `// Source: ${relativeSourceFile}\n// Anchor: ${injection.var_name}\n`;
            output += injection.code;
            const updatedContent = outputContent.replace(placeholder, output);
            fs.writeFileSync(outputFilePath, updatedContent);
            console.log(`Injected code block '${injection.var_name}' into '${outputFilePath}'.`);
        } else {
            console.error(`Error: Output file '${outputFilePath}' does not exist.`);
        }
        
    });
    
}


// Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
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


// Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
// Anchor: process_directory_function
function processDirectory(dirPath, output_blocks, code_blocks, injection_blocks, configuration_blocks) {
    fs.readdirSync(dirPath).forEach(entry => {
        const entryPath = path.join(dirPath, entry);
        const stat = fs.statSync(entryPath);
        if (stat.isDirectory()) {
            processDirectory(entryPath, output_blocks, code_blocks, injection_blocks, configuration_blocks);
        } else if (entry.endsWith('.md')) {
            processMarkdownFile(entryPath, output_blocks, code_blocks, injection_blocks, configuration_blocks);
        }
    });
}


// Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
// Anchor: process_markdown_file_function
function processMarkdownFile(filePath, output_blocks, code_blocks, injection_blocks, configuration_blocks) {
    // Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
    // Anchor: read_and_split_markdown_file
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let in_code_block = false;
    let current_var_name = null;
    let current_output_file = null;
    let current_type = null;
    let code_buffer = '';
    let is_lit = false;
    
    
    // Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
    // Anchor: process_each_line
    lines.forEach(line => {
    	if (line.startsWith('```') && !in_code_block) {
            // Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
            // Anchor: code_block_started
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
            
    	} else if (line.startsWith('```') && in_code_block) {
            // Source: C:\Users\spiro\D\snotes\My awesome vault\lit-parser\Literate Programming Parser.md
            // Anchor: code_block_ended
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
            
    	} else if (in_code_block) {
            code_buffer += line + '\n';
    	}
    });
    
}


main();
