# EcoTrack 🌿 — Campus Carbon Footprint Calculator

A lightweight, zero-build single-page micro-application designed for university students to measure, understand, and reduce their daily carbon footprint across commuting, dorm energy, and dining habits.

---

## 🚀 Key Features

- **Zero-Build Architecture**: Runs natively in any modern browser without npm, node modules, or bundling tools (HTML5 + Tailwind CSS CDN + Lucide Icons + Vanilla ES6+).
- **Glassmorphic Cyber-Green Design**: Modern dark theme with ambient glowing radial orbs, backdrop blur filters (`backdrop-filter: blur(20px)`), and neon-green accents (`#00ff87`).
- **Interactive Calculation Engine**:
  - **Daily Commute (km)**: Computes transport emissions based on typical student transit mixes.
  - **Electricity Use (kWh)**: Analyzes dorm/apartment appliance, laptop, and climate control draw.
  - **Diet Type Dropdown**: Factors in dietary choices (`Vegan`, `Vegetarian`, `Meat-heavy`).
  - **Quick Student Presets**: One-click autofill for *Dorm Walker*, *Bus Commuter*, and *Car Commuter*.
- **Dynamic Feedback & Campus Insights**:
  - **Smooth Number Counter**: Cubic ease-out counter animation for calculated daily CO₂ kg.
  - **Emissions Breakdown Bar**: Visual proportional breakdown between transit, electricity, and food.
  - **Motivational Tiers**: Custom feedback cards based on student benchmarks:
    - 🌿 **Eco Champion** (< 6.0 kg/day): Exemplary low-impact dorm lifestyle.
    - 🌱 **Sustainable Scholar** (6.0 – 11.0 kg/day): Below average campus footprint.
    - ⚡ **Conscious Commuter** (11.1 – 17.0 kg/day): Average college student range.
    - 🚨 **High Impact Emitter** (> 17.0 kg/day): Significant carbon intensity with quick reduction tips.
  - **Targeted Actionable Tips**: Dynamically pinpoints your highest emission category and provides campus-specific recommendations.

---

## 💾 Local State Management

EcoTrack provides persistent offline state management utilizing the browser's native **`localStorage`** API.

### Storage Key
```javascript
const STORAGE_KEY = 'ecotrack_student_data';
```

### Stored Schema
```json
{
  "commute": 14.0,
  "electricity": 4.8,
  "diet": "vegetarian",
  "totalCO2": 8.32,
  "lastCalculated": "2026-10-20T12:30:00.000Z"
}
```

### State Lifecycle
1. **Load on Mount**: During `DOMContentLoaded`, `app.js` checks `localStorage.getItem(STORAGE_KEY)`. If present, inputs, badges, total score, and feedback cards are automatically restored without requiring re-calculation.
2. **Auto-Persist**: Whenever the user clicks **Calculate Footprint** or uses a preset, the validated parameters, computed score, and current timestamp are saved to `localStorage`.
3. **Friendly Timestamp**: The UI displays a human-readable `"Last saved: [Date] at [Time]"` indicator.
4. **Cache Reset**: A dedicated **Reset** button flushes the stored cache (`localStorage.removeItem(STORAGE_KEY)`) and restores the default state.

---

## 🧮 Emission Calculation Factors

Factors are adapted from IPCC and EPA university campus sustainability reporting averages:

| Category | Emission Factor | Notes |
| :--- | :--- | :--- |
| **Commute** | `0.18 kg CO₂ / km` | Blended average for public transit, campus shuttles, and passenger cars |
| **Electricity** | `0.42 kg CO₂ / kWh` | Regional electric grid generation average |
| **Diet (Vegan)** | `2.50 kg CO₂ / day` | Low-carbon plant-based nutrition |
| **Diet (Vegetarian)** | `3.80 kg CO₂ / day` | Balanced dairy, egg, and plant-based nutrition |
| **Diet (Meat-heavy)** | `7.20 kg CO₂ / day` | Daily red meat and poultry consumption |

**Formula:**
$$\text{Total Daily CO}_2 = (\text{Commute} \times 0.18) + (\text{Electricity} \times 0.42) + \text{Diet Factor}$$

$$\text{Annual Pace} = \text{Total Daily CO}_2 \times 365$$

---

## 📂 Project Structure

```text
carbon-tracker/
├── index.html       # Semantic HTML5 layout, Tailwind CSS CDN & Lucide Icons
├── style.css        # Glassmorphic styles, neon glow utilities, and ambient orb animations
├── app.js           # ES6+ calculation engine, tier logic, and LocalStorage sync
└── README.md        # Documentation and technical specifications
```

---

## 🖥️ Running Locally

Because EcoTrack uses standard web technologies with CDN assets, you can run it using any static server or directly open it:

### Option 1: Python HTTP Server (Recommended)
```bash
python -m http.server 8080
```
Open **`http://localhost:8080/index.html`** in your browser.

### Option 2: Direct File Open
Double click `index.html` or open it with your browser:
```text
file:///c:/Users/sahaj/OneDrive/Documents/carbon-tracker/index.html
```
