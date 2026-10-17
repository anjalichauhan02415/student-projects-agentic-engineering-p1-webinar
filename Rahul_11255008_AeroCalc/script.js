/**
 * AeroCalc — Modern Arithmetic Calculator
 * Logic, State Management, Keyboard Navigation & Audio Feedback
 */

class Calculator {
  constructor(displayCurrent, displayHistory, opIndicator) {
    this.displayCurrent = displayCurrent;
    this.displayHistory = displayHistory;
    this.opIndicator = opIndicator;
    this.clear();
  }

  clear() {
    this.currentOperand = '0';
    this.previousOperand = '';
    this.operation = undefined;
    this.shouldResetScreen = false;
    this.isError = false;
    this.updateDisplay();
  }

  delete() {
    if (this.isError) {
      this.clear();
      return;
    }
    if (this.shouldResetScreen) {
      this.currentOperand = '0';
      this.shouldResetScreen = false;
      this.updateDisplay();
      return;
    }
    if (this.currentOperand.length === 1 || (this.currentOperand.length === 2 && this.currentOperand.startsWith('-'))) {
      this.currentOperand = '0';
    } else {
      this.currentOperand = this.currentOperand.slice(0, -1);
    }
    this.updateDisplay();
  }

  appendNumber(number) {
    if (this.isError) {
      this.clear();
    }

    if (this.shouldResetScreen) {
      this.currentOperand = '';
      this.shouldResetScreen = false;
    }

    // Limit maximum input length
    if (this.currentOperand.replace(/[^0-9]/g, '').length >= 16 && number !== '.') {
      return;
    }

    if (number === '.') {
      if (this.currentOperand.includes('.')) return;
      if (this.currentOperand === '' || this.currentOperand === '0') {
        this.currentOperand = '0.';
        this.updateDisplay();
        return;
      }
    }

    if (this.currentOperand === '0' && number !== '.') {
      this.currentOperand = number.toString();
    } else {
      this.currentOperand = this.currentOperand.toString() + number.toString();
    }
    this.updateDisplay();
  }

  chooseOperation(operation) {
    if (this.isError) return;

    if (this.currentOperand === '' && this.previousOperand !== '') {
      // Allow changing operator if user clicks another operator
      this.operation = operation;
      this.updateDisplay();
      return;
    }

    if (this.previousOperand !== '') {
      this.compute(false);
    }

    this.operation = operation;
    this.previousOperand = this.currentOperand;
    this.shouldResetScreen = true;
    this.updateDisplay();
  }

  compute(isFinal = true) {
    if (this.isError) return;
    let computation;
    const prev = parseFloat(this.previousOperand);
    const current = parseFloat(this.currentOperand);

    if (isNaN(prev) || isNaN(current) || !this.operation) return;

    switch (this.operation) {
      case '+':
        computation = prev + current;
        break;
      case '−':
      case '-':
        computation = prev - current;
        break;
      case '×':
      case '*':
        computation = prev * current;
        break;
      case '÷':
      case '/':
        if (current === 0) {
          this.currentOperand = 'Cannot divide by 0';
          this.previousOperand = '';
          this.operation = undefined;
          this.isError = true;
          this.updateDisplay();
          return;
        }
        computation = prev / current;
        break;
      default:
        return;
    }

    // Fix JavaScript floating point rounding issues (e.g. 0.1 + 0.2)
    const cleanedResult = this.cleanFloat(computation);
    const expressionString = `${this.formatDisplayNumber(this.previousOperand)} ${this.operation} ${this.formatDisplayNumber(this.currentOperand)}`;

    if (isFinal) {
      // Record history
      historyManager.addHistory(expressionString, cleanedResult);
      this.previousOperand = '';
      this.operation = undefined;
    } else {
      this.previousOperand = cleanedResult.toString();
    }

    this.currentOperand = cleanedResult.toString();
    this.shouldResetScreen = true;
    this.updateDisplay();
  }

  applyPercent() {
    if (this.isError || this.currentOperand === '0') return;
    const current = parseFloat(this.currentOperand);
    if (isNaN(current)) return;

    let result;
    if (this.previousOperand && (this.operation === '+' || this.operation === '−' || this.operation === '-')) {
      const prev = parseFloat(this.previousOperand);
      result = (prev * current) / 100;
    } else {
      result = current / 100;
    }

    this.currentOperand = this.cleanFloat(result).toString();
    this.updateDisplay();
  }

  toggleNegate() {
    if (this.isError || this.currentOperand === '0') return;
    if (this.currentOperand.startsWith('-')) {
      this.currentOperand = this.currentOperand.substring(1);
    } else {
      this.currentOperand = '-' + this.currentOperand;
    }
    this.updateDisplay();
  }

  cleanFloat(number) {
    if (!isFinite(number)) return 'Error';
    // Round to 10 decimal digits to eliminate floating point artifacts
    return parseFloat(Number(Math.round(Number(number + 'e10')) + 'e-10').toFixed(10));
  }

  formatDisplayNumber(numberStr) {
    if (!numberStr) return '';
    if (numberStr === 'Cannot divide by 0' || numberStr === 'Error') return numberStr;

    const stringNumber = numberStr.toString();
    const isNegative = stringNumber.startsWith('-');
    const absString = isNegative ? stringNumber.substring(1) : stringNumber;

    const parts = absString.split('.');
    const integerDigits = parseFloat(parts[0]);
    const decimalDigits = parts[1];

    let integerDisplay;
    if (isNaN(integerDigits)) {
      integerDisplay = '';
    } else {
      integerDisplay = integerDigits.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }

    let formatted = isNegative ? '-' : '';
    if (decimalDigits != null) {
      formatted += `${integerDisplay}.${decimalDigits}`;
    } else {
      formatted += integerDisplay;
    }
    return formatted;
  }

  adjustFontSize() {
    const len = this.currentOperand.length;
    if (len > 14) {
      this.displayCurrent.style.fontSize = '1.65rem';
    } else if (len > 10) {
      this.displayCurrent.style.fontSize = '2.1rem';
    } else if (len > 7) {
      this.displayCurrent.style.fontSize = '2.4rem';
    } else {
      this.displayCurrent.style.fontSize = '';
    }
  }

  updateDisplay() {
    if (this.isError) {
      this.displayCurrent.textContent = this.currentOperand;
      this.displayHistory.textContent = '';
      this.opIndicator.textContent = 'ERROR';
      this.adjustFontSize();
      return;
    }

    this.displayCurrent.textContent = this.formatDisplayNumber(this.currentOperand) || '0';
    this.adjustFontSize();

    if (this.operation != null && this.previousOperand !== '') {
      this.displayHistory.textContent = `${this.formatDisplayNumber(this.previousOperand)} ${this.operation}`;
      this.opIndicator.textContent = this.operation;
    } else {
      this.displayHistory.textContent = '';
      this.opIndicator.textContent = '';
    }

    // Highlight active operator button
    document.querySelectorAll('.key-operator').forEach(btn => {
      if (this.operation && btn.getAttribute('data-operator') === this.operation && this.shouldResetScreen) {
        btn.classList.add('is-active-op');
      } else {
        btn.classList.remove('is-active-op');
      }
    });
  }

  loadValue(val) {
    this.currentOperand = val.toString();
    this.isError = false;
    this.shouldResetScreen = true;
    this.updateDisplay();
  }
}

/**
 * Sound Synthesis using Web Audio API
 */
class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.enabled = localStorage.getItem('aerocalc_sound') !== 'false';
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
  }

  playTone(freq = 600, duration = 0.04, type = 'sine') {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy catch
    }
  }

  playDigit() { this.playTone(480, 0.035, 'triangle'); }
  playOp() { this.playTone(720, 0.045, 'sine'); }
  playEquals() { this.playTone(920, 0.07, 'sine'); }
  playClear() { this.playTone(320, 0.05, 'triangle'); }
  playDelete() { this.playTone(380, 0.04, 'sine'); }

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('aerocalc_sound', this.enabled);
    return this.enabled;
  }
}

/**
 * Calculation History Manager
 */
class HistoryManager {
  constructor(listElement, onSelectCallback) {
    this.listElement = listElement;
    this.onSelect = onSelectCallback;
    this.history = JSON.parse(localStorage.getItem('aerocalc_history') || '[]');
    this.render();
  }

  addHistory(expression, result) {
    const entry = {
      id: Date.now(),
      expression,
      result: result.toString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.history.unshift(entry);
    if (this.history.length > 30) this.history.pop();
    this.save();
    this.render();
  }

  clear() {
    this.history = [];
    this.save();
    this.render();
  }

  save() {
    localStorage.setItem('aerocalc_history', JSON.stringify(this.history));
  }

  render() {
    if (!this.listElement) return;

    if (this.history.length === 0) {
      this.listElement.innerHTML = `
        <div class="history-empty">
          <p>No past calculations yet.</p>
          <span>Calculate something and it will appear here!</span>
        </div>
      `;
      return;
    }

    this.listElement.innerHTML = '';
    this.history.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'history-item';
      itemEl.title = 'Click to use this result';
      itemEl.innerHTML = `
        <span class="history-item-expr">${item.expression} =</span>
        <span class="history-item-result">${item.result}</span>
      `;
      itemEl.addEventListener('click', () => {
        if (this.onSelect) this.onSelect(item.result);
        drawerBackdrop.click();
        soundEngine.playDigit();
      });
      this.listElement.appendChild(itemEl);
    });
  }
}

/**
 * Toast Notification Utility
 */
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

// ---------------- Initialization & Event Wiring ----------------
const displayCurrent = document.getElementById('currentDisplay');
const displayHistory = document.getElementById('historyExpression');
const opIndicator = document.getElementById('operationIndicator');
const soundEngine = new SoundEngine();

let historyManager;
const calculator = new Calculator(displayCurrent, displayHistory, opIndicator);

// Init History Manager
historyManager = new HistoryManager(
  document.getElementById('historyList'),
  (result) => calculator.loadValue(result)
);

// Keypad Button Clicks
document.querySelectorAll('.key').forEach(button => {
  button.addEventListener('click', (e) => {
    handleKeyAction(button);
  });
});

function handleKeyAction(button) {
  const action = button.getAttribute('data-action');
  const digit = button.getAttribute('data-digit');
  const operator = button.getAttribute('data-operator');

  // Visual press pulse
  button.classList.add('is-pressed');
  setTimeout(() => button.classList.remove('is-pressed'), 120);

  if (digit !== null) {
    calculator.appendNumber(digit);
    soundEngine.playDigit();
  } else if (action === 'operator') {
    calculator.chooseOperation(operator);
    soundEngine.playOp();
  } else if (action === 'calculate') {
    calculator.compute(true);
    soundEngine.playEquals();
  } else if (action === 'clear') {
    calculator.clear();
    soundEngine.playClear();
  } else if (action === 'backspace') {
    calculator.delete();
    soundEngine.playDelete();
  } else if (action === 'percent') {
    calculator.applyPercent();
    soundEngine.playOp();
  } else if (action === 'negate') {
    calculator.toggleNegate();
    soundEngine.playOp();
  }
}

// Keyboard Input Handler
window.addEventListener('keydown', (e) => {
  // Prevent default scrolling on Space / Arrow / Backspace
  if ([' ', 'Enter', 'Backspace', '/', '*'].includes(e.key)) {
    e.preventDefault();
  }

  let selector = null;

  if (e.key >= '0' && e.key <= '9') {
    calculator.appendNumber(e.key);
    soundEngine.playDigit();
    selector = `.key-digit[data-digit="${e.key}"]`;
  } else if (e.key === '.' || e.key === ',') {
    calculator.appendNumber('.');
    soundEngine.playDigit();
    selector = '#btnDecimal';
  } else if (e.key === '+') {
    calculator.chooseOperation('+');
    soundEngine.playOp();
    selector = '#btnAdd';
  } else if (e.key === '-') {
    calculator.chooseOperation('−');
    soundEngine.playOp();
    selector = '#btnSubtract';
  } else if (e.key === '*' || e.key.toLowerCase() === 'x') {
    calculator.chooseOperation('×');
    soundEngine.playOp();
    selector = '#btnMultiply';
  } else if (e.key === '/') {
    calculator.chooseOperation('÷');
    soundEngine.playOp();
    selector = '#btnDivide';
  } else if (e.key === 'Enter' || e.key === '=') {
    calculator.compute(true);
    soundEngine.playEquals();
    selector = '#btnEquals';
  } else if (e.key === 'Backspace') {
    calculator.delete();
    soundEngine.playDelete();
    selector = '#btnBackspace';
  } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
    calculator.clear();
    soundEngine.playClear();
    selector = '#btnClear';
  } else if (e.key === '%') {
    calculator.applyPercent();
    soundEngine.playOp();
    selector = '#btnPercent';
  }

  // Button visual glow trigger on keyboard press
  if (selector) {
    const btn = document.querySelector(selector);
    if (btn) {
      btn.classList.add('is-pressed');
      setTimeout(() => btn.classList.remove('is-pressed'), 140);
    }
  }
});

// Copy to Clipboard
document.getElementById('copyBtn').addEventListener('click', async () => {
  const text = calculator.currentOperand;
  if (!text || text === '0') {
    showToast('Nothing to copy');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast(`Copied "${text}" to clipboard!`);
    soundEngine.playDigit();
  } catch (err) {
    showToast('Failed to copy');
  }
});

// History Drawer Controls
const historyDrawer = document.getElementById('historyDrawer');
const drawerBackdrop = document.getElementById('drawerBackdrop');
const historyToggleBtn = document.getElementById('historyToggleBtn');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

function toggleDrawer(open) {
  const isOpen = open !== undefined ? open : !historyDrawer.classList.contains('open');
  if (isOpen) {
    historyDrawer.classList.add('open');
    drawerBackdrop.classList.add('active');
    historyDrawer.setAttribute('aria-hidden', 'false');
  } else {
    historyDrawer.classList.remove('open');
    drawerBackdrop.classList.remove('active');
    historyDrawer.setAttribute('aria-hidden', 'true');
  }
}

historyToggleBtn.addEventListener('click', () => toggleDrawer(true));
closeHistoryBtn.addEventListener('click', () => toggleDrawer(false));
drawerBackdrop.addEventListener('click', () => toggleDrawer(false));

clearHistoryBtn.addEventListener('click', () => {
  historyManager.clear();
  showToast('History cleared');
  soundEngine.playClear();
});

// Sound Toggle
const soundToggleBtn = document.getElementById('soundToggleBtn');
const soundOnIcon = soundToggleBtn.querySelector('.sound-on-icon');
const soundOffIcon = soundToggleBtn.querySelector('.sound-off-icon');

function updateSoundUI(enabled) {
  if (enabled) {
    soundOnIcon.classList.remove('hidden');
    soundOffIcon.classList.add('hidden');
  } else {
    soundOnIcon.classList.add('hidden');
    soundOffIcon.classList.remove('hidden');
  }
}

updateSoundUI(soundEngine.enabled);

soundToggleBtn.addEventListener('click', () => {
  const isEnabled = soundEngine.toggle();
  updateSoundUI(isEnabled);
  showToast(isEnabled ? 'Sound enabled' : 'Sound muted');
  if (isEnabled) soundEngine.playDigit();
});

// Theme Toggle (Dark / Light)
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeDarkIcon = themeToggleBtn.querySelector('.theme-dark-icon');
const themeLightIcon = themeToggleBtn.querySelector('.theme-light-icon');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('aerocalc_theme', theme);
  if (theme === 'light') {
    themeDarkIcon.classList.add('hidden');
    themeLightIcon.classList.remove('hidden');
  } else {
    themeDarkIcon.classList.remove('hidden');
    themeLightIcon.classList.add('hidden');
  }
}

const savedTheme = localStorage.getItem('aerocalc_theme') || 'dark';
applyTheme(savedTheme);

themeToggleBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const nextTheme = current === 'light' ? 'dark' : 'light';
  applyTheme(nextTheme);
  soundEngine.playDigit();
});
