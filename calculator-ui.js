"use strict";

(() => {
  const { evaluate, format } = CalculatorEngine;
  const input = document.getElementById("expression");
  const output = document.getElementById("result");
  const message = document.getElementById("message");
  const historyList = document.getElementById("history-list");
  const history = [];
  let angleMode = "DEG";
  let engineering = false;
  let answer = 0;
  let displayedValue = 0;
  let memory = 0;
  let hasMemory = false;
  let completed = false;

  function notify(text, error = false) {
    message.textContent = text;
    message.classList.toggle("error", error);
    input.setAttribute("aria-invalid", String(error));
  }

  function renderHistory() {
    historyList.replaceChildren();
    document.getElementById("history-empty").hidden = history.length > 0;
    document.getElementById("history-count").textContent = String(history.length).padStart(2, "0");
    for (const entry of history) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      const expression = document.createElement("span");
      const result = document.createElement("strong");
      button.type = "button";
      button.className = "history-item";
      expression.textContent = `${entry.angleMode} · ${entry.expression}`;
      result.textContent = `= ${format(entry.value, engineering)}`;
      button.append(expression, result);
      button.addEventListener("click", () => {
        input.value = entry.expression;
        answer = entry.previousAnswer;
        setAngle(entry.angleMode);
        completed = false;
        notify("已帶回算式與當時的 Ans，按 Enter 重新計算。");
        focusEnd();
      });
      item.append(button);
      historyList.append(item);
    }
  }

  function focusEnd() {
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
  }

  function insert(text) {
    if (completed) {
      input.value = /^[+\-×÷*/^%!]/.test(text) ? "ans" : "";
      input.setSelectionRange(input.value.length, input.value.length);
      completed = false;
    }
    input.focus({ preventScroll: true });
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    if (input.value.length - (end - start) + text.length > input.maxLength) {
      notify("算式過長，請分段計算。", true);
      return;
    }
    input.setRangeText(text, start, end, "end");
    notify("輸入中 · 按 Enter 或 = 計算");
  }

  function calculate() {
    try {
      const expression = input.value.trim();
      const previousAnswer = answer;
      const value = evaluate(expression, { angleMode, ans: answer });
      answer = value;
      displayedValue = value;
      output.textContent = format(displayedValue, engineering);
      completed = true;
      history.unshift({ expression, value, angleMode, previousAnswer });
      history.splice(10);
      renderHistory();
      notify("計算完成 · 使用運算子接續，或輸入新的算式。");
    } catch (error) {
      completed = false;
      notify(error.message, true);
    }
  }

  function setAngle(mode) {
    angleMode = mode;
    document.querySelectorAll("[data-angle]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.angle === mode));
    });
    document.getElementById("angle-label").textContent = mode === "DEG" ? "DEG · 角度制" : "RAD · 弧度制";
  }

  function updateMemory(action) {
    try {
      if (action === "memory-clear") {
        memory = 0;
        hasMemory = false;
      } else if (action === "memory-recall") {
        insert(`(${memory})`);
        notify(hasMemory ? "已插入記憶值。" : "記憶尚未設定，已插入 0。");
        return;
      } else {
        const value = completed || !input.value.trim() ? answer : evaluate(input.value, { angleMode, ans: answer });
        const nextMemory = memory + (action === "memory-add" ? value : -value);
        if (!Number.isFinite(nextMemory)) throw new Error("記憶值超出可表示範圍");
        memory = nextMemory;
        hasMemory = true;
      }
      const status = document.getElementById("memory-status");
      status.textContent = hasMemory ? `M ${format(memory, engineering)}` : "M 空白";
      status.classList.toggle("has-memory", hasMemory);
      notify(hasMemory ? "記憶值已更新。" : "記憶已清除。");
    } catch (error) {
      notify(error.message, true);
    }
  }

  function action(name) {
    if (name === "calculate") calculate();
    else if (name === "clear") {
      input.value = "";
      displayedValue = 0;
      output.textContent = "0";
      completed = false;
      notify("已清除算式；Ans 與記憶值保留。");
      focusEnd();
    } else if (name === "backspace") {
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? start;
      input.setRangeText("", start === end ? Math.max(0, start - 1) : start, end, "end");
      completed = false;
      input.focus({ preventScroll: true });
      notify("輸入中 · 按 Enter 或 = 計算");
    } else if (name === "reciprocal") {
      input.value = `1/(${completed ? "ans" : input.value || "ans"})`;
      completed = false;
      focusEnd();
      notify("已建立倒數算式，按 Enter 計算。");
    } else if (name.startsWith("memory-")) updateMemory(name);
  }

  document.querySelectorAll("[data-insert], [data-action]").forEach(button => {
    button.addEventListener("mousedown", event => event.preventDefault());
    button.addEventListener("click", () => {
      if (button.dataset.insert !== undefined) insert(button.dataset.insert);
      else action(button.dataset.action);
    });
  });

  document.querySelectorAll("[data-angle]").forEach(button => {
    button.addEventListener("click", () => {
      setAngle(button.dataset.angle);
      completed = false;
      notify(`已切換為 ${angleMode}，按 Enter 重新計算。`);
    });
  });

  document.getElementById("engineering").addEventListener("click", event => {
    engineering = !engineering;
    event.currentTarget.setAttribute("aria-pressed", String(engineering));
    output.textContent = format(displayedValue, engineering);
    if (hasMemory) document.getElementById("memory-status").textContent = `M ${format(memory, engineering)}`;
    renderHistory();
    notify(engineering ? "工程記號：指數為 3 的倍數。" : "已切換一般數字顯示。");
  });

  document.getElementById("clear-history").addEventListener("click", () => {
    history.length = 0;
    renderHistory();
    notify("計算紀錄已清空。");
  });

  document.querySelectorAll("[data-example]").forEach(button => {
    button.addEventListener("click", () => {
      input.value = button.dataset.example;
      completed = false;
      focusEnd();
      notify("已載入範例，按 Enter 查看結果。");
    });
  });

  input.addEventListener("pointerdown", () => {
    completed = false;
  });

  input.addEventListener("input", () => {
    completed = false;
    notify("輸入中 · 按 Enter 或 = 計算");
  });

  document.addEventListener("keydown", event => {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
    const onInput = event.target === input;
    const onButton = event.target instanceof HTMLButtonElement;
    if (onInput && ["ArrowLeft", "ArrowRight", "Home", "End", "Backspace", "Delete"].includes(event.key)) {
      completed = false;
    }
    if ((event.key === "Enter" && !onButton) || event.key === "=") {
      event.preventDefault();
      calculate();
    } else if (event.key === "Escape") {
      event.preventDefault();
      action("clear");
    } else if (onInput && completed && /^[0-9.+\-*/^()%!a-z]$/i.test(event.key)) {
      event.preventDefault();
      insert(event.key);
    } else if (!onInput && !onButton && /^[0-9.+\-*/^()%!a-z]$/i.test(event.key)) {
      event.preventDefault();
      insert(event.key);
    }
  });
})();
