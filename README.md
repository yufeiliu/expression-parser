## Arithmetic expression parser in JavaScript

This originated as solution to an interview question. But I decided to expand on it, and ended up having a lot more fun fleshing out a full-featured arithmetic expression parser. It comes with its own lexer and parser, and internally converts expressions into postfix before evaluation. In addition to simple expressions (e.g., "3 + 5"), this parser can also handle:

* variable declaration
* function declaration
* built-in functions and constants

To run the parser inline and get result in STDOUT: `node run.js "1 + 2"`

To start an interactive shell: `node run.js`