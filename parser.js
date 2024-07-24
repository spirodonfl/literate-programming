// Version: 0.4
// Author: Spiro Floropoulos
// Source: https://github.com/spirodonfl/literate-programming
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('Current working directory:' + process.cwd());

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

class CustomBlock extends MDCodeBlock {
    constructor(block_name) {
        super();
        this.block_name = block_name;
    }
}

class PullFromBlock extends MDCodeBlock {
    constructor(file_path, block_name) {
        super();
        this.file_path = file_path;
        this.block_name = block_name;
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
let custom_blocks = [];
let pull_from_blocks = [];

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
    if (cross_reference.length === 0) {
        return false;
    }
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
            fs.writeFileSync(source_file_path, new_source_content);
            console.log(`Imported code block '${import_block.path}' into '${source_file_path}'.`);
        }
    });
}

function processReferenceBlocks() {
    console.log(`Found ${reference_blocks.length} reference blocks`);
    reference_blocks.forEach(reference_block => {
        let reference_block_lines = reference_block.code.split('\n');
        reference_block_lines.forEach(line => {
            const config = line.split('=');
            if (config === 'path') {
                reference_block.setPath(config[1]);
            } else if (config === 'line_start') {
                reference_block.setLineStart(config[1]);
            } else if (config === 'line_end') {
                reference_block.setLineEnd(config[1]);
            } else if (config === 'tag') {
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
                let resolved_path = conf_line.trim();
                if (!path.isAbsolute(resolved_path)) {
                    resolved_path = path.resolve(path.dirname(configuration.source_file), resolved_path);
                }
                options.include_files.push(resolved_path);
            });
        } else if (configuration.var_name === 'ignore') {
            configuration_lines.forEach(conf_line => {
                let resolved_path = conf_line.trim();
                if (!path.isAbsolute(resolved_path)) {
                    resolved_path = path.resolve(path.dirname(configuration.source_file), resolved_path);
                }
                options.ignore_files.push(resolved_path);
            });
        } else if (configuration.var_name === 'general') {
            configuration_lines.forEach(line => {
                const entry = line.split('=');
                if (entry[0] === 'output_source') {
                    options.setOutputSource(entry[1] === 'true');
                } else if (entry[0] === 'output_source_absolute_paths') {
                    options.setOutputSourceAbsolutePaths(entry[1] === 'true');
                }
            });
        }
    });
}


function readConfigMarkdown() {
    let config_path = handlePath('config.md', options);
    if (config_path.length > 0) {
        config_path = config_path[0];
    }
    console.log('Searching for:', config_path);
    if (fs.existsSync(config_path)) {
        try {
            console.log('Found a config.md file.... Processing...');
            processMarkdownFile(config_path, '');
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
    let import_lines = fs.readFileSync(import_path, 'utf8').split('\n');
    let import_start = 0;
    let import_end = import_lines.length;
    let import_content = '';

    if (block.tag) {
        let found_tag = false;
        for (let i = 0; i < import_lines.length; ++i) {
            if (import_lines[i].includes('lit-tag:' + block.tag) && !found_tag) {
                found_tag = true;
                import_start = i;
            } else if (import_lines[i].includes('lit-tag:' + block.tag) && found_tag) {
                found_tag = false;
                import_end = i;
            }
            if (found_tag && i >= (import_start + 1)) {
                import_content += import_lines[i] + '\n';
            }
        }
        if (!found_tag) {
            console.error(`Could not find tag '${block.tag}' in file '${import_path}'`);
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
            const leading_spaces = line.match(/^\s*/).length;
            const leading_tabs = line.match(/^\t*/).length;

            reference_blocks.forEach(block => {
                const placeholder = `{{{ ${block.var_name} }}}`;
                if (line.includes(placeholder)) {
                    placeholdersFound = true;
                    let replacement = '';
                    if (options.output_source) {
                        if (options.output_source_absolute_paths) {
                            replacement += `// Source: ${handlePath(block.source_file, options)}\n`;
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
                        for (let space = 0; space < leading_spaces; ++space) { replacement_line += ' '; }
                        for (let tab = 0; tab < leading_tabs; ++tab) { replacement_line += '\t'; }
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
                            replacement += `// Source: ${handlePath(block.source_file, options)}\n`;
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
                        for (let space = 0; space < leading_spaces; ++space) { replacement_line += ' '; }
                        for (let tab = 0; tab < leading_tabs; ++tab) { replacement_line += '\t'; }
                        replacement_line += replacement[r];
                        replacement[r] = replacement_line;
                    }
                    lines[l] = line.replace(placeholder, replacement.join('\n'));
                }
            });

            const source_placeholder = `{{{ ${block.source_file}:${block.var_name} }}}`;
            if (line.includes(source_placeholder)) {
                placeholdersFound = true;
                let replacement = '';
                if (options.output_source) {
                    if (options.output_source_absolute_paths) {
                        replacement += `// Source: ${handlePath(block.source_file, options)}\n`;
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
                    for (let space = 0; space < leading_spaces; ++space) { replacement_line += ' '; }
                    for (let tab = 0; tab < leading_tabs; ++tab) { replacement_line += '\t'; }
                    replacement_line += replacement[r];
                    replacement[r] = replacement_line;
                }
                lines[l] = line.replace(source_placeholder, replacement.join('\n'));
            }
        }
        updated_code = lines.join('\n');
    }
    return updated_code;
}

function processPullFromBlocks() {
    console.log(`Processing ${pull_from_blocks.length} pull_from blocks`);
    pull_from_blocks.forEach(pull_from => {
        const sourceFilePath = pull_from.source_file;
        let pullFilePath;

        if (path.isAbsolute(pull_from.file_path)) {
            pullFilePath = pull_from.file_path;
        } else if (pull_from.file_path.startsWith('.')) {
            pullFilePath = path.resolve(path.dirname(sourceFilePath), pull_from.file_path);
        } else {
            pullFilePath = path.join(path.dirname(sourceFilePath), pull_from.file_path);
        }
        
        if (fs.existsSync(pullFilePath)) {
            const sourceContent = fs.readFileSync(sourceFilePath, 'utf8');
            const pullContent = fs.readFileSync(pullFilePath, 'utf8');
            
            const blockToInsert = custom_blocks.find(block => 
                block.source_file === pullFilePath && block.block_name === pull_from.block_name
            );

            if (blockToInsert) {
                const placeholder = `<!-- pull_from: ${pull_from.file_path}, block: ${pull_from.block_name} -->`;
                const processedPlaceholder = `<!-- pull_from: ${pull_from.file_path}, block: ${pull_from.block_name}, processed: true -->`;
                
                if (sourceContent.includes(placeholder) && !sourceContent.includes(processedPlaceholder)) {
                    const replacement = `${processedPlaceholder}\n${blockToInsert.code}`;
                    const updatedContent = sourceContent.replace(placeholder, replacement);
                    fs.writeFileSync(sourceFilePath, updatedContent);
                    console.log(`Pulled block '${pull_from.block_name}' from '${pullFilePath}' into '${sourceFilePath}'.`);
                } else {
                    console.log(`Block '${pull_from.block_name}' from '${pullFilePath}' already processed in '${sourceFilePath}'.`);
                }
            } else {
                console.error(`Error: Block '${pull_from.block_name}' not found in '${pullFilePath}'.`);
            }
        } else {
            console.error(`Error: Pull file '${pullFilePath}' does not exist.`);
        }
    });
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
    let in_block = false;
    let current_block_name = null;
    let current_block_type = null;
    let block_buffer = '';
    let current_start_line = 0;
    let current_line = 0;

    lines.forEach((line, index) => {
        ++current_line;

        if (line.startsWith('<!-- block:') && !in_block) {
            in_block = true;
            current_start_line = current_line;
            const parts = line.split('block:');
            current_block_name = parts[1].trim().replace('-->', '').trim();
            current_block_type = 'custom';
        } else if (line.startsWith('<!-- end_block -->') && in_block) {
            in_block = false;
            const block = new CustomBlock(current_block_name);
            block.setSourceFile(filePath);
            block.setCode(block_buffer);
            block.setStartLineNumber(current_start_line);
            block.setEndLineNumber(current_line);
            custom_blocks.push(block);
            current_block_name = null;
            current_block_type = null;
            block_buffer = '';
            current_start_line = 0;
        } else if (line.startsWith('<!-- pull_from:') && !line.includes('processed: true')) {
            const parts = line.split('pull_from:')[1].split(',');
            const file_path = parts[0].trim();
            const block_name = parts[1].split('block:')[1].trim().replace('-->', '').trim();
            const pull_from_block = new PullFromBlock(file_path, block_name);
            pull_from_block.setSourceFile(filePath);
            pull_from_block.setStartLineNumber(index + 1);
            pull_from_block.setEndLineNumber(index + 1);
            pull_from_blocks.push(pull_from_block);
        } else if (in_block) {
            block_buffer += line + '\n';
        }
    });
}


function handlePath(inputPath, options) {
    const isWindows = os.platform() === 'win32';
    const pathModule = isWindows ? path.win32 : path.posix;

    if (pathModule.isAbsolute(inputPath)) {
        return [inputPath];
    } else {
        return [pathModule.resolve(options.input_path, inputPath)];
    }
}


// Main execution
readConfigMarkdown();
readCLIArguments();
processDirectory(options.input_path, '');
processConfigurationBlocks();
processPullFromBlocks();
processInjectionBlocks();
processImportBlocks();
processReferenceBlocks();
processOutputBlocks();

console.log('Processing complete.');

