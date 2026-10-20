/**
 * Hackathon Countdown Hub — app.js
 * ─────────────────────────────────
 * Plain ES6+. No frameworks, no build tools.
 *
 * Execution order on DOMContentLoaded:
 *   1. loadEvents()         → read localStorage or seed 3 defaults
 *   2. renderAll()          → build cards / empty state in the DOM
 *   3. startTicker()        → setInterval every 1 000 ms
 *   4. bindModalListeners() → wire up open / close / submit
 */

'use strict';

/* ═══════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════ */

/** localStorage key for persisting events */
const LS_KEY = 'hackhub_events';

/** Countdown refresh rate in milliseconds */
const TICK_MS = 1000;

/** Display metadata keyed by category value */
const CATEGORY_META = {
  hackathon  : { emoji: '🛠️',  label: 'Hackathon'   },
  workshop   : { emoji: '📚', label: 'Workshop'    },
  meetup     : { emoji: '🤝', label: 'Meetup'      },
  competition: { emoji: '🏆', label: 'Competition' },
  other      : { emoji: '📌', label: 'Other'       },
};


/* ═══════════════════════════════════════════
   IN-MEMORY STATE
   Single source of truth for the event list.
═══════════════════════════════════════════ */

/** @type {Array<{id:string, title:string, date:string, location:string, category:string}>} */
let events = [];


/* ═══════════════════════════════════════════
   ── PHASE 3: DATA LAYER ──
═══════════════════════════════════════════ */

/**
 * loadEvents()
 * Reads the event array from localStorage["hackhub_events"].
 * If the key is absent (first visit) it delegates to seedDefaults()
 * which writes 3 mock events and returns them.
 *
 * @returns {Array} Parsed array of event objects.
 */
function loadEvents() {
  const raw = localStorage.getItem(LS_KEY);

  if (raw === null) {
    // No data yet — plant the default events and return them
    return seedDefaults();
  }

  try {
    return JSON.parse(raw) || [];
  } catch {
    // Corrupted JSON — reset to defaults rather than crashing
    console.warn('[HackHub] localStorage data was corrupted; resetting to defaults.');
    return seedDefaults();
  }
}

/**
 * seedDefaults()
 * Creates 3 mock events at +3, +10, and +30 days from now
 * so they never expire regardless of when the page is opened.
 * Sets event time to 09:00 local so the countdown is readable.
 *
 * @returns {Array} The freshly seeded event array.
 */
function seedDefaults() {
  /**
   * Helper: returns an ISO string offset by `days` days from today at 09:00.
   * @param {number} days
   * @returns {string}
   */
  function offsetISO(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }

  const defaults = [
    {
      id      : crypto.randomUUID(),
      title   : 'CodeStorm 2026',
      date    : offsetISO(20),
      location: 'Engineering Block 1, MMDU Mullana',
      category: 'hackathon',
    },
    {
      id      : crypto.randomUUID(),
      title   : 'Sillico Sapiens Workshop',
      date    : offsetISO(7),
      location: 'MMDU Campus',
      category: 'workshop',
    },
    {
      id      : crypto.randomUUID(),
      title   : 'Inter-College Coding Contest',
      date    : offsetISO(30),
      location: 'MMDU Mullana',
      category: 'competition',
    },
  ];

  saveEvents(defaults);
  return defaults;
}

/**
 * saveEvents(arr)
 * Serialises the event array and writes it to localStorage.
 * Called after every mutation (add / delete / seed).
 *
 * @param {Array} arr - Full event array to persist.
 */
function saveEvents(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
}


/* ═══════════════════════════════════════════
   ── PHASE 4: RENDER LAYER ──
═══════════════════════════════════════════ */

/**
 * renderAll()
 * Master render function. Clears the grid and re-builds it from
 * the in-memory `events` array, sorted soonest-first.
 * Also updates the header live-label count.
 */
function renderAll() {
  const grid = document.getElementById('events-grid');
  grid.innerHTML = '';

  // Update header event count
  updateLiveLabel();

  if (events.length === 0) {
    grid.appendChild(buildEmptyState());
    return;
  }

  // Sort ascending by event date (soonest first)
  const sorted = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));

  sorted.forEach((event, idx) => {
    const card = buildCard(event);
    // Stagger entrance animation so cards cascade in
    card.style.animationDelay = `${idx * 0.07}s`;
    grid.appendChild(card);
  });
}

/**
 * updateLiveLabel()
 * Refreshes the "N events • Live" indicator in the header.
 */
function updateLiveLabel() {
  const el    = document.getElementById('live-label');
  const count = events.length;
  el.textContent = count === 0
    ? 'No events'
    : `${count} event${count !== 1 ? 's' : ''} \u2022 Live`;
}

/**
 * buildCard(event)
 * Constructs and returns a complete <article> DOM node for one event.
 * Uses data-* attributes on the tile spans so the ticker can patch
 * them in-place without re-rendering the whole card.
 *
 * @param {{id, title, date, location, category}} event
 * @returns {HTMLElement}
 */
function buildCard(event) {
  const timeLeft  = new Date(event.date) - Date.now();
  const urgency   = getUrgencyConfig(timeLeft);
  const cd        = calcCountdown(timeLeft);
  const catMeta   = CATEGORY_META[event.category] ?? CATEGORY_META.other;
  const isExpired = timeLeft <= 0;

  /* ── Outer article ── */
  const article = document.createElement('article');
  article.className = `event-card relative flex flex-col gap-4 rounded-2xl border border-white/8 bg-gray-900/80 p-5 ${urgency.cardClass}`;
  article.dataset.eventId = event.id;

  /* ── Top row: badge + delete ── */
  const topRow = document.createElement('div');
  topRow.className = 'flex items-center justify-between gap-2';

  // Urgency badge
  const badge = document.createElement('span');
  badge.className  = `urgency-badge inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${urgency.badgeClass}`;
  badge.setAttribute('role', 'status');
  badge.setAttribute('aria-label', urgency.ariaLabel);
  badge.textContent = urgency.text;

  // Delete button
  const delBtn = document.createElement('button');
  delBtn.className = 'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-transparent text-xs font-bold text-gray-600 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400';
  delBtn.setAttribute('aria-label', `Delete event: ${event.title}`);
  delBtn.textContent = '✕';
  delBtn.addEventListener('click', () => deleteEvent(event.id));

  topRow.append(badge, delBtn);

  /* ── Title ── */
  const title = document.createElement('h2');
  title.className   = 'text-lg font-extrabold leading-snug text-white';
  title.textContent = event.title;

  /* ── Meta: location + category ── */
  const metaDiv = document.createElement('div');
  metaDiv.className = 'flex flex-col gap-1';

  if (event.location) {
    const loc = document.createElement('p');
    loc.className = 'flex items-center gap-1.5 text-xs font-medium text-gray-500';
    loc.innerHTML = `<span aria-hidden="true">📍</span><span>${escapeHtml(event.location)}</span>`;
    metaDiv.appendChild(loc);
  }

  const catPill = document.createElement('span');
  catPill.className   = 'mt-0.5 inline-flex w-fit items-center gap-1 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-indigo-300';
  catPill.textContent = `${catMeta.emoji} ${catMeta.label}`;
  metaDiv.appendChild(catPill);

  /* ── Countdown tiles or Event Started banner ── */
  const timerDiv = document.createElement('div');
  timerDiv.className = 'timer-container mt-auto';

  if (isExpired) {
    timerDiv.innerHTML = `
      <div class="event-started-box flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-center">
        <span class="text-base select-none" aria-hidden="true">🎉</span>
        <span class="font-bold text-sm tracking-wider uppercase text-gray-300">Event Started!</span>
      </div>
    `;
  } else {
    const gridDiv = document.createElement('div');
    gridDiv.className = 'grid grid-cols-4 gap-2';
    gridDiv.setAttribute('aria-live', 'polite');
    gridDiv.setAttribute('aria-label', `Time remaining for ${event.title}`);

    const units = [
      { key: 'days',  label: 'Days',  value: cd.days  },
      { key: 'hours', label: 'Hrs',   value: cd.hours },
      { key: 'mins',  label: 'Mins',  value: cd.mins  },
      { key: 'secs',  label: 'Secs',  value: cd.secs  },
    ];

    units.forEach(({ key, label, value }) => {
      const tile = document.createElement('div');
      tile.className = 'tile-box flex flex-col items-center justify-center rounded-xl border border-white/6 bg-white/3 py-2.5 px-1 gap-1';

      const valSpan = document.createElement('span');
      valSpan.className = 'tile-value font-mono text-2xl font-bold leading-none text-slate-200 tabular-nums';
      valSpan.dataset.eventId = event.id;
      valSpan.dataset.unit    = key;
      valSpan.textContent     = pad(value);

      const lblSpan = document.createElement('span');
      lblSpan.className   = 'text-[10px] font-bold uppercase tracking-widest text-gray-600';
      lblSpan.textContent = label;

      tile.append(valSpan, lblSpan);
      gridDiv.appendChild(tile);
    });

    timerDiv.appendChild(gridDiv);
  }

  /* ── Assemble ── */
  article.append(topRow, title, metaDiv, timerDiv);
  return article;
}

/**
 * buildEmptyState()
 * Returns the friendly empty-state node shown when there are no events.
 *
 * @returns {HTMLElement}
 */
function buildEmptyState() {
  const wrapper = document.createElement('div');
  // Span all grid columns
  wrapper.className = 'col-span-full flex flex-col items-center justify-center py-24 gap-5 text-center';
  wrapper.innerHTML = `
    <div class="text-6xl select-none" aria-hidden="true" style="filter:grayscale(0.2)">🎯</div>
    <p class="empty-state-title text-xl font-black text-gray-700 tracking-tight">No events yet!</p>
    <p class="empty-state-text max-w-xs text-sm text-gray-700 leading-relaxed">
      Click <strong class="font-bold text-indigo-400">+ Add Event</strong> to create your first
      live countdown and never miss a hackathon again.
    </p>
  `;
  return wrapper;
}

/**
 * getUrgencyConfig(ms)
 * Maps the milliseconds-remaining to a badge text, CSS classes,
 * and card border glow variant.
 *
 * Rules:
 *   • ≤ 0         → grey "Event Started!"
 *   • < 24 hours  → red  🔴 "Ending Soon!" with subtle pulse
 *   • < 7 days    → amber 🟡 "This Week"
 *   • ≥ 7 days    → green 🟢 "Upcoming"
 *
 * @param {number} ms - Milliseconds until the event.
 * @returns {{text, badgeClass, cardClass, ariaLabel}}
 */
function getUrgencyConfig(ms) {
  const HOUR = 60 * 60 * 1000;
  const DAY  = 24 * HOUR;

  if (ms <= 0) {
    return {
      text      : '🎉 Event Started!',
      badgeClass: 'bg-slate-700/50 text-slate-300 border border-slate-600/40',
      cardClass : 'card-expired',
      ariaLabel : 'This event has already started',
    };
  }
  if (ms < DAY) {
    return {
      text      : '🔴 Ending Soon!',
      badgeClass: 'bg-red-500/15 text-red-300 border border-red-500/30 badge-urgent-pulse',
      cardClass : 'border-red-500/20 shadow-red-900/20',
      ariaLabel : 'Ending within 24 hours',
    };
  }
  if (ms < 7 * DAY) {
    return {
      text      : '🟡 This Week',
      badgeClass: 'bg-amber-400/12 text-amber-300 border border-amber-400/28',
      cardClass : 'border-amber-500/15',
      ariaLabel : 'Happening this week',
    };
  }
  return {
    text      : '🟢 Upcoming',
    badgeClass: 'bg-emerald-500/12 text-emerald-300 border border-emerald-500/25',
    cardClass : 'border-emerald-500/10',
    ariaLabel : 'Upcoming event',
  };
}


/* ═══════════════════════════════════════════
   ── PHASE 5: COUNTDOWN TICKER ──
═══════════════════════════════════════════ */

/**
 * calcCountdown(ms)
 * Breaks a millisecond duration into { days, hours, mins, secs }.
 * Returns all zeros for negative input (expired events).
 *
 * @param {number} ms
 * @returns {{days:number, hours:number, mins:number, secs:number}}
 */
function calcCountdown(ms) {
  if (ms <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 };

  const totalSecs  = Math.floor(ms / 1000);
  const secs       = totalSecs % 60;
  const totalMins  = Math.floor(totalSecs / 60);
  const mins       = totalMins % 60;
  const totalHours = Math.floor(totalMins / 60);
  const hours      = totalHours % 24;
  const days       = Math.floor(totalHours / 24);

  return { days, hours, mins, secs };
}

/**
 * updateCountdowns()
 * Called every TICK_MS milliseconds by setInterval.
 * Patches ONLY the changed tile-value spans in the DOM —
 * does NOT re-render cards, keeping DOM thrashing minimal.
 * Also refreshes the wall clock in the top-right.
 */
function updateCountdowns() {
  const now = Date.now();

  // Refresh wall clock display
  const clockEl = document.getElementById('wall-clock');
  if (clockEl) {
    clockEl.textContent = new Date().toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  events.forEach(event => {
    const timeLeft  = new Date(event.date) - now;
    const isExpired = timeLeft <= 0;
    const card      = document.querySelector(`article[data-event-id="${event.id}"]`);

    if (isExpired) {
      if (card && !card.classList.contains('card-expired')) {
        card.classList.add('card-expired');
        const timerContainer = card.querySelector('.timer-container');
        if (timerContainer) {
          timerContainer.innerHTML = `
            <div class="event-started-box flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 px-4 text-center">
              <span class="text-base select-none" aria-hidden="true">🎉</span>
              <span class="font-bold text-sm tracking-wider uppercase text-gray-300">Event Started!</span>
            </div>
          `;
        }
      }
    } else {
      const cd = calcCountdown(timeLeft);

      // Iterate over the four unit spans for this event
      ['days', 'hours', 'mins', 'secs'].forEach(unit => {
        const span = document.querySelector(
          `[data-event-id="${event.id}"][data-unit="${unit}"]`
        );
        if (!span) return;

        const newVal = pad(cd[unit]);

        // Only update the DOM and fire the animation when the value actually changed
        if (span.textContent !== newVal) {
          span.textContent = newVal;

          // Trigger tick-pulse: remove → force reflow → re-add
          span.classList.remove('ticked');
          void span.offsetWidth; // reflow
          span.classList.add('ticked');
        }
      });
    }

    // Live-update the urgency badge if the threshold has been crossed
    // (e.g., an event just entered the "< 7 days" window)
    const badgeEl = card?.querySelector('.urgency-badge');
    if (badgeEl) {
      const urgency = getUrgencyConfig(timeLeft);
      if (badgeEl.textContent.trim() !== urgency.text) {
        badgeEl.textContent = urgency.text;
        badgeEl.className   = `urgency-badge inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${urgency.badgeClass}`;
      }
    }
  });
}

/**
 * startTicker()
 * Fires an immediate first tick, then schedules recurring updates.
 */
function startTicker() {
  updateCountdowns();                       // paint immediately
  setInterval(updateCountdowns, TICK_MS);   // then every second
}


/* ═══════════════════════════════════════════
   ── PHASE 6: MODAL ──
═══════════════════════════════════════════ */

/**
 * openModal()
 * Opens the native <dialog> and sets the datetime-local min
 * attribute to right now, greying out past times in the picker.
 */
function openModal() {
  const modal     = document.getElementById('add-event-modal');
  const dateField = document.getElementById('field-date');

  // Build a local-timezone-aware "YYYY-MM-DDTHH:mm" string for the min attribute
  const now      = new Date();
  const localISO = new Date(now - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
  dateField.min = localISO;

  clearError();
  modal.showModal();
}

/**
 * closeModal()
 * Closes the dialog and resets the form to blank.
 */
function closeModal() {
  document.getElementById('add-event-modal').close();
  document.getElementById('add-event-form').reset();
  clearError();
}

/**
 * showError(msg)
 * Displays an inline validation error inside the modal form.
 *
 * @param {string} msg - Human-readable error message.
 */
function showError(msg) {
  const el = document.getElementById('form-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

/**
 * clearError()
 * Hides the inline validation error.
 */
function clearError() {
  const el = document.getElementById('form-error');
  el.textContent = '';
  el.classList.add('hidden');
}

/**
 * handleFormSubmit(e)
 * Validates the form, builds a new event object, appends it to
 * the in-memory array, persists to localStorage, re-renders the
 * grid, and closes the modal.
 *
 * Validation rules:
 *   1. Title is required and cannot be empty.
 *   2. Date is required and must be strictly in the future.
 *
 * @param {Event} e - The form's submit event.
 */
function handleFormSubmit(e) {
  e.preventDefault();
  clearError();

  const title    = document.getElementById('field-title').value.trim();
  const dateVal  = document.getElementById('field-date').value;
  const location = document.getElementById('field-location').value.trim();
  const category = document.getElementById('field-category').value;

  // Rule 1: title required
  if (!title) {
    showError('Please enter an event title.');
    document.getElementById('field-title').focus();
    return;
  }

  // Rule 2: date required
  if (!dateVal) {
    showError('Please choose a date and time for the event.');
    document.getElementById('field-date').focus();
    return;
  }

  const eventDate = new Date(dateVal);

  // Rule 2b: date must be parseable
  if (isNaN(eventDate.getTime())) {
    showError('The date you entered is not valid. Please try again.');
    document.getElementById('field-date').focus();
    return;
  }

  // Rule 2c: date must be in the future
  if (eventDate <= new Date()) {
    showError('The event date must be in the future. Please pick a later time.');
    document.getElementById('field-date').focus();
    return;
  }

  // Build the event object matching the schema
  /** @type {{id:string, title:string, date:string, location:string, category:string}} */
  const newEvent = {
    id      : crypto.randomUUID(),
    title,
    date    : eventDate.toISOString(),
    location,
    category,
  };

  // Append → persist → re-render → close
  events.push(newEvent);
  saveEvents(events);
  renderAll();
  closeModal();
}

/**
 * bindModalListeners()
 * Attaches all event listeners related to the Add Event modal.
 * Called once on boot.
 */
function bindModalListeners() {
  const modal     = document.getElementById('add-event-modal');
  const form      = document.getElementById('add-event-form');
  const btnOpen   = document.getElementById('btn-open-modal');
  const btnClose  = document.getElementById('btn-close-modal');
  const btnCancel = document.getElementById('btn-cancel-modal');

  btnOpen.addEventListener('click', openModal);
  btnClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);

  // Close on backdrop click (user clicks outside the dialog box)
  modal.addEventListener('click', (e) => {
    const rect     = modal.getBoundingClientRect();
    const outside  =
      e.clientX < rect.left  || e.clientX > rect.right ||
      e.clientY < rect.top   || e.clientY > rect.bottom;
    if (outside) closeModal();
  });

  // Escape key: native dialog fires 'cancel'; ensure form resets
  modal.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeModal();
  });

  form.addEventListener('submit', handleFormSubmit);
}


/* ═══════════════════════════════════════════
   ── PHASE 7: DELETE ──
═══════════════════════════════════════════ */

/**
 * deleteEvent(id)
 * Removes the event with the given id from the in-memory array,
 * saves the updated array, and re-renders the grid.
 *
 * @param {string} id - The event's UUID.
 */
function deleteEvent(id) {
  events = events.filter(ev => ev.id !== id);
  saveEvents(events);
  renderAll();
}


/* ═══════════════════════════════════════════
   UTILITY HELPERS
═══════════════════════════════════════════ */

/**
 * pad(n)
 * Zero-pads a number to at least 2 digits.
 * e.g. 5 → "05", 123 → "123"
 *
 * @param {number} n
 * @returns {string}
 */
function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * escapeHtml(str)
 * Sanitises user-supplied text before inserting it via innerHTML.
 * Only used for the location field.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g, '&#039;');
}


/* ═══════════════════════════════════════════
   THEME (DARK / LIGHT)
═══════════════════════════════════════════ */

/** localStorage key for persisting dark/light theme */
const THEME_LS_KEY = 'hackhub_theme';

/**
 * getPreferredTheme()
 * Reads 'hackhub_theme' from localStorage, defaulting to 'dark'.
 *
 * @returns {'dark'|'light'}
 */
function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_LS_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return 'dark';
}

/**
 * applyTheme(theme)
 * Synchronises DOM classes and theme toggle button attributes.
 *
 * @param {'dark'|'light'} theme
 */
function applyTheme(theme) {
  const root    = document.documentElement;
  const isLight = theme === 'light';

  root.classList.toggle('light', isLight);
  root.classList.toggle('dark', !isLight);

  const icon = document.getElementById('theme-toggle-icon');
  const btn  = document.getElementById('btn-theme-toggle');
  if (icon && btn) {
    icon.textContent = isLight ? '🌙' : '☀️';
    const label = isLight ? 'Switch to dark mode' : 'Switch to light mode';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  }
}

/**
 * toggleTheme()
 * Toggles theme between dark and light, saving to localStorage.
 */
function toggleTheme() {
  const current = document.documentElement.classList.contains('light') ? 'light' : 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  localStorage.setItem(THEME_LS_KEY, next);
  applyTheme(next);
}

/**
 * initTheme()
 * Initializes the saved or default theme and attaches click handler.
 */
function initTheme() {
  applyTheme(getPreferredTheme());
  const btn = document.getElementById('btn-theme-toggle');
  if (btn) {
    btn.addEventListener('click', toggleTheme);
  }
}


/* ═══════════════════════════════════════════
   BOOT
═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();                // 0. apply light/dark theme preference
  events = loadEvents();      // 1. read or seed
  renderAll();                // 2. paint grid
  startTicker();              // 3. start 1-second interval
  bindModalListeners();       // 4. wire up modal
});
