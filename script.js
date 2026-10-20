'use strict';

/* =========================================================
   MyCalculator - script.js
   1. Safe expression parser (no eval / Function)
   2. Calculator state and input rules
   3. History, theme, keyboard and button events
   ========================================================= */

const OPERATORS = ['+', '-', '*', '/'];
const SYMBOLS = { '+': '+', '-': '\u2212', '*': '\u00d7', '/': '\u00f7' };
const MAX_LENGTH = 40;
const HISTORY_LIMIT = 20;
const STORAGE = { history: 'mycalc-history', theme: 'mycalc-theme' };

/* ---------- 1. Safe expression parser ----------
   Grammar:
     expression = term (('+' | '-') term)*
     term       = unary (('*' | '/') unary)*
     unary      = '-' unary | number
   Multiplication/division are handled before addition/subtraction. */

function tokenize(input) {
  const tokens = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (OPERATORS.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
    } else if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < input.length && /[0-9.]/.test(input[i])) num += input[i++];
      if (!/^(\d+\.?\d*|\.\d+)$/.test(num)) throw new Error('Invalid expression');
      tokens.push({ type: 'num', value: parseFloat(num) });
    } else {
      throw new Error('Invalid expression');
    }
  }
  return tokens;
}

function evaluateExpression(input) {
  const tokens = tokenize(input);
  if (!tokens.length) throw new Error('Invalid expression');
  let pos = 0;

  const isOp = (...ops) =>
    pos < tokens.length && tokens[pos].type === 'op' && ops.includes(tokens[pos].value);

  function parseExpression() {
    let value = parseTerm();
    while (isOp('+', '-')) {
      const op = tokens[pos++].value;
      const right = parseTerm();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  }

  function parseTerm() {
    let value = parseUnary();
    while (isOp('*', '/')) {
      const op = tokens[pos++].value;
      const right = parseUnary();
      if (op === '/') {
        if (right === 0) throw new Error('DIV_ZERO');
        value /= right;
      } else {
        value *= right;
      }
    }
    return value;
  }

  function parseUnary() {
    if (isOp('-')) {
      pos++;
      return -parseUnary();
    }
    if (pos >= tokens.length || tokens[pos].type !== 'num') throw new Error('Invalid expression');
    return tokens[pos++].value;
  }

  const result = parseExpression();
  if (pos !== tokens.length) throw new Error('Invalid expression');
  if (!Number.isFinite(result)) throw new Error('OUT_OF_RANGE');
  return result;
}

/* Rounds floating-point noise (0.1 + 0.2 -> 0.3) and avoids exponent notation. */
function formatNumber(n) {
  const r = Number(n.toPrecision(12));
  if (Math.abs(r) >= 1e15) throw new Error('OUT_OF_RANGE');
  let s = String(r);
  if (s.includes('e')) s = r.toFixed(12).replace(/0+$/, '').replace(/\.$/, '');
  return s === '-0' ? '0' : s;
}

/* "5*-3" -> "5 × −3" (display only) */
function pretty(expr) {
  return expr
    .replace(/([0-9.])([+\-*/])/g, '$1 $2 ')
    .replace(/[+\-*/]/g, (c) => SYMBOLS[c]);
}

/* ---------- 2. Calculator state ---------- */

const state = { expr: '', previous: '', justEvaluated: false, error: null };
const history = [];

const els = {
  current: document.getElementById('current'),
  previous: document.getElementById('previous'),
  keypad: document.getElementById('keypad'),
  themeToggle: document.getElementById('themeToggle'),
  historyList: document.getElementById('historyList'),
  historyEmpty: document.getElementById('historyEmpty'),
  clearHistory: document.getElementById('clearHistory'),
};

function lastNumber() {
  return state.expr.match(/[0-9.]*$/)[0];
}

/* Runs before every input: clears errors and decides whether a finished result is reused or replaced. */
function prepare(startsNew) {
  if (state.error) {
    state.expr = '';
    state.previous = '';
    state.error = null;
    state.justEvaluated = false;
  }
  if (state.justEvaluated) {
    if (startsNew) state.expr = '';
    state.previous = '';
    state.justEvaluated = false;
  }
}

function inputDigit(d) {
  prepare(true);
  if (state.expr.length >= MAX_LENGTH) return;
  if (lastNumber() === '0') state.expr = state.expr.slice(0, -1); // no leading zeros (05 -> 5)
  state.expr += d;
}

function inputDecimal() {
  prepare(true);
  if (state.expr.length >= MAX_LENGTH) return;
  const last = lastNumber();
  if (last.includes('.')) return; // only one decimal point per number
  state.expr += last === '' ? '0.' : '.';
}

function inputOperator(op) {
  prepare(false);
  let e = state.expr.replace(/\.$/, ''); // "5." + "+" -> "5+"
  if (e === '') {
    if (op === '-') state.expr = '-'; // allow a negative first number
    return;
  }
  if (e === '-') return;
  const last = e.slice(-1);
  if (OPERATORS.includes(last)) {
    if (op === '-' && (last === '*' || last === '/')) { // 5*-3 is valid
      if (e.length < MAX_LENGTH) state.expr = e + op;
      return;
    }
    const beforeLast = e.slice(-2, -1);
    e = OPERATORS.includes(beforeLast) ? e.slice(0, -2) : e.slice(0, -1); // replace operator
    if (!e) return;
    state.expr = e + op;
    return;
  }
  if (e.length < MAX_LENGTH) state.expr = e + op;
}

function deleteLast() {
  if (state.error) { clearAll(); return; }
  if (state.justEvaluated) { state.justEvaluated = false; state.previous = ''; }
  state.expr = state.expr.slice(0, -1);
}

function clearAll() {
  state.expr = '';
  state.previous = '';
  state.error = null;
  state.justEvaluated = false;
}

function calculate() {
  if (state.error) return;
  let e = state.expr;
  while (e && OPERATORS.includes(e.slice(-1))) e = e.slice(0, -1); // drop trailing operator
  e = e.replace(/\.$/, '');
  if (!/[0-9]/.test(e)) return;
  if (!OPERATORS.some((op) => e.slice(1).includes(op))) { // just a number, nothing to calculate
    state.expr = e;
    return;
  }
  try {
    const result = formatNumber(evaluateExpression(e));
    addHistory(e, result);
    state.previous = pretty(e) + ' =';
    state.expr = result;
    state.justEvaluated = true;
  } catch (err) {
    const messages = {
      DIV_ZERO: 'Cannot divide by zero',
      OUT_OF_RANGE: 'Result is too large',
    };
    state.error = messages[err.message] || 'Invalid expression';
    state.previous = pretty(e);
  }
}

/* ---------- Display ---------- */

function render() {
  const text = state.error || (state.expr === '' ? '0' : pretty(state.expr));
  els.current.textContent = text;
  els.current.classList.toggle('error', Boolean(state.error));
  els.current.dataset.size = text.length > 22 ? 'xs' : text.length > 12 ? 'sm' : 'md';
  els.previous.textContent = state.previous;
}

/* ---------- 3a. History ---------- */

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE.history));
    if (Array.isArray(saved)) {
      saved
        .filter((h) => h && typeof h.expression === 'string' && typeof h.result === 'string')
        .slice(0, HISTORY_LIMIT)
        .forEach((h) => history.push({ expression: h.expression, result: h.result }));
    }
  } catch (err) { /* storage unavailable or corrupted: start empty */ }
}

function saveHistory() {
  try { localStorage.setItem(STORAGE.history, JSON.stringify(history)); } catch (err) { /* ignore */ }
}

function addHistory(expression, result) {
  history.unshift({ expression, result });
  if (history.length > HISTORY_LIMIT) history.pop();
  saveHistory();
  renderHistory();
}

function renderHistory() {
  els.historyList.textContent = '';
  history.forEach((item) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'history-item';
    btn.setAttribute('aria-label', 'Use result ' + item.result + ' from ' + pretty(item.expression));
    const expr = document.createElement('span');
    expr.className = 'h-expr';
    expr.textContent = pretty(item.expression) + ' =';
    const res = document.createElement('span');
    res.className = 'h-result';
    res.textContent = item.result;
    btn.append(expr, res);
    btn.addEventListener('click', () => { // reuse a previous result
      state.error = null;
      state.expr = item.result;
      state.previous = '';
      state.justEvaluated = true;
      render();
    });
    li.appendChild(btn);
    els.historyList.appendChild(li);
  });
  els.historyEmpty.hidden = history.length > 0;
  els.clearHistory.disabled = history.length === 0;
}

els.clearHistory.addEventListener('click', () => {
  history.length = 0;
  saveHistory();
  renderHistory();
});

/* ---------- 3b. Theme ---------- */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  els.themeToggle.textContent = theme === 'light' ? '\u263E' : '\u2600';
  els.themeToggle.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
  try { localStorage.setItem(STORAGE.theme, theme); } catch (err) { /* ignore */ }
}

els.themeToggle.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
});

/* ---------- 3c. Buttons and keyboard ---------- */

els.keypad.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const { action, value } = btn.dataset;
  if (action === 'digit') inputDigit(value);
  else if (action === 'decimal') inputDecimal();
  else if (action === 'operator') inputOperator(value);
  else if (action === 'equals') calculate();
  else if (action === 'delete') deleteLast();
  else if (action === 'clear') clearAll();
  render();
});

function flash(key) {
  const btn = els.keypad.querySelector('[data-key="' + key + '"]');
  if (!btn) return;
  btn.classList.add('pressed');
  setTimeout(() => btn.classList.remove('pressed'), 120);
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  // Let Enter activate theme/history buttons normally
  if (e.key === 'Enter' && t.closest('button') && !t.closest('#keypad')) return;

  const key = e.key === 'x' || e.key === 'X' ? '*' : e.key === '=' ? 'Enter' : e.key === ',' ? '.' : e.key;
  let handled = true;
  if (/^[0-9]$/.test(key)) inputDigit(key);
  else if (key === '.') inputDecimal();
  else if (OPERATORS.includes(key)) inputOperator(key);
  else if (key === 'Enter') calculate();
  else if (key === 'Backspace') deleteLast();
  else if (key === 'Escape') clearAll();
  else handled = false;

  if (handled) {
    e.preventDefault();
    flash(key);
    render();
  }
});

/* ---------- Start ---------- */

(function init() {
  let theme = 'dark';
  try { theme = localStorage.getItem(STORAGE.theme) === 'light' ? 'light' : 'dark'; } catch (err) { /* ignore */ }
  applyTheme(theme);
  loadHistory();
  renderHistory();
  render();
})();
