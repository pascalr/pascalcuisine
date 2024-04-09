# jomec

jomec is the Jome compiler.

## Compiling steps

Compiling Jome code into JavaScript code is done in many steps.

1. tokenizer: The code is broken down into tokens.
2. parser: The tokens are parsed into an Abstract Syntax Tree.
3. validator: Each node of the abstract syntax tree is validated in a first pass.
4. code generator: The tree is compiled into JavaScript.

### Tokenizer

Right now, a text mate tokenizer is used so I get syntax highlighting and it's easy to debug with vscode. Later a more optimized one will be used.