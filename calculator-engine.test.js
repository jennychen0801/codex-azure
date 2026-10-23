"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluate, format } = require("./calculator-engine.js");

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);
}

test("arithmetic, parentheses, Unicode operators and implicit multiplication", () => {
  assert.equal(evaluate("2 + 3 * 4"), 14);
  assert.equal(evaluate("(2+3) × 4 ÷ 2 − 1"), 9);
  assert.equal(evaluate("2(3+4)"), 14);
  assert.equal(evaluate("(2+3)(4+1)"), 25);
  close(evaluate("2π"), 2 * Math.PI);
  close(evaluate("2sin(30)"), 1);
});

test("powers bind right-to-left and precede unary signs", () => {
  assert.equal(evaluate("2^3^2"), 512);
  assert.equal(evaluate("-2^2"), -4);
  assert.equal(evaluate("(-2)^2"), 4);
  assert.equal(evaluate("2^-3"), 0.125);
  assert.equal(evaluate("3--2"), 5);
});

test("degree and radian trigonometry including inverse functions", () => {
  close(evaluate("sin(30)"), 0.5);
  close(evaluate("cos(60)"), 0.5);
  close(evaluate("tan(45)"), 1);
  assert.equal(evaluate("sin(180)"), 0);
  close(evaluate("asin(0.5)"), 30);
  close(evaluate("acos(0.5)"), 60);
  close(evaluate("atan(1)"), 45);
  close(evaluate("sin(pi/2)", { angleMode: "RAD" }), 1);
  close(evaluate("asin(1)", { angleMode: "RAD" }), Math.PI / 2);
});

test("logarithms, roots, factorial, percentage and scientific input", () => {
  assert.equal(evaluate("sqrt(81)+abs(-2)"), 11);
  assert.equal(evaluate("log(1000)"), 3);
  close(evaluate("ln(e)"), 1);
  close(evaluate("exp(1)"), Math.E);
  assert.equal(evaluate("0! + 5!"), 121);
  assert.equal(evaluate("200 * 10%"), 20);
  assert.equal(evaluate("100 + 10%"), 100.1);
  assert.equal(evaluate("1e-3 + 2E+2"), 200.001);
  assert.equal(evaluate(".5 + 1."), 1.5);
  assert.equal(evaluate("ans * 2", { ans: 7 }), 14);
});

test("invalid arithmetic returns descriptive errors", () => {
  for (const source of ["1/0", "0/0", "sqrt(-1)", "log(0)", "ln(-1)", "asin(2)", "acos(-2)", "tan(90)", "171!", "(-1)!", "1.5!", "10^999", "1e999", "(-2)^0.5"]) {
    assert.throws(() => evaluate(source), Error, source);
  }
  assert.throws(() => evaluate("tan(pi/2)", { angleMode: "RAD" }), /tan/);
});

test("malformed input and executable code are rejected", () => {
  for (const source of ["", "   ", "1+", "sin()", "(1+2", "1+2)", "2..3", "1 2", "sin 30", "foo(1)", "alert(1)", "globalThis", "constructor(1)", "1;2", "2**3", "<script>"]) {
    assert.throws(() => evaluate(source), Error, source);
  }
  assert.throws(() => evaluate("(".repeat(70) + "1" + ")".repeat(70)), /層數/);
  assert.throws(() => evaluate("1".repeat(2049)), /過長/);
  assert.throws(() => evaluate("1+".repeat(300) + "1"), /過長/);
});

test("regular and engineering formatting preserve useful precision", () => {
  assert.equal(format(0.1 + 0.2), "0.3");
  assert.equal(format(-0), "0");
  assert.equal(format(12345, true), "12.345e+3");
  assert.equal(format(0.0000123, true), "12.3e-6");
  assert.equal(format(-12345, true), "-12.345e+3");
  assert.equal(format(999999.9999999, true), "1e+6");
  assert.equal(format(0, true), "0");
  assert.equal(format(Number.MIN_VALUE, true), "5e-324");
  assert.throws(() => format(Infinity), Error);
});

test("example calculations", () => {
  close(evaluate("sin(30)^2 + cos(30)^2"), 1);
  close(evaluate("1 / (2 * π * 1000 * 0.000001)"), 159.15494309189535);
});

test("very small trigonometric results are not rounded to zero", () => {
  assert.equal(evaluate("sin(1e-20)", { angleMode: "RAD" }), Math.sin(1e-20));
  assert.equal(evaluate("tan(1e-20)", { angleMode: "RAD" }), Math.tan(1e-20));
});
