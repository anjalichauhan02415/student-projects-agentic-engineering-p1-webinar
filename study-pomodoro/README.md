# 🎓 StudyPomodoro

> An interactive study clock and session tracker tailored for university students balancing coursework, problem sets, and exam revision.

---

## 🌟 Key Features

- **Circular SVG Progress Gauge**: Smooth, precision countdown ring with glowing ambient backdrops and dynamic color themes.
- **Active Study Objective**: Prominent task anchor bar with inline editing, auto-save to browser storage, and quick university study tags (*Problem Set*, *Exam Revision*, *Lecture Notes*, *Paper & Research*).
- **Study Modes & College Presets**:
  - **Focus Mode**: Default 25-minute deep work interval (Indigo/Violet theme).
  - **Short Break**: 5-minute rejuvenation break (Emerald theme).
  - **Long Break**: 15-minute relaxation break (Sky Cyan theme).
  - **Quick Presets**: Instant switching between **Standard (25/5)** and **University Deep Work (50/10)** blocks.
- **Zero-Dependency Audio Chime**: Native **Web Audio API** dual-harmonic sine-wave synthesizer providing soothing completion chimes without external MP3 files or broken links.
- **Persistent Analytics (`localStorage`)**:
  - All-time completed sessions counter.
  - Today's completed sessions with visual daily goal progress bar.
  - Recorded focus time today (automatically rolled over at midnight).
  - Study streak tracking.
  - Recent activity log of completed study intervals.
- **Customizable Settings Modal**: Adjust focus duration, break times, daily session goals, sound alerts, and auto-break transitions.
- **Drift-Free Background Timer**: Synchronizes with browser timestamps (`Date.now()`) to ensure accuracy even when the tab is in the background, updating the tab title in real-time (`⏱️ 24:50 - Focus • StudyPomodoro`).

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :---: | :--- |
| <kbd>Space</kbd> | Toggle Start / Pause timer |
| <kbd>R</kbd> or <kbd>Esc</kbd> | Reset current session countdown |
| <kbd>S</kbd> | Skip to next session / break cycle |
| <kbd>T</kbd> | Quick-focus the Active Objective input box |

---

## 🛠️ Technology Stack

- **Markup**: Pure HTML5 (Semantic elements, accessible landmarks)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) via CDN + Custom Vanilla CSS ([style.css](file:///c:/Users/sahaj/OneDrive/Documents/study-pomodoro/style.css)) for glassmorphism and glowing SVG animations
- **Iconography**: [Lucide Icons](https://lucide.dev/) via CDN
- **Logic**: Vanilla ES6+ JavaScript ([app.js](file:///c:/Users/sahaj/OneDrive/Documents/study-pomodoro/app.js))
- **Audio**: Web Audio API (Dual-oscillator sine chime)
- **Build Tools**: **None** — Zero npm, bundlers, or compilation steps required.

---

## 🚀 Running Locally

Because **StudyPomodoro** uses zero build tools, you can run it in any of the following ways:

### Option 1: Python Local Server (Recommended)
```bash
python -m http.server 3000
```
Then navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### Option 2: Open Directly
Double-click [index.html](file:///c:/Users/sahaj/OneDrive/Documents/study-pomodoro/index.html) or open it directly in any modern web browser (Chrome, Edge, Firefox, Safari).

---

## 📁 File Structure

```text
study-pomodoro/
├── index.html        # App layout, semantic structure, CDN script inclusions
├── style.css         # Glassmorphism, animations, and SVG progress circle styling
├── app.js            # Timer engine, storage manager, Web Audio synth, UI controller
└── README.md         # Documentation and project reference
```
