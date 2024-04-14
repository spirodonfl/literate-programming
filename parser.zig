const std = @import("std");

// Define a struct type for the items in the ArrayList
const CodeBlock = struct {
    var_name: []const u8,
    file_path: []const u8,
    code: []const u8,
    source_file: []const u8,
};

const ParseError = error{InvalidFormat};

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const allocator = gpa.allocator();

    // Parse CLI arguments
    var args = std.process.args();
    var folder_prefix: []const u8 = "";
    while (args.next()) |arg| {
        if (std.mem.startsWith(u8, arg, "--folder-prefix=")) {
            folder_prefix = arg[16..];
        }
    }

    // if (folder_prefix.len == 0) {
    //     std.debug.print("Error: --folder-prefix argument is required.\n", .{});
    //     return error.MissingFolderPrefix;
    // }

    // Correctly use realpath with an output buffer
    var buffer: [std.fs.MAX_PATH_BYTES]u8 = undefined;
    const projectDirPath = try std.fs.cwd().realpath(".", &buffer);

    // Open the directory
    var projectDir = try std.fs.cwd().openDir(projectDirPath, .{});
    defer projectDir.close();

    // Initialize the ArrayList with the defined struct type
    var code_blocks = std.ArrayList(CodeBlock).init(allocator);
    defer code_blocks.deinit();

    // Now you can pass projectDir to processDirectory
    try processDirectory(projectDir, projectDirPath, &code_blocks, folder_prefix);

    // var referenced_blocks = std.ArrayList([]const u8).init(allocator);
    // defer referenced_blocks.deinit();
    // for (code_blocks.items) |block| {
    //     // Check if block.code is long enough to contain "// Reference: "
    //     if (block.code.len >= 14 and std.mem.startsWith(u8, block.code, "// Reference: ")) {
    //         // Extract the reference name safely
    //         const ref_name_start = 14; // Start index of the reference name
    //         const ref_name_end = std.mem.indexOf(u8, block.code[ref_name_start..], "\n") orelse block.code.len;
    //         const ref_name = block.code[ref_name_start..ref_name_end];

    //         // Check if the reference name is valid before proceeding
    //         if (ref_name.len > 0 and !codeBlockExists(ref_name, &code_blocks)) {
    //             try referenced_blocks.append(ref_name);
    //         }
    //     }
    // }

    // for (referenced_blocks.items) |ref_name| {
    //     std.debug.print("Warning: Referenced code block '{s}' does not exist.\n", .{ref_name});
    // }

    std.debug.print("Found {d} code blocks.\n", .{code_blocks.items.len});
    for (code_blocks.items) |block| {
        // const output_file_path = try std.fs.path.join(allocator, &[_][]const u8{ folder_prefix, block.file_path });
        // defer allocator.free(output_file_path);

        // std.debug.print("Constructed output file path: '{s}'\n", .{output_file_path});

        // std.debug.print("Writing code block '{s}' to '{s}'.\n", .{ block.var_name, output_file_path });
        //const dir_path = std.fs.path.dirname(block.file_path) orelse return error.InvalidPath;

        //try std.fs.cwd().makeDir(dir_path);

        // const output_file = try std.fs.cwd().openFile("POOP.js", .{ .mode = .write_only });
        // defer output_file.close();
        // try output_file.writer().print("// Source: {s}\n", .{block.source_file});
        // try output_file.writer().print("// Anchor: {s}\n", .{block.var_name});
        // try output_file.writer().writeAll(block.code);

        //var path = try std.fs.cwd().appendPathComponent(block.file_path);
        const file = try std.fs.cwd().createFile(@as([]const u8, block.file_path), .{ .read = true });
        defer file.close();
        try file.writer().print("// Source: {s}\n", .{block.source_file});
        try file.writer().print("// Anchor: {s}\n", .{block.var_name});
        try file.writeAll(block.code);
    }
}

fn processDirectory(dir: std.fs.Dir, dirPath: []const u8, code_blocks: *std.ArrayList(CodeBlock), folder_prefix: []const u8) !void {
    // Open the directory as an IterableDir
    var iterableDir = try dir.openIterableDir(".", .{});
    defer iterableDir.close();

    // Iterate over the directory
    var iter = iterableDir.iterate();
    while (try iter.next()) |entry| {
        if (entry.kind == .directory) {
            var subDir = try dir.openDir(entry.name, .{});
            defer subDir.close();
            // Construct the subdirectory path
            var subDirPath = try std.fs.path.join(std.heap.page_allocator, &[_][]const u8{ dirPath, entry.name });
            defer std.heap.page_allocator.free(subDirPath);
            try processDirectory(subDir, subDirPath, code_blocks, folder_prefix);
        } else if (entry.kind == .file and std.mem.endsWith(u8, entry.name, ".md")) {
            // Use std.fs.path.join to construct the file path
            std.debug.print("Processing file: {s}\n", .{entry.name});
            const filePath = try std.fs.path.join(std.heap.page_allocator, &[_][]const u8{ dirPath, entry.name });
            defer std.heap.page_allocator.free(filePath);
            try processMarkdownFile(filePath, code_blocks, folder_prefix);
        }
    }
}

fn processMarkdownFile(filePath: []const u8, code_blocks: *std.ArrayList(CodeBlock), folder_prefix: []const u8) !void {
    const file = try std.fs.cwd().openFile(filePath, .{});
    defer file.close();

    var reader = file.reader();
    var buffer: [1024]u8 = undefined;
    var line_buffer = std.ArrayList(u8).init(std.heap.page_allocator);
    defer line_buffer.deinit();

    var in_code_block = false;
    // var current_block_name: ?[]const u8 = null;
    _ = folder_prefix;
    var current_var_name: ?[]const u8 = null;
    var current_output_file: ?[]const u8 = null;

    while (try reader.readUntilDelimiterOrEof(&buffer, '\n')) |line| {
        if (std.mem.startsWith(u8, line, "```") and !in_code_block) {
            in_code_block = true;
            // Extract metadata from the opening line
            //const metadata = std.mem.trim(u8, line, " ");
            var it = std.mem.split(u8, line, " ");
            _ = it.next(); // skip three backticks
            _ = it.next(); // skip code type
            std.debug.print("Found code block: {s}\n", .{line});
            current_var_name = it.next();
            current_output_file = it.next();
            std.debug.print("Var name {s}\n", .{@as([]const u8, current_var_name.?)});
            std.debug.print("output file {s}\n", .{@as([]const u8, current_output_file.?)});
            line_buffer.items.len = 0; // Reset the line buffer for the code content
        } else if (std.mem.startsWith(u8, line, "```") and in_code_block) {
            in_code_block = false;
            // Code block ends, process it
            const new_code_block = CodeBlock{
                .var_name = @as([]const u8, current_var_name.?),
                .file_path = @as([]const u8, current_output_file.?),
                .code = line_buffer.items,
                .source_file = filePath,
            };
            try code_blocks.append(new_code_block);
            std.debug.print("Processed code block: {s}\n", .{new_code_block.var_name});
            std.debug.print("File path: {s}\n", .{new_code_block.file_path});
            current_var_name = null;
            current_output_file = null;
            line_buffer.items.len = 0;
        } else if (in_code_block) {
            try line_buffer.appendSlice(line);
            try line_buffer.append('\n');
        }
    }
}

fn parseCodeBlock(line_buffer: []const u8, source_file: []const u8) ParseError!CodeBlock {
    var it = std.mem.split(u8, line_buffer, " ");
    const var_name = it.next() orelse return error.InvalidFormat;
    const file_path = it.next() orelse return error.InvalidFormat;
    const code = it.next() orelse return error.InvalidFormat;
    std.debug.print("Found code block: {s} {s} {s}\n", .{ var_name, file_path, code });
    return CodeBlock{ .var_name = var_name, .file_path = file_path, .code = code, .source_file = source_file };
}

fn codeBlockExists(ref_name: []const u8, code_blocks: *std.ArrayList(CodeBlock)) bool {
    for (code_blocks.items) |block| {
        if (std.mem.eql(u8, block.var_name, ref_name)) {
            return true;
        }
    }
    return false;
}
