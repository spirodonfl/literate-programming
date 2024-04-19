// Version: 0.3

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('Current working directory: ' + process.cwd());

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

class ConfigurationBlock extends MDCodeBlock {
    constructor(var_name) {
        super();

        this.var_name = var_name;
    }
}


class InjectionBlock extends MDCodeBlock {
    constructor(var_name, file_path) {
        super();

        this.file_path = file_path;
        this.var_name = var_name;
    }
}


class CodeBlock extends MDCodeBlock {
    constructor(var_name) {
        super();

        this.var_name = var_name;
    }
}


class OutputBlock extends MDCodeBlock {
    constructor(file_path, relative_directory) {
        super();

        this.file_path = file_path;
        this.relative_directory = relative_directory;
    }
}


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

let code_blocks = [];
let output_blocks = [];
let injection_blocks = [];
let configuration_blocks = [];
let import_blocks = [];
let reference_blocks = [];

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

function filterOutputBlocks(filter_type, path_type) {
    let cross_reference = (filter_type === 0) ? options.include_files : options.ignore_files;
    if (cross_reference.length === 0) { return false; }
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

function main() {    
    readCLIArguments();
    
    readConfigMarkdown();
    
    processConfigurationBlocks();

    processDirectory(options.input_path, '');

    processImportBlocks();

    processReferenceBlocks();
    
    filterOutputBlocks(0, 0);
    filterOutputBlocks(1, 0);
    filterOutputBlocks(0, 1);
    filterOutputBlocks(1, 1);
    
    processOutputBlocks();

    processInjectionBlocks();
}

main();
