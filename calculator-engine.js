(function (root, factory) {
  const engine = factory();
  if (typeof module === "object" && module.exports) module.exports = engine;
  else root.CalculatorEngine = engine;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function finite(value) {
    if (!Number.isFinite(value)) throw new Error("結果超出範圍，或運算不在實數定義域內");
    return Object.is(value, -0) ? 0 : value;
  }

  function factorial(value) {
    if (!Number.isInteger(value) || value < 0) throw new Error("階乘僅接受非負整數");
    if (value > 170) throw new Error("階乘最大支援 170!");
    let result = 1;
    for (let factor = 2; factor <= value; factor += 1) result *= factor;
    return result;
  }

  function evaluate(source, options = {}) {
    if (typeof source !== "string" || !source.trim()) throw new Error("請先輸入算式");
    if (source.length > 2048) throw new Error("算式過長，請分段計算");
    const text = source.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/π/g, " pi ");
    const tokens = [];
    let offset = 0;
    while (offset < text.length) {
      const remaining = text.slice(offset);
      const match = /^(?:\s+|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[a-zA-Z]+|[+\-*/^()%!])/.exec(remaining);
      if (!match) throw new Error(`無法辨識的字元：${text[offset]}`);
      offset += match[0].length;
      if (!match[0].trim()) continue;
      tokens.push(match[0].toLowerCase());
      if (tokens.length > 512) throw new Error("算式過長，請分段計算");
    }

    let cursor = 0;
    let depth = 0;
    const radians = options.angleMode === "RAD";
    const constants = { pi: Math.PI, e: Math.E, ans: options.ans ?? 0 };
    const toRadians = value => radians ? value : value * Math.PI / 180;
    const fromRadians = value => radians ? value : value * 180 / Math.PI;
    const functions = {
      sin: value => !radians && value % 180 === 0 ? 0 : Math.sin(toRadians(value)),
      cos: value => !radians && Math.abs(value % 180) === 90 ? 0 : Math.cos(toRadians(value)),
      tan: value => {
        if (Math.abs(Math.cos(toRadians(value))) < 1e-14) throw new Error("此角度的 tan 未定義");
        return !radians && value % 180 === 0 ? 0 : Math.tan(toRadians(value));
      },
      asin: value => fromRadians(Math.asin(value)),
      acos: value => fromRadians(Math.acos(value)),
      atan: value => fromRadians(Math.atan(value)),
      sqrt: Math.sqrt,
      abs: Math.abs,
      ln: Math.log,
      log: Math.log10,
      exp: Math.exp,
    };

    function nested(operation) {
      depth += 1;
      if (depth > 64) throw new Error("括號或運算巢狀層數過多");
      const value = operation();
      depth -= 1;
      return value;
    }

    function expect(token) {
      if (tokens[cursor] !== token) throw new Error(`缺少「${token}」或括號內算式不完整`);
      cursor += 1;
    }

    function primary() {
      const token = tokens[cursor++];
      if (token === undefined) throw new Error("算式不完整");
      if (/^(?:\d|\.)/.test(token)) return finite(Number(token));
      if (token === "(") {
        const value = nested(expression);
        expect(")");
        return value;
      }
      if (Object.hasOwn(constants, token)) return finite(constants[token]);
      if (Object.hasOwn(functions, token)) {
        expect("(");
        const argument = nested(expression);
        expect(")");
        return finite(functions[token](argument));
      }
      throw new Error(`無法辨識的數值或函數：${token}`);
    }

    function postfix() {
      let value = primary();
      while (tokens[cursor] === "!" || tokens[cursor] === "%") {
        value = tokens[cursor++] === "!" ? factorial(value) : value / 100;
      }
      return finite(value);
    }

    function power() {
      const base = postfix();
      if (tokens[cursor] !== "^") return base;
      cursor += 1;
      return finite(base ** nested(unary));
    }

    function unary() {
      if (tokens[cursor] === "+" || tokens[cursor] === "-") {
        const sign = tokens[cursor++] === "-" ? -1 : 1;
        return finite(sign * nested(unary));
      }
      return power();
    }

    function term() {
      let value = unary();
      while (cursor < tokens.length) {
        const token = tokens[cursor];
        const implicit = token === "(" || /^[a-z]/.test(token);
        if (token !== "*" && token !== "/" && !implicit) break;
        if (!implicit) cursor += 1;
        const operand = unary();
        if (token === "/" && operand === 0) throw new Error("不能除以零");
        value = finite(token === "/" ? value / operand : value * operand);
      }
      return value;
    }

    function expression() {
      let value = term();
      while (tokens[cursor] === "+" || tokens[cursor] === "-") {
        const operator = tokens[cursor++];
        const operand = term();
        value = finite(operator === "+" ? value + operand : value - operand);
      }
      return value;
    }

    const result = finite(expression());
    if (cursor !== tokens.length) throw new Error(`多餘的符號或缺少運算子：${tokens[cursor]}`);
    return result;
  }

  function format(value, engineering = false) {
    finite(value);
    if (!engineering || value === 0) return String(Number(value.toPrecision(12)));
    let exponent = Math.floor(Math.log10(Math.abs(value)) / 3) * 3;
    const [mantissa, scientificExponent] = value.toExponential().split("e");
    let coefficient = Number(`${mantissa}e${Number(scientificExponent) - exponent}`);
    coefficient = Number(coefficient.toPrecision(12));
    if (Math.abs(coefficient) >= 1000) {
      coefficient /= 1000;
      exponent += 3;
    }
    return `${coefficient}e${exponent >= 0 ? "+" : ""}${exponent}`;
  }

  return { evaluate, format };
});
