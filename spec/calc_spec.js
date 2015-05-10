describe("CalcJS", function () {
  var CalcJS = require('../src/calc.js').klass;
  beforeEach(function () {
    calc = new CalcJS();
  });

  it("handles normal operations", function () {
    expect(calc.evaluate("1+2").result).toBe(3);
    expect(calc.evaluate("2*3").result).toBe(6);
    expect(calc.evaluate("3-2-1").result).toBe(0);
    expect(calc.evaluate("2^3").result).toBe(8);
  });

  it("handles precedence", function () {
    expect(calc.evaluate("1+2*3").result).toBe(7);
    expect(calc.evaluate("3-8/4").result).toBe(1);
    expect(calc.evaluate("1+4*2^3").result).toBe(33);
  });

  it("handles parentheses", function () {
    expect(calc.evaluate("2*(1+3)").result).toBe(8);
    expect(calc.evaluate("3^((2-1)*3)").result).toBe(27);
    expect(calc.evaluate("(5-4)*-1").result).toBe(-1);
  });

  it("handles unary operators", function () {
    expect(calc.evaluate("-2").result).toBe(-2);
    expect(calc.evaluate("2--1").result).toBe(3);
    expect(calc.evaluate("3/(-3)").result).toBe(-1);
    expect(calc.evaluate("+5-+3").result).toBe(2);
  });

  describe("variables and functions", function () {
    it("handles variable assignment and reuse", function () {
      var answer = calc.evaluate("x=-3");
      expect(answer.message).toBe("set x to -3");
      answer = calc.evaluate("y=9+x");
      expect(answer.message).toBe("set y to 6");
      expect(calc.evaluate("x + y").result).toBe(3);

      var symbolMap = answer._internal.symbolMap;
      expect(symbolMap.x.symbolValue).toBe(-3);
      expect(symbolMap.y.symbolValue).toBe(6);
      expect(calc.evaluate("3 * -x - +y").result).toBe(3);
    });

    it("handles function declaration and reuse", function () {
      calc.evaluate("f(x)=4*x^-x");
      expect(calc.evaluate("f(1)").result).toBe(4);
      expect(calc.evaluate("3+f(2)").result).toBe(4);

      calc.evaluate("g(x)=1+f(x-1)");
      calc.evaluate("y = 2");
      calc.evaluate("z = 1");
      expect(calc.evaluate("z+2*g(y+f(y))").result).toBe(5);
    });

    it("handles variable binding in functions", function () {
      calc.evaluate("x=4-1");
      var answer = calc.evaluate("f(x)=abs(x)+1");
      expect(answer._internal.symbolMap.x.symbolValue).toBe(3);
      answer = calc.evaluate("f(-5)");
      expect(answer.result).toBe(6);
      expect(answer._internal.symbolMap.x.symbolValue).toBe(3);
    });

    it("comes with preloaded variables and functions", function () {
      expect(calc.evaluate("sin(1)").result).toBe(Math.sin(1));
      expect(calc.evaluate("cos(1)").result).toBe(Math.cos(1));
      expect(calc.evaluate("abs(-1)").result).toBe(1);
      expect(calc.evaluate("log(10)").result).toBe(Math.log(10));
      expect(calc.evaluate("round(7.2)").result).toBe(7);
      expect(calc.evaluate("-pi").result).toBe(-1 * Math.PI);
      expect(calc.evaluate("e").result).toBe(Math.E);
      for (var i = 0; i < 100; i++) {
        var randomNumber = calc.evaluate('random(10)').result;
        expect(randomNumber % 1).toBe(0);
        expect(randomNumber).toBeGreaterThan(0);
        expect(randomNumber).toBeLessThan(11);
      }
    });
  });

  describe("error handling", function () {
    it("throws error for bad tokens", function () {
      expect(calc.evaluate.bind(calc, "1+[]")).toThrow("Bad expression; cannot parse token at index 2.");
    });

    it("throws error for bad expressions and undefined entities", function () {
      expect(calc.evaluate.bind(calc, "1 ^ ^ 3")).toThrow("Malformed expression; unexpected ^");
      expect(calc.evaluate.bind(calc, "1 ^ 3-")).toThrow("Malformed expression; unexpected -");
      calc.evaluate("f(x)=x+1");
      expect(calc.evaluate.bind(calc, "1 + f(4")).toThrow("Cannot parse function invocation; expecting RIGHT_PAREN");
        calc.evaluate("foo=4");
      expect(calc.evaluate.bind(calc, "foo + bar")).toThrow("Unknown variable bar");
    });
  });
});