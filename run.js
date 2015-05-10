var readline = require('readline');
var CalcJS = require('./src/calc.js').klass;

var calc = new CalcJS();

if (process.argv.length > 2) {
  console.log(calc.evaluate(process.argv[2]).result);
} else {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  function repl () {
    rl.question("> ", function(input) {
      if (input === '') {
        repl();
      } else if (input === 'exit' || input === 'quit') {
        rl.close();
      } else {
        var answer = calc.evaluate(input);
        console.log(answer.message || answer.result);
        repl();
      }
    });
  }

  repl();
}