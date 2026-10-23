"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const engine = require("./calculator-engine.js");

class Element {
  constructor() {
    this.dataset = {};
    this.attributes = {};
    this.handlers = {};
    this.children = [];
    this.value = "";
    this.textContent = "";
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.maxLength = 2048;
    this.classes = new Set();
    this.classList = { toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name) };
  }

  addEventListener(type, handler) {
    (this.handlers[type] ??= []).push(handler);
  }

  dispatch(type, options = {}) {
    const event = { target: this, currentTarget: this, preventDefault() { this.defaultPrevented = true; }, ...options };
    for (const handler of this.handlers[type] ?? []) handler(event);
    return event;
  }

  setAttribute(name, value) { this.attributes[name] = value; }
  append(...elements) { this.children.push(...elements); }
  replaceChildren(...elements) { this.children = elements; }
  focus() {}
  setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
  setRangeText(text, start, end) {
    this.value = this.value.slice(0, start) + text + this.value.slice(end);
    this.setSelectionRange(start + text.length, start + text.length);
  }
}

class Button extends Element {}

function setup() {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const elements = [];
  const ids = new Map();
  for (const match of html.matchAll(/<(button|input|output|span|p|div|ol)\b([^>]*)>/g)) {
    const element = match[1] === "button" ? new Button() : new Element();
    for (const attribute of match[2].matchAll(/([\w-]+)="([^"]*)"/g)) {
      const [, name, value] = attribute;
      if (name === "id") ids.set(value, element);
      if (name.startsWith("data-")) element.dataset[name.slice(5)] = value;
      element.setAttribute(name, value);
    }
    elements.push(element);
  }
  ids.get("result").textContent = "0";
  const document = new Element();
  document.getElementById = id => {
    assert.ok(ids.has(id), `Missing element #${id}`);
    return ids.get(id);
  };
  document.querySelectorAll = selector => {
    const keys = [...selector.matchAll(/\[data-([\w-]+)\]/g)].map(match => match[1]);
    return elements.filter(element => keys.some(key => Object.hasOwn(element.dataset, key)));
  };
  document.createElement = tag => tag === "button" ? new Button() : new Element();
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "calculator-ui.js"), "utf8"), {
    document, CalculatorEngine: engine, HTMLButtonElement: Button,
  });
  const input = ids.get("expression");
  const button = (key, value) => {
    const found = elements.find(element => element instanceof Button && element.dataset[key] === value);
    assert.ok(found, `Missing button ${key}=${value}`);
    return found;
  };
  return {
    input,
    get: id => ids.get(id),
    click: (key, value) => button(key, value).dispatch("click"),
    set: value => {
      input.value = value;
      input.setSelectionRange(value.length, value.length);
      input.dispatch("input");
    },
    key: (key, options = {}) => document.dispatch("keydown", { target: input, key, ...options }),
    calculate: () => button("action", "calculate").dispatch("click"),
    result: () => ids.get("result").textContent,
    history: () => ids.get("history-list").children,
  };
}

test("keypad evaluates, chains Ans and starts a fresh expression", () => {
  const page = setup();
  for (const value of ["2", "+", "3"]) page.click("insert", value);
  page.calculate();
  assert.equal(page.result(), "5");
  page.click("insert", "×");
  page.click("insert", "4");
  assert.equal(page.input.value, "ans×4");
  page.calculate();
  assert.equal(page.result(), "20");
  page.click("insert", "7");
  assert.equal(page.input.value, "7");
});

test("angle controls and engineering display update independently", () => {
  const page = setup();
  page.set("sin(30)");
  page.calculate();
  assert.equal(page.result(), "0.5");
  page.click("angle", "RAD");
  page.set("sin(pi/2)");
  page.calculate();
  assert.equal(page.result(), "1");
  assert.match(page.get("angle-label").textContent, /RAD/);
  page.get("engineering").dispatch("click");
  assert.equal(page.result(), "1e+0");
  page.click("action", "clear");
  page.get("engineering").dispatch("click");
  assert.equal(page.result(), "0");
});

test("memory operations and errors preserve previously stored values", () => {
  const page = setup();
  page.set("2+3");
  page.click("action", "memory-add");
  assert.equal(page.get("memory-status").textContent, "M 5");
  page.set("2");
  page.click("action", "memory-subtract");
  assert.equal(page.get("memory-status").textContent, "M 3");
  page.set("1/0");
  page.click("action", "memory-add");
  assert.equal(page.get("memory-status").textContent, "M 3");
  assert.equal(page.input.attributes["aria-invalid"], "true");
  page.click("action", "clear");
  page.click("action", "memory-recall");
  page.calculate();
  assert.equal(page.result(), "3");
  page.click("action", "memory-clear");
  assert.equal(page.get("memory-status").textContent, "M 空白");
});

test("invalid expressions do not replace Ans or enter history", () => {
  const page = setup();
  page.set("6*7");
  page.calculate();
  page.set("sqrt(-1)");
  page.calculate();
  assert.equal(page.input.attributes["aria-invalid"], "true");
  assert.equal(page.history().length, 1);
  page.click("action", "clear");
  page.click("insert", "ans");
  page.calculate();
  assert.equal(page.result(), "42");
  assert.equal(page.input.attributes["aria-invalid"], "false");
});

test("history recall restores its Ans and angle without corrupting display", () => {
  const page = setup();
  page.set("5");
  page.calculate();
  page.set("ans*2");
  page.calculate();
  page.click("angle", "RAD");
  page.set("99");
  page.calculate();
  page.history()[1].children[0].dispatch("click");
  assert.equal(page.input.value, "ans*2");
  assert.match(page.get("angle-label").textContent, /DEG/);
  page.get("engineering").dispatch("click");
  assert.equal(page.result(), "99e+0");
  page.calculate();
  assert.equal(page.result(), "10e+0");
});

test("history keeps only ten items and supports clearing", () => {
  const page = setup();
  for (let value = 0; value < 12; value += 1) {
    page.set(String(value));
    page.calculate();
  }
  assert.equal(page.history().length, 10);
  assert.equal(page.get("history-count").textContent, "10");
  assert.equal(page.get("history-empty").hidden, true);
  page.get("clear-history").dispatch("click");
  assert.equal(page.history().length, 0);
  assert.equal(page.get("history-empty").hidden, false);
});

test("keyboard shortcuts, selection replacement and backspace", () => {
  const page = setup();
  page.set("12+3");
  page.input.setSelectionRange(0, 2);
  page.click("insert", "4");
  assert.equal(page.input.value, "4+3");
  assert.equal(page.key("Enter").defaultPrevented, true);
  assert.equal(page.result(), "7");
  page.key("+");
  assert.equal(page.input.value, "ans+");
  page.click("insert", "1");
  page.key("=");
  assert.equal(page.result(), "8");
  page.key("Escape");
  assert.equal(page.input.value, "");
  page.set("123");
  page.input.setSelectionRange(1, 3);
  page.click("action", "backspace");
  assert.equal(page.input.value, "1");
  assert.equal(page.key("Enter", { isComposing: true }).defaultPrevented, undefined);
});

test("reciprocal and examples use the same calculation engine", () => {
  const page = setup();
  page.set("2+3");
  page.click("action", "reciprocal");
  page.calculate();
  assert.equal(page.result(), "0.2");
  page.click("example", "sin(30)^2 + cos(30)^2");
  page.calculate();
  assert.equal(page.result(), "1");
});

test("moving the caret after a result switches back to editing", () => {
  const page = setup();
  page.set("12+3");
  page.calculate();
  page.key("ArrowLeft");
  assert.equal(page.key("4").defaultPrevented, undefined);
  page.calculate();
  page.input.dispatch("pointerdown");
  assert.equal(page.key("4").defaultPrevented, undefined);
});
