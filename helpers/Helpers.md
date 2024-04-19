``` javascript lit-type:output lit-file:helpers.js
console.log('test');

{{{ test_output }}}
```

``` javascript lit-type:code lit-name:test_output
console.log('test_output_reference');

{{{ reference_test }}}
```

```
path=parser_v_0.1.js
line_start=10
line_end=30
```

```

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

```

```

    setOutputFile(value) {
        this.output_file = value;
    }
    
    setMdFile(value) {
        this.md_file = value;
    }

```

```

    setOutputFile(value) {
        this.output_file = value;
    }
    
    setMdFile(value) {
        this.md_file = value;
    }

```

``` lit-type:reference lit-name:reference_test
path=parser_v_0.1.js
tag=to_import
```

