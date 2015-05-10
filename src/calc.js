var tokenRegexes = {
  operator: /^[\+\-\*\/\^]/,
  number: /^[\d]?[\.]?[\d]+/,
  signedNumber: /^([\+]|[\-])?[\d]?[\.]?[\d]+/,
  variable: /^[a-zA-Z][a-zA-Z0-9_]*/,
  signedVariable: /^([\+]|[\-])[a-zA-Z][a-zA-Z0-9_]*/,
  equalSign: /^[\=]/,
  leftParent: /^[\(]/,
  rightParent: /^[\)]/,
  whitespace: /^[ ]+/
};

function Calc (map) {
  var addNativeFn = function (name, fn) {
    fn = fn || Math[name];
    this.symbolMap[name] = {
      symbolType: 'function',
      nativeFunction: fn
    };
  }.bind(this);

  var addVariable = function (name, value) {
    this.symbolMap[name] = {
      symbolType: 'variable',
      symbolValue: value
    };
  }.bind(this);

  this.symbolMap = map || {};

  ['sin', 'cos', 'tan', 'abs', 'ceil', 'floor', 'round', 'exp', 'log'].forEach(function (ea) {
    addNativeFn(ea);
  });
  addNativeFn('random', function (n) {
    return Math.floor(Math.random() * n) + 1;
  });
  addVariable('pi', Math.PI);
  addVariable('e', Math.E);
};

function isOperand (tokenObject) {
  return [
    'number',
    'signedNumber',
    'variable',
    'signedVariable',
    'function',
    'signedFunction'
  ].indexOf(tokenObject.type) > -1;
}

function isVariable (name) {
  return /[a-zA-Z][a-zA-Z0-9_]*/.test(name);
}

Calc.prototype.lex = function (str) {
  var originalLength = str.length;
  var tokenTypes = Object.keys(tokenRegexes);
  var tokens = [];
  while (str.length > 0) {
    var maxTokenLength = 0, token = null, tokenType = null, lastToken = tokens[tokens.length - 1];

    tokenTypes.forEach(function (ea) {
      if ((ea === 'signedNumber' || ea === 'signedVariable') && lastToken && (isOperand(lastToken) || lastToken.type === 'rightParent')) {
        return;
      }

      var regex = tokenRegexes[ea];
      var match = regex.exec(str);
      if (match && match[0].length > maxTokenLength) {
        token = match[0];
        maxTokenLength = match[0].length;
        tokenType = ea;
      }
    });

    if (token) {
      str = str.slice(token.length);
      if (tokenType === 'leftParent' && lastToken && (lastToken.type === 'variable' || lastToken.type === 'signedVariable')) {
        var balance = 1;
        var matched = false;
        var substr;
        for (var i = 1; i <= str.length; i++) {
          substr = str.substr(0, i);
          if (substr.substr(substr.length - 1) === '(') {
            balance++;
          } else if (substr.substr(substr.length - 1) === ')') {
            balance--;
          }

          if (balance === 0) {
            matched = true;
            break;
          }
        }

        if (matched) {
          str = str.substr(substr.length);
          substr = substr.substr(0, substr.length - 1);
          lastToken.type = lastToken.type === 'variable' ? 'function' : 'signedFunction';
          lastToken.fnInsideValue = substr;
        } else {
          throw "Cannot parse function invocation; expecting RIGHT_PAREN";
        }
      } else if (tokenType !== 'whitespace') {
        tokens.push({
          token: token,
          type: tokenType
        });
      }
    } else {
      throw "Bad expression; cannot parse token at index " + (originalLength - str.length) + ".";
    }
  }

  return tokens;
}

Calc.prototype.lookup = function (t) {
  var symbol = t.token;

  if (isVariable(symbol)) {
    var normalizedSymbolName = symbol;
    var sign = 1;

    if (tokenRegexes.signedVariable.test(symbol)) {
      var normalizedSymbolName = symbol.substring(1);
      if (symbol.substring(0,1) === '-') {
        sign = -1;
      }
    }

    var symbolState = this.symbolMap[normalizedSymbolName];

    if (!symbolState) {
      throw "Unknown variable " + normalizedSymbolName;
    }

    if (symbolState.symbolType === 'variable') {
      return sign * symbolState.symbolValue;
    } else if (symbolState.symbolType === 'function') {
      var symbolMapForParameter = {};
      var symbolMapForInvocation = {};
      Object.keys(this.symbolMap).forEach(function (s) {
        symbolMapForParameter[s] = this.symbolMap[s];
        symbolMapForInvocation[s] = this.symbolMap[s];
      }.bind(this));

      var parameter = (new Calc(symbolMapForParameter)).evaluate(t.fnInsideValue).result;
      if (symbolState.nativeFunction) {
        return sign * Number(symbolState.nativeFunction.call({}, parameter));
      } else {
        symbolMapForInvocation[symbolState.boundVariable] = {
          symbolType: 'variable',
          symbolValue: parameter
        };
        return sign * Number((new Calc(symbolMapForInvocation)).evaluate(symbolState.symbolValue).result);
      }
    }
  } else {
    return Number(symbol);
  }
}

Calc.prototype.evalPostFix = function (array) {
  function evalExpression(o1, operator, o2) {
    if (operator === '+') {
      return o1 + o2;
    } else if (operator === '-') {
      return o1 - o2;
    } else if (operator === '*') {
      return o1 * o2;
    } else if (operator === '/') {
      return o1 / o2;
    } else if (operator === '^') {
      return Math.pow(o1, o2);
    }
  }

  function getType(token) {
    if (['+', '-', '*', '/', '^'].indexOf(token) > -1) {
      return 'operator';
    } else {
      return 'operand';
    }
  }

  var reduced = true;
  while (reduced) {
    reduced = false;
    if (array.length < 3) {
      break;
    }

    for (var i = 0; i < array.length - 2; i++) {
      var a, b, c;
      a = array[i];
      b = array[i + 1];
      c = array[i + 2];

      if (getType(c.token) === 'operator' && getType(a.token) === 'operand' && getType(b.token) === 'operand') {
        var aValue = this.lookup(a);
        var bValue = this.lookup(b);
        var operator = c.token;

        var result = {
          type: 'number',
          token: evalExpression(aValue, operator, bValue)
        };
        array = array.slice(0, i).concat([result]).concat(array.slice(i + 3));
        reduced = true;
        break;
      }
    }
  }

  if (array.length > 1) {
    throw "Malformed expression; unexpected " + array[1].token;
  }

  return this.lookup(array[0]);
}

Calc.prototype.getInternalStates = function () {
  return {
    symbolMap: this.symbolMap
  }
}

Calc.prototype.evaluateTokens = function (tokens) {
  function getPrecedence(operator, order) {
    var additionalValue = Math.pow(10, order);

    if (['+', '-'].indexOf(operator) > -1) {
      return 1 + additionalValue;
    } else if (['*', '/'].indexOf(operator) > -1) {
      return 2 + additionalValue;
    } else {
      return 3 + additionalValue;
    }
  }

  function beginsWith(tokens, tokenTypes) {
    return tokens.length >= tokenTypes.length && tokens.slice(0, tokenTypes.length).every(function (t, index) {
      return t.type === tokenTypes[index];
    });
  }

  if (beginsWith(tokens, ['variable', 'equalSign'])) {
    var result = this.evaluateTokens(tokens.slice(2)).result;
    this.symbolMap[tokens[0].token] = {
      symbolType: 'variable',
      symbolValue: result
    };
    return {
      result: result,
      message: 'set ' + tokens[0].token + ' to ' + result,
      _internal: this.getInternalStates()
    };
  } else if (beginsWith(tokens, ['function', 'equalSign']) && isVariable(tokens[0].fnInsideValue)) {
    this.symbolMap[tokens[0].token] = {
      symbolType: 'function',
      boundVariable: tokens[0].fnInsideValue,
      symbolValue: tokens.slice(2).map(function (ea) {
        var serialized = ea.token;
        if (ea.fnInsideValue) {
          serialized += '(' + ea.fnInsideValue + ')';
        }
        return serialized;
      }).join('')
    };

    return {
      result: null,
      message: 'declared function ' + tokens[0].token + '(' + tokens[0].fnInsideValue + ')',
      _internal: this.getInternalStates()
    }
  }

  var currentOperators = [];
  var postFixStack = [];

  var order = 0;

  tokens.forEach(function (t) {
    if (t.type === 'leftParent') {
      order++;
      return;
    } else if (t.type === 'rightParent') {
      order--;
      return;
    }

    if (isOperand(t)) {
      postFixStack.push(t);
    } else if (t.type === 'operator') {
      var lastOperator = currentOperators[0];
      if (!lastOperator || getPrecedence(lastOperator.operator.token, lastOperator.order) < getPrecedence(t.token, order)) {
        currentOperators.unshift({
          operator: t,
          order: order
        });
      } else {
        var index;
        for (var i = 0; i < currentOperators.length; i++) {
          if (getPrecedence(currentOperators[i].operator.token, currentOperators[i].order) < getPrecedence(t.token, order)) {
            index = i;
            break;
          }
        }

        if (!index) {
          index = currentOperators.length;
        }

        postFixStack = postFixStack.concat(currentOperators.slice(0, index).map(function (ea) {
          return ea.operator;
        }));
        currentOperators = [{
          operator: t,
          order: order
        }].concat(currentOperators.slice(index));
      }
    }
  });

  postFixStack = postFixStack.concat(currentOperators.map(function (ea) {
    return ea.operator;
  }));

  return {
    result: this.evalPostFix(postFixStack),
    _internal: this.getInternalStates()
  };
}

Calc.prototype.evaluate = function (expression) {
  var answer = this.evaluateTokens(this.lex(expression));
  return answer;
};

exports.klass = Calc;