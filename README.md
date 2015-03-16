# confusion

Sometimes, we need that little bit of “security by obscurity” and want to 
obfuscate our source code.

Confusion makes it harder to decipher your code by replacing string literals and 
property accessess with lookups into a string map.

## Example

```js
a.property(called.with('a string literal'));
an.other("call", "is", "here");
```

will be converted to

```js
(function(_x24139) {
  a[_x24139[0]](called[_x24139[1]](_x24139[2]));
  an[_x24139[3]](_x24139[4], _x24139[5], _x24139[6]);
}).call(
  this,
  ["property", "with", "a string literal", "other", "call", "is", "here"]
);
```

Pipe it through closure compiler and you’ll get:

```js
(function(b){a[b[0]](called[b[1]](b[2]));an[b[3]](b[4],b[5],b[6])}).call(this,"property;with;a string literal;other;call;is;here".split(";"));

```

## Usage: command line

`confusion` reads from *stdin* and writes to *stdout.* Just pipe your source or
build through it:

```sh
confusion < build.js > obfuscated.js

# or pipe the output of your build tool through it:
browserify . | confusion > obfuscated.js
```

## Usage: programmatic interface

The `confusion` module exposes two functions:
`transformAst(programNode, createVariableName)` and `createVariableName(names)`.

`transformAst` takes a program AST node 
(`{type: 'Program', body: [/* nodes...*/]}`) and a callback function to produce 
the variable name of the string name. That callback takes an array of names and
returns the variable name to be used for the string map.

`createVariableName` is a default implementation of the callback needed by 
`transformAst`.

```js
var parse = require('esprima').parse;
var toString = require('escodegen').generate;
var confusion = require('confusion');

var ast = parse(sourceCode);
var obfuscated = confusion.transformAst(ast, confusion.createVariableName);
console.log(toString(obfuscated));
```
