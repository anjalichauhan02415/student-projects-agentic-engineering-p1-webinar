# 🚀 Hackathon Countdown Hub

Live ticking countdown clocks for upcoming college events: hackathons, workshops and competitions. Built in a single afternoon with an agentic workflow in **Google Antigravity** (Plan → Execute → Browser Verify → Polish) for the Sillico Sapiens Technical Club.

**Live demo:** https://lovepanchalhere.github.io/hackathon-countdown-hub/

## Features

- Live Days / Hours / Mins / Secs counters that update every second
- Urgency badges: red (under 24 hours), amber (under 7 days), green (later)
- "Add Event" modal with validation (title required, date must be in the future)
- Delete events, with the nearest event always shown first
- "Event Started!" state for events whose time has passed
- Friendly empty-state message when there are no events
- Dark / Light theme toggle that remembers your choice
- Responsive layout (single column on mobile)
- All data saved in the browser with `localStorage`. No backend, no API keys.

## Tech Stack

| Layer | Choice |
|---|---|
| Structure | HTML5 (`index.html`) |
| Styling | Tailwind CSS via CDN + custom animations (`style.css`) |
| Logic | Vanilla ES6+ JavaScript (`app.js`) |
| Storage | Browser `localStorage` |
| Build tools | None (no npm, no bundlers) |

 ## Project Structure
hackathon-countdown-hub/
├── index.html   # layout, header, event grid, Add Event modal
├── style.css    # modal transitions, card hover, badge pulse
├── app.js       # state, countdown ticker, validation, localStorage
└── README.md
## Data Schema
Each event is stored as an object:
{
  id: "string",          // unique id
  title: "string",       // event name
  date: "ISO string",    // e.g. "2026-11-08T10:00:00"
  location: "string",
  category: "hackathon | workshop | competition"
}
## localStorage keys
Key
Value
hackhub_events
JSON array of event objects
hackhub_theme
"dark" or "light"
## Architecture
loadEvents() reads hackhub_events. If it is empty, seedDefaults() adds 3 starter events with dates relative to today.
renderAll() builds one card per event, sorted by soonest date.
startTicker() runs setInterval every second and calls updateCountdowns() to refresh each counter and its urgency badge.
handleFormSubmit() validates the form, saves via saveEvents(), then re-renders.
## Run Locally
python3 -m http.server 8000
Then open http://localhost:8000. To reset the data, run localStorage.clear() in the browser console and reload.
## How It Was Verified
Browser test: counters tick, modal opens, event added, persists after reload
Validation: empty title and past dates are blocked
Empty state shown after deleting all events
node --check app.js passes
Zero red errors in the DevTools console
### Bug found and fixed during testing
An automated sanity script reported "all checks passed", but the app was blank. The browser console showed Uncaught SyntaxError: Identifier 'card' has already been declared in app.js, which stopped the whole script from running. A duplicate variable was renamed. Lesson: string-matching tests do not prove an app works, so always verify in a real browser.
## Author
Love Panchal (@lovepanchalhere). B.Tech CSE (AI & ML), MMDU.
## License
MIT
