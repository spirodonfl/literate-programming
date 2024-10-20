// Version: 0.5
// Author: Spiro Floropoulos
// Source: https://github.com/spirodonfl/literate-programming
var fs = require('fs')
var path = require('path')
var os = require('os')

// Set this to false to disable logs
const DEBUG = false;

if (!DEBUG) {
    console.log = function() {};
}

console.info('Current working directory:' + process.cwd())

var OPTIONS = {
    input_path: './',
    output_path: './',
    include: null,
    ignore: null,
    file: null,
}

function handlePath(input_path) {
    const is_windows = os.platform() === 'win32';
    const path_module = is_windows ? path.win32 : path.posix;

    if (!input_path) {
        input_path = OPTIONS.input_path;
    }

    let resolved_path;
    if (path_module.isAbsolute(input_path)) {
        resolved_path = input_path;
    } else {
        resolved_path = path_module.resolve(OPTIONS.input_path, input_path);
    }

    resolved_path = path_module.normalize(resolved_path);

    return resolved_path;
}

var CREATE = {
    block: function () {
        return {
            name: null, content: null,
        }
    },

    output: function () {
        return {
            file: null, content: null,
        }
    },
}

function readCLIArguments() {
    var arg_file = "--file="
    var arg_input_path = "--input_path="
    var args = process.argv.slice(2);
    for (var i = 0; i < args.length; ++i) {
        var arg = args[i]
        if (arg.startsWith(arg_file)) {
            OPTIONS.file = arg.slice(arg_file.length)
        } else if (arg.startsWith(arg_input_path)) {
            OPTIONS.input_path = arg.slice(arg_input_path.length)
        }
    }
}

function isFunction(variable) {
    return typeof variable === 'function';
}

function extractBlockNames(input) {
    const regex = /{{{[\s]*([a-z_]+)[\s]*}}}/g;
    const matches = [...input.matchAll(regex)];
    return matches.map(match => match[1]);
}

function replaceBlocks(input, replacements) {
    let result = input;
    for (const [original, replacement] of Object.entries(replacements)) {
        const regex = new RegExp(`{{{\\s*${original}\\s*}}}`, 'g');
        result = result.replace(regex, replacement);
    }
    return result;
}

async function processFileStream(file, process_line) {
    if (!isFunction(process_line)) {
        console.error('You must have a function to process a line')
        process.exit()
    }
    var buffer = ""
    var reader = null
    if (typeof Bun !== 'undefined') {
        // Bun environment
        reader = Bun.file(file).stream().getReader();
    } else {
        // Node.js environment
        const { Readable } = require('stream');
        const node_stream = fs.createReadStream(file);
        const web_stream = Readable.toWeb(node_stream);
        reader = web_stream.getReader();
    }
    var total_lines = 0
    while (true) {
        var { done, value } = await reader.read()

        if (done) break

        buffer += new TextDecoder().decode(value)
        var lines = buffer.split("\n")

        for (let i = 0; i < lines.length; ++i) {
            console.log("LINE:", lines[i])
            var line = lines[i]
            process_line(line)
        }

        buffer = lines[lines.length - 1]
        total_lines = lines.length
    }

    if (buffer.length > 0 && lines > 1) {
        // LEFTOVER
        console.log("BUFFER:", buffer)
        console.log("LINES:", total_lines)
    }
}

readCLIArguments();
if (OPTIONS.file === null) {
    var config_file = null
    if (fs.existsSync(handlePath('config.md'))) {
        config_file = handlePath('config.md')
    } else if (fs.existsSync(handlePath('config.html'))) {
        config_file = handlePath('config.html')
    } else {
        console.error('No entry file or configuration found!')
        process.exit()
    }

    await processFileStream(config_file, function (line) {
        if (line.startsWith('<!-- lit')) {
            var line_split = line.split(' ')
            if (line_split[2] === 'config') {
                if (line_split[3] === 'input_path') {
                    OPTIONS.input_path = handlePath(line_split[4])
                } else if (line_split[3] === 'output_path') {
                    OPTIONS.output_path = handlePath(line_split[4])
                } else if (line_split[3] === 'file') {
                    OPTIONS.file = handlePath(line_split[4])
                }
            }
        }
    })
} else {
    OPTIONS.file = handlePath(OPTIONS.file)
}
console.log('Finalized Options')
console.log(OPTIONS)

var in_mode = null
var current_block = null
var current_output = null
var all_blocks = []
await processFileStream(OPTIONS.file, function (line) {
    if (line.startsWith('<!-- lit')) {
        var line_split = line.split(' ')
        if (line_split[2] === 'config') {
            if (line_split[3] === 'input_path') {
                OPTIONS.input_path = handlePath(line_split[4])
            } else if (line_split[3] === 'output_path') {
                OPTIONS.output_path = handlePath(line_split[4])
            } else if (line_split[3] === 'file') {
                OPTIONS.file = handlePath(line_split[4])
            }
        } else if (line_split[2] === 'block' && in_mode != 'block') {
            in_mode = 'block'
            current_block = CREATE.block()
            current_block.name = line_split[3]
        } else if (line_split[2] === 'end_block' && in_mode === 'block') {
            console.log('Block Ended')
            console.log(current_block)
            all_blocks.push(Object.create(current_block))
            in_mode = null
            current_block = null
            console.log(all_blocks)
        } else if (line_split[2] === 'output' && in_mode != 'block' && in_mode != 'block_code') {
            in_mode = 'output'
            current_output = CREATE.output()
            current_output.file = line_split[3]
        } else if (line_split[2] === 'end_output' && in_mode === 'output') {
            console.info('Output Ended')
            console.log(current_output)
            var file = current_output.file
            if (!file.includes('\\') && !file.includes('/')) {
                file = path.dirname(OPTIONS.file) + '\\' + file
            }
            console.info('Writing to file...')
            console.info(handlePath(file))
            var normalized_content = current_output.content.replace(/\r\n|\r/g, '\n');
            fs.writeFileSync(handlePath(file), normalized_content, { encoding: 'utf8' })
            in_mode = null
            current_output = null
        }
    } else if (in_mode === 'block' && (line.startsWith('```') || line.startsWith('<code>'))) {
        in_mode = 'block_code'
    } else if (in_mode === 'block_code' && (line.startsWith('```') || line.startsWith('</code>'))) {
        in_mode = 'block'
    } else if (in_mode === 'block_code') {
        if (current_block.content === null) {
            current_block.content = line + '\n'
        } else {
            current_block.content += line + '\n'
        }
    } else if (in_mode === 'output' && (line.startsWith('```') || line.startsWith('<code>'))) {
        in_mode = 'output_code'
    } else if (in_mode === 'output_code' && (line.startsWith('```') || line.startsWith('</code>'))) {
        in_mode = 'output'
    } else if (in_mode === 'output_code') {
        console.log('Resolving blocks before finalizing output file...')
        var line_with_blocks = line
        var blocks_resolved = false

        var getIndentation = function(str) {
            var match = str.match(/^(\s*)/)
            return match ? match[1] : ''
        };

        var indentContent = function(content, baseIndent) {
            var contentLines = content.split('\n')
            var minIndent = contentLines.reduce(function(min, line) {
                if (line.trim() === '') return min
                var indent = getIndentation(line)
                return Math.min(min, indent.length)
            }, Infinity)

            return contentLines.map(function(line) {
                if (line.trim() === '') return '\n'
                return baseIndent + line.slice(minIndent)
            }).join('')
        };

        while (!blocks_resolved) {
            var inner_blocks = extractBlockNames(line_with_blocks)
            if (inner_blocks.length === 0) {
                blocks_resolved = true
                continue
            }

            for (var i = 0; i < inner_blocks.length; i++) {
                var block_name = inner_blocks[i]
                var block = all_blocks.find(function(b) { return b.name === block_name; })
                if (block) {
                    var regex = new RegExp('(^\\s*)?{{{\\s*' + block_name + '\\s*}}}', 'gm')
                    line_with_blocks = line_with_blocks.replace(regex, function(match, leadingSpaces) {
                        var baseIndent = leadingSpaces || ''
                        return indentContent(block.content, baseIndent)
                    })
                }
            }
        }

        // Add the resolved line to the output
        if (current_output.content === null) {
            current_output.content = line_with_blocks
        } else {
            current_output.content += line_with_blocks + '\n'
        }
    }
})