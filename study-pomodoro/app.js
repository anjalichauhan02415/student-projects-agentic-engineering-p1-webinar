/**
 * StudyPomodoro • Advanced Focus Clock & Session Tracker
 * Senior Frontend Architecture with Zero Build Tools
 */

// --- Constants & Config ---
const STORAGE_KEY = 'studypomodoro_v1';
const CIRCLE_RADIUS = 124;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~779.11

// --- Audio Synthesizer (Zero External File Dependencies) ---
class AudioSynthesizer {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playCompletionChime() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Harmonic 3-tone peaceful bell chord (A4 -> C#5 -> E5)
      const frequencies = [440, 554.37, 659.25];
      frequencies.forEach((freq, index) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.12);

        // Gentle attack & exponential decay envelope
        const startTime = now + index * 0.12;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 1.3);
      });
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  playClickTick() {
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);

      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {
      // Ignored for subtle click
    }
  }
}

// --- Persistence & Storage Manager ---
class StorageManager {
  static getTodayDateString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  static getDefaultState() {
    return {
      version: 1,
      currentTask: '',
      totalCompletedSessions: 0,
      dailyStats: {
        date: StorageManager.getTodayDateString(),
        completedSessionsToday: 0,
        focusMinutesToday: 0
      },
      streak: {
        lastActiveDate: '',
        count: 0
      },
      settings: {
        focusDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        longBreakInterval: 4,
        dailyGoal: 8,
        soundEnabled: true,
        autoStartBreaks: false
      },
      sessionHistory: []
    };
  }

  static load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return StorageManager.getDefaultState();
      
      const parsed = JSON.parse(data);
      const defaults = StorageManager.getDefaultState();
      const state = { ...defaults, ...parsed };

      // Roll over daily stats if new day
      const todayStr = StorageManager.getTodayDateString();
      if (state.dailyStats.date !== todayStr) {
        state.dailyStats = {
          date: todayStr,
          completedSessionsToday: 0,
          focusMinutesToday: 0
        };
      }

      return state;
    } catch (e) {
      console.error('Failed to load local storage:', e);
      return StorageManager.getDefaultState();
    }
  }

  static save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save to local storage:', e);
    }
  }
}

// --- Main Application Core ---
class StudyPomodoroApp {
  constructor() {
    this.state = StorageManager.load();
    this.audio = new AudioSynthesizer();

    // Runtime Timer State
    this.currentMode = 'focus'; // 'focus' | 'short-break' | 'long-break'
    this.cycleCount = 1; // 1 to longBreakInterval
    this.isRunning = false;
    this.timerInterval = null;
    this.endTime = null;
    this.timeLeft = this.getDurationForMode(this.currentMode) * 60;
    this.totalDuration = this.timeLeft;

    // Cache DOM Elements
    this.dom = {
      // Header
      headerStreakBadge: document.getElementById('header-streak-badge'),
      btnToggleSound: document.getElementById('btn-toggle-sound'),
      soundIconContainer: document.getElementById('sound-icon-container'),
      btnOpenSettings: document.getElementById('btn-open-settings'),

      // Task Tracker
      currentTaskInput: document.getElementById('current-task-input'),
      taskSaveIndicator: document.getElementById('task-save-indicator'),
      btnClearTask: document.getElementById('btn-clear-task'),
      quickTagBtns: document.querySelectorAll('.quick-tag-btn'),

      // Timer Display & Ring
      tabFocus: document.getElementById('tab-focus'),
      tabShortBreak: document.getElementById('tab-short-break'),
      tabLongBreak: document.getElementById('tab-long-break'),
      timerDisplay: document.getElementById('timer-display'),
      timerProgressRing: document.getElementById('timer-progress-ring'),
      timerStatusBadge: document.getElementById('timer-status-badge'),
      timerModeName: document.getElementById('timer-mode-name'),
      cycleDotsContainer: document.getElementById('cycle-dots-container'),
      cycleLabel: document.getElementById('cycle-label'),
      ambientGlow1: document.getElementById('ambient-glow-1'),

      // Controls
      btnToggleTimer: document.getElementById('btn-toggle-timer'),
      playPauseIconContainer: document.getElementById('play-pause-icon-container'),
      playPauseText: document.getElementById('play-pause-text'),
      btnReset: document.getElementById('btn-reset'),
      btnSkip: document.getElementById('btn-skip'),
      presetStandard: document.getElementById('preset-standard'),
      presetDeepwork: document.getElementById('preset-deepwork'),

      // Metrics & Stats
      statTotalSessions: document.getElementById('stat-total-sessions'),
      statTodaySessions: document.getElementById('stat-today-sessions'),
      statTodayGoalTarget: document.getElementById('stat-today-goal-target'),
      goalProgressBar: document.getElementById('goal-progress-bar'),
      statTodayTime: document.getElementById('stat-today-time'),
      statCurrentStreak: document.getElementById('stat-current-streak'),

      // History
      sessionHistoryList: document.getElementById('session-history-list'),
      emptyHistoryNotice: document.getElementById('empty-history-notice'),
      btnClearHistory: document.getElementById('btn-clear-history'),

      // Settings Modal
      settingsModal: document.getElementById('settings-modal'),
      btnCloseSettings: document.getElementById('btn-close-settings'),
      btnSaveSettings: document.getElementById('btn-save-settings'),
      btnResetData: document.getElementById('btn-reset-data'),
      btnTestChime: document.getElementById('btn-test-chime'),
      inputFocusDuration: document.getElementById('input-focus-duration'),
      inputShortDuration: document.getElementById('input-short-duration'),
      inputLongDuration: document.getElementById('input-long-duration'),
      inputDailyGoal: document.getElementById('input-daily-goal'),
      valFocusDuration: document.getElementById('val-focus-duration'),
      valShortDuration: document.getElementById('val-short-duration'),
      valLongDuration: document.getElementById('val-long-duration'),
      valDailyGoal: document.getElementById('val-daily-goal'),
      toggleAutoBreaks: document.getElementById('toggle-auto-breaks'),
      toggleSoundSettings: document.getElementById('toggle-sound-settings'),
    };

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.syncSettingsInputs();
    this.renderTask();
    this.renderMetrics();
    this.renderHistory();
    this.updateSoundIcon();
    this.setMode('focus', false);
    this.refreshIcons();
  }

  refreshIcons() {
    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }
  }

  setIcon(container, iconName, extraClass = '') {
    if (!container) return;
    container.innerHTML = `<i data-lucide="${iconName}" class="${extraClass}"></i>`;
    this.refreshIcons();
  }

  getDurationForMode(mode) {
    switch (mode) {
      case 'short-break':
        return this.state.settings.shortBreakDuration;
      case 'long-break':
        return this.state.settings.longBreakDuration;
      case 'focus':
      default:
        return this.state.settings.focusDuration;
    }
  }

  setupEventListeners() {
    // Mode Switch Tabs
    this.dom.tabFocus.addEventListener('click', () => this.switchMode('focus'));
    this.dom.tabShortBreak.addEventListener('click', () => this.switchMode('short-break'));
    this.dom.tabLongBreak.addEventListener('click', () => this.switchMode('long-break'));

    // Controls
    this.dom.btnToggleTimer.addEventListener('click', () => this.toggleTimer());
    this.dom.btnReset.addEventListener('click', () => this.resetTimer());
    this.dom.btnSkip.addEventListener('click', () => this.skipSession());

    // Presets
    this.dom.presetStandard.addEventListener('click', () => this.applyPreset(25, 5, 15));
    this.dom.presetDeepwork.addEventListener('click', () => this.applyPreset(50, 10, 20));

    // Task Management
    let saveTimeout;
    this.dom.currentTaskInput.addEventListener('input', (e) => {
      this.dom.btnClearTask.classList.toggle('hidden', !e.target.value);
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        this.saveCurrentTask(e.target.value.trim());
      }, 400);
    });

    this.dom.currentTaskInput.addEventListener('blur', (e) => {
      this.saveCurrentTask(e.target.value.trim());
    });

    this.dom.btnClearTask.addEventListener('click', () => {
      this.dom.currentTaskInput.value = '';
      this.dom.btnClearTask.classList.add('hidden');
      this.saveCurrentTask('');
      this.dom.currentTaskInput.focus();
    });

    this.dom.quickTagBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        const currentVal = this.dom.currentTaskInput.value.trim();
        if (currentVal) {
          this.dom.currentTaskInput.value = `${currentVal} • ${tag}`;
        } else {
          this.dom.currentTaskInput.value = tag;
        }
        this.dom.btnClearTask.classList.remove('hidden');
        this.saveCurrentTask(this.dom.currentTaskInput.value);
      });
    });

    // Sound Toggle in Header
    this.dom.btnToggleSound.addEventListener('click', () => {
      this.state.settings.soundEnabled = !this.state.settings.soundEnabled;
      StorageManager.save(this.state);
      this.updateSoundIcon();
      this.dom.toggleSoundSettings.checked = this.state.settings.soundEnabled;
      if (this.state.settings.soundEnabled) {
        this.audio.playClickTick();
      }
    });

    // Settings Modal
    this.dom.btnOpenSettings.addEventListener('click', () => this.openSettings());
    this.dom.btnCloseSettings.addEventListener('click', () => this.closeSettings());
    this.dom.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.dom.settingsModal) this.closeSettings();
    });

    // Sliders
    this.dom.inputFocusDuration.addEventListener('input', (e) => {
      this.dom.valFocusDuration.textContent = `${e.target.value}m`;
    });
    this.dom.inputShortDuration.addEventListener('input', (e) => {
      this.dom.valShortDuration.textContent = `${e.target.value}m`;
    });
    this.dom.inputLongDuration.addEventListener('input', (e) => {
      this.dom.valLongDuration.textContent = `${e.target.value}m`;
    });
    this.dom.inputDailyGoal.addEventListener('input', (e) => {
      this.dom.valDailyGoal.textContent = `${e.target.value}`;
    });

    this.dom.btnTestChime.addEventListener('click', () => {
      this.audio.playCompletionChime();
    });

    this.dom.btnSaveSettings.addEventListener('click', () => this.saveSettings());

    this.dom.btnResetData.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all your study stats and history? This cannot be undone.')) {
        this.state = StorageManager.getDefaultState();
        StorageManager.save(this.state);
        this.syncSettingsInputs();
        this.renderTask();
        this.renderMetrics();
        this.renderHistory();
        this.resetTimer();
        this.closeSettings();
      }
    });

    this.dom.btnClearHistory.addEventListener('click', () => {
      if (confirm('Clear the recent activity log?')) {
        this.state.sessionHistory = [];
        StorageManager.save(this.state);
        this.renderHistory();
      }
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Do not trigger if user is actively typing in an input
      const activeElement = document.activeElement;
      const isInput = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');

      if (e.code === 'Space' && !isInput) {
        e.preventDefault();
        this.toggleTimer();
      } else if ((e.key === 'r' || e.key === 'R' || e.key === 'Escape') && !isInput) {
        this.resetTimer();
      } else if ((e.key === 's' || e.key === 'S') && !isInput) {
        this.skipSession();
      } else if ((e.key === 't' || e.key === 'T') && !isInput) {
        e.preventDefault();
        this.dom.currentTaskInput.focus();
        this.dom.currentTaskInput.select();
      }
    });
  }

  // --- Task Operations ---
  saveCurrentTask(task) {
    this.state.currentTask = task;
    StorageManager.save(this.state);

    // Flash saved indicator
    this.dom.taskSaveIndicator.style.opacity = '1';
    setTimeout(() => {
      this.dom.taskSaveIndicator.style.opacity = '0';
    }, 1500);
  }

  renderTask() {
    if (this.state.currentTask) {
      this.dom.currentTaskInput.value = this.state.currentTask;
      this.dom.btnClearTask.classList.remove('hidden');
    } else {
      this.dom.currentTaskInput.value = '';
      this.dom.btnClearTask.classList.add('hidden');
    }
  }

  // --- Timer Engine & State Updates ---
  switchMode(mode) {
    if (this.isRunning) {
      const confirmSwitch = confirm('Session currently active. Do you want to switch and reset the clock?');
      if (!confirmSwitch) return;
    }
    this.setMode(mode, true);
  }

  setMode(mode, resetTime = true) {
    this.currentMode = mode;
    this.stopInterval();
    this.isRunning = false;
    this.updateControlsUI();

    // Body classes for theme shifts
    document.body.classList.remove('mode-focus', 'mode-short-break', 'mode-long-break', 'timer-running');
    document.body.classList.add(`mode-${mode}`);

    // Update Mode Tabs UI
    const tabs = [
      { id: this.dom.tabFocus, mode: 'focus' },
      { id: this.dom.tabShortBreak, mode: 'short-break' },
      { id: this.dom.tabLongBreak, mode: 'long-break' }
    ];

    tabs.forEach(({ id, mode: tabMode }) => {
      if (tabMode === mode) {
        let activeBgClass = 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30';
        if (mode === 'short-break') activeBgClass = 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30';
        if (mode === 'long-break') activeBgClass = 'bg-sky-600 text-white shadow-md shadow-sky-600/30';

        id.className = `mode-tab-btn flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 ${activeBgClass}`;
      } else {
        id.className = 'mode-tab-btn flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200';
      }
    });

    // Update Status Pill & SVG Gradient
    if (mode === 'focus') {
      this.dom.timerStatusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase mb-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      this.dom.timerModeName.textContent = 'Focus Session';
      this.dom.timerProgressRing.setAttribute('stroke', 'url(#timer-gradient-focus)');
      this.dom.ambientGlow1.className = 'absolute -top-[20%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-pink-500/10 blur-[130px] transition-all duration-1000';
    } else if (mode === 'short-break') {
      this.dom.timerStatusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase mb-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      this.dom.timerModeName.textContent = 'Short Break';
      this.dom.timerProgressRing.setAttribute('stroke', 'url(#timer-gradient-short)');
      this.dom.ambientGlow1.className = 'absolute -top-[20%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-emerald-600/20 via-teal-600/15 to-cyan-500/10 blur-[130px] transition-all duration-1000';
    } else {
      this.dom.timerStatusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase mb-2 bg-sky-500/10 text-sky-400 border border-sky-500/20';
      this.dom.timerModeName.textContent = 'Long Break';
      this.dom.timerProgressRing.setAttribute('stroke', 'url(#timer-gradient-long)');
      this.dom.ambientGlow1.className = 'absolute -top-[20%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-sky-600/20 via-blue-600/15 to-indigo-500/10 blur-[130px] transition-all duration-1000';
    }

    if (resetTime) {
      this.timeLeft = this.getDurationForMode(mode) * 60;
      this.totalDuration = this.timeLeft;
    }

    this.renderCycleIndicator();
    this.updateDisplay();
  }

  toggleTimer() {
    this.audio.init();

    if (this.isRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer() {
    this.isRunning = true;
    document.body.classList.add('timer-running');
    this.dom.btnToggleTimer.classList.add('pulse-click');
    setTimeout(() => this.dom.btnToggleTimer.classList.remove('pulse-click'), 300);

    // Precision timestamp delta to prevent drift on tab unfocus
    this.endTime = Date.now() + this.timeLeft * 1000;

    this.timerInterval = setInterval(() => {
      const remainingMs = this.endTime - Date.now();
      if (remainingMs <= 0) {
        this.timeLeft = 0;
        this.updateDisplay();
        this.onTimerComplete();
      } else {
        this.timeLeft = Math.ceil(remainingMs / 1000);
        this.updateDisplay();
      }
    }, 250);

    this.updateControlsUI();
  }

  pauseTimer() {
    this.isRunning = false;
    this.stopInterval();
    document.body.classList.remove('timer-running');
    this.updateControlsUI();
  }

  resetTimer() {
    this.stopInterval();
    this.isRunning = false;
    document.body.classList.remove('timer-running');
    this.timeLeft = this.getDurationForMode(this.currentMode) * 60;
    this.totalDuration = this.timeLeft;
    this.updateControlsUI();
    this.updateDisplay();
  }

  skipSession() {
    if (confirm('Skip to the next study interval?')) {
      this.stopInterval();
      this.isRunning = false;
      document.body.classList.remove('timer-running');
      this.advanceToNextCycle(false);
    }
  }

  stopInterval() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  onTimerComplete() {
    this.stopInterval();
    this.isRunning = false;
    document.body.classList.remove('timer-running');

    // Play synthesized chime if sound is enabled
    if (this.state.settings.soundEnabled) {
      this.audio.playCompletionChime();
    }

    // Record session if completed in focus mode
    if (this.currentMode === 'focus') {
      const minutesSpent = this.state.settings.focusDuration;
      this.recordCompletedSession(minutesSpent);
    }

    // Advance session
    this.advanceToNextCycle(true);
  }

  recordCompletedSession(durationMinutes) {
    const todayStr = StorageManager.getTodayDateString();

    // Increment lifetime & today's count
    this.state.totalCompletedSessions += 1;
    this.state.dailyStats.completedSessionsToday += 1;
    this.state.dailyStats.focusMinutesToday += durationMinutes;

    // Update Streak calculation
    const lastActive = this.state.streak.lastActiveDate;
    if (!lastActive) {
      this.state.streak.count = 1;
      this.state.streak.lastActiveDate = todayStr;
    } else if (lastActive !== todayStr) {
      const lastDate = new Date(lastActive);
      const curDate = new Date(todayStr);
      const diffDays = Math.round((curDate - lastDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        this.state.streak.count += 1;
      } else if (diffDays > 1) {
        this.state.streak.count = 1;
      }
      this.state.streak.lastActiveDate = todayStr;
    }

    // Add to session history
    const historyItem = {
      id: 'ses_' + Date.now().toString(36),
      timestamp: new Date().toISOString(),
      mode: 'focus',
      duration: durationMinutes,
      task: this.state.currentTask || 'General University Study'
    };

    this.state.sessionHistory.unshift(historyItem);
    // Keep last 30 items
    if (this.state.sessionHistory.length > 30) {
      this.state.sessionHistory.pop();
    }

    StorageManager.save(this.state);
    this.renderMetrics();
    this.renderHistory();
  }

  advanceToNextCycle(wasCompletedNaturally = false) {
    const interval = this.state.settings.longBreakInterval || 4;

    if (this.currentMode === 'focus') {
      if (this.cycleCount >= interval) {
        // Time for long break!
        this.cycleCount = 1;
        this.setMode('long-break', true);
      } else {
        // Move to short break
        this.cycleCount += 1;
        this.setMode('short-break', true);
      }
    } else {
      // Coming back from any break -> back to focus
      this.setMode('focus', true);
    }

    // Check if auto-start is configured
    if (wasCompletedNaturally && this.state.settings.autoStartBreaks) {
      this.startTimer();
    }
  }

  updateDisplay() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    this.dom.timerDisplay.textContent = formatted;

    // Document Title Update
    const modeLabel = this.currentMode === 'focus' ? 'Focus' : 'Break';
    const statusIcon = this.isRunning ? '⏱️' : '⏸️';
    document.title = `${statusIcon} ${formatted} - ${modeLabel} • StudyPomodoro`;

    // SVG Circular Progress Ring Update
    const progress = this.totalDuration > 0 ? (this.totalDuration - this.timeLeft) / this.totalDuration : 0;
    const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);
    this.dom.timerProgressRing.style.strokeDashoffset = `${strokeDashoffset}`;
  }

  updateControlsUI() {
    if (this.isRunning) {
      this.dom.playPauseText.textContent = 'Pause';
      this.setIcon(this.dom.playPauseIconContainer, 'pause', 'w-6 h-6');
    } else {
      const modeLabel = this.currentMode === 'focus' ? 'Focus' : 'Break';
      this.dom.playPauseText.textContent = this.timeLeft < this.totalDuration ? 'Resume' : `Start ${modeLabel}`;
      this.setIcon(this.dom.playPauseIconContainer, 'play', 'w-6 h-6 fill-white');
    }
  }

  renderCycleIndicator() {
    const maxDots = this.state.settings.longBreakInterval || 4;
    this.dom.cycleDotsContainer.innerHTML = '';

    for (let i = 1; i <= maxDots; i++) {
      const dot = document.createElement('div');
      dot.className = `w-2.5 h-2.5 rounded-full transition-all duration-300 cycle-dot ${i <= this.cycleCount ? 'active' : 'bg-slate-700'}`;
      this.dom.cycleDotsContainer.appendChild(dot);
    }

    this.dom.cycleLabel.textContent = `Session ${this.cycleCount} of ${maxDots}`;
  }

  // --- Metrics & Stats Rendering ---
  renderMetrics() {
    this.dom.statTotalSessions.textContent = this.state.totalCompletedSessions;
    this.dom.statTodaySessions.textContent = this.state.dailyStats.completedSessionsToday;

    const goal = this.state.settings.dailyGoal || 8;
    this.dom.statTodayGoalTarget.textContent = `/ ${goal}`;

    const percent = Math.min(100, Math.round((this.state.dailyStats.completedSessionsToday / goal) * 100));
    this.dom.goalProgressBar.style.width = `${percent}%`;

    // Format minutes/hours
    const mins = this.state.dailyStats.focusMinutesToday;
    if (mins >= 60) {
      const hours = (mins / 60).toFixed(1);
      this.dom.statTodayTime.textContent = `${hours}h`;
    } else {
      this.dom.statTodayTime.textContent = `${mins}m`;
    }

    const streak = this.state.streak.count || 0;
    this.dom.statCurrentStreak.textContent = streak;
    this.dom.headerStreakBadge.textContent = `${streak} Day Streak`;
  }

  // --- History Rendering ---
  renderHistory() {
    const list = this.state.sessionHistory;
    this.dom.sessionHistoryList.innerHTML = '';

    if (!list || list.length === 0) {
      this.dom.sessionHistoryList.appendChild(this.dom.emptyHistoryNotice);
      this.dom.emptyHistoryNotice.classList.remove('hidden');
      return;
    }

    this.dom.emptyHistoryNotice.classList.add('hidden');

    list.slice(0, 15).forEach((item) => {
      const date = new Date(item.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5 hover:border-white/10 transition-colors text-xs';
      row.innerHTML = `
        <div class="flex items-center gap-2.5 min-w-0 pr-2">
          <div class="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <i data-lucide="check" class="w-3.5 h-3.5"></i>
          </div>
          <div class="min-w-0">
            <p class="font-medium text-slate-200 truncate">${this.escapeHTML(item.task)}</p>
            <p class="text-[10px] text-slate-400">${item.duration}m Focus Block</p>
          </div>
        </div>
        <span class="text-[11px] text-slate-400 shrink-0 font-mono">${timeStr}</span>
      `;
      this.dom.sessionHistoryList.appendChild(row);
    });

    this.refreshIcons();
  }

  escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  // --- Sound Icon State ---
  updateSoundIcon() {
    if (this.state.settings.soundEnabled) {
      this.setIcon(this.dom.soundIconContainer, 'volume-2', 'w-4 h-4');
      this.dom.btnToggleSound.classList.remove('opacity-50');
    } else {
      this.setIcon(this.dom.soundIconContainer, 'volume-x', 'w-4 h-4');
      this.dom.btnToggleSound.classList.add('opacity-50');
    }
  }

  // --- Presets (Standard vs University Deep Work) ---
  applyPreset(focus, shortBreak, longBreak) {
    this.state.settings.focusDuration = focus;
    this.state.settings.shortBreakDuration = shortBreak;
    this.state.settings.longBreakDuration = longBreak;
    StorageManager.save(this.state);
    this.syncSettingsInputs();
    this.resetTimer();
  }

  // --- Settings Modal ---
  openSettings() {
    this.syncSettingsInputs();
    this.dom.settingsModal.classList.add('active');
  }

  closeSettings() {
    this.dom.settingsModal.classList.remove('active');
  }

  syncSettingsInputs() {
    const s = this.state.settings;
    this.dom.inputFocusDuration.value = s.focusDuration;
    this.dom.valFocusDuration.textContent = `${s.focusDuration}m`;

    this.dom.inputShortDuration.value = s.shortBreakDuration;
    this.dom.valShortDuration.textContent = `${s.shortBreakDuration}m`;

    this.dom.inputLongDuration.value = s.longBreakDuration;
    this.dom.valLongDuration.textContent = `${s.longBreakDuration}m`;

    this.dom.inputDailyGoal.value = s.dailyGoal;
    this.dom.valDailyGoal.textContent = `${s.dailyGoal}`;

    this.dom.toggleAutoBreaks.checked = !!s.autoStartBreaks;
    this.dom.toggleSoundSettings.checked = !!s.soundEnabled;
  }

  saveSettings() {
    this.state.settings.focusDuration = parseInt(this.dom.inputFocusDuration.value, 10);
    this.state.settings.shortBreakDuration = parseInt(this.dom.inputShortDuration.value, 10);
    this.state.settings.longBreakDuration = parseInt(this.dom.inputLongDuration.value, 10);
    this.state.settings.dailyGoal = parseInt(this.dom.inputDailyGoal.value, 10);
    this.state.settings.autoStartBreaks = this.dom.toggleAutoBreaks.checked;
    this.state.settings.soundEnabled = this.dom.toggleSoundSettings.checked;

    StorageManager.save(this.state);
    this.updateSoundIcon();
    this.renderMetrics();
    this.resetTimer();
    this.closeSettings();
  }
}

// Instantiate on document ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new StudyPomodoroApp();
});
