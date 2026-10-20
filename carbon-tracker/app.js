/**
 * EcoTrack — Carbon Footprint Calculator for University Students
 * Clean vanilla ES6+ architecture with LocalStorage persistence and dynamic feedback.
 */

// Constant Emission Factors (kg CO2 per unit)
const EMISSION_FACTORS = {
  COMMUTE_PER_KM: 0.18, // Average commuter mix (bus, scooter, light passenger car)
  ELECTRICITY_PER_KWH: 0.42, // Regional grid average
  DIET: {
    vegan: 2.5, // Plant-based diet
    vegetarian: 3.8, // Dairy/egg vegetarian
    'meat-heavy': 7.2, // High meat consumption
  },
  CAMPUS_AVERAGE_DAILY: 12.5, // University student baseline daily average in kg
};

const STORAGE_KEY = 'ecotrack_student_data';

// Preset configurations for quick student testing
const PRESETS = {
  dorm: { commute: 1.5, electricity: 3.2, diet: 'vegetarian' },
  commuter: { commute: 14.0, electricity: 4.8, diet: 'vegetarian' },
  driver: { commute: 28.0, electricity: 7.5, diet: 'meat-heavy' },
};

// State representation
let state = {
  commute: 0,
  electricity: 0,
  diet: 'vegetarian',
  totalCO2: 0,
  lastCalculated: null,
};

// DOM Elements
const form = document.getElementById('footprint-form');
const commuteInput = document.getElementById('commute-input');
const electricityInput = document.getElementById('electricity-input');
const dietSelect = document.getElementById('diet-select');
const calculateBtn = document.getElementById('calculate-btn');
const resetBtn = document.getElementById('reset-history-btn');

// Badges
const commuteBadge = document.getElementById('commute-badge');
const electricityBadge = document.getElementById('electricity-badge');
const dietBadge = document.getElementById('diet-badge');
const lastSavedTimeEl = document.getElementById('last-saved-time');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

// Results & Feedback Elements
const co2ValueEl = document.getElementById('co2-value');
const statusBadge = document.getElementById('status-badge');
const annualPaceEl = document.getElementById('annual-pace');
const barCommute = document.getElementById('bar-commute');
const barElectricity = document.getElementById('bar-electricity');
const barDiet = document.getElementById('bar-diet');
const pctCommute = document.getElementById('pct-commute');
const pctElectricity = document.getElementById('pct-electricity');
const pctDiet = document.getElementById('pct-diet');

const feedbackContainer = document.getElementById('feedback-container');
const feedbackIcon = document.getElementById('feedback-icon');
const feedbackIconBox = document.getElementById('feedback-icon-box');
const feedbackTier = document.getElementById('feedback-tier');
const feedbackComparison = document.getElementById('feedback-comparison');
const feedbackHeadline = document.getElementById('feedback-headline');
const feedbackText = document.getElementById('feedback-text');
const tipContent = document.getElementById('tip-content');

/**
 * Initialize Lucide icons helper
 */
function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/**
 * Format date for friendly human reading
 */
function formatDate(isoString) {
  if (!isoString) return 'No prior calculation saved';
  try {
    const d = new Date(isoString);
    return `Last saved: ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  } catch (e) {
    return 'Saved in local storage';
  }
}

/**
 * Animate numeric counter smoothly
 */
function animateCounter(element, start, end, duration = 650) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    // Ease-out cubic formula
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentVal = (start + (end - start) * easeProgress).toFixed(1);
    element.textContent = currentVal;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      element.textContent = end.toFixed(1);
    }
  };
  window.requestAnimationFrame(step);
}

/**
 * Compute emissions breakdown & total
 */
function calculateEmissions(commute, electricity, diet) {
  const commuteCO2 = Math.max(0, commute) * EMISSION_FACTORS.COMMUTE_PER_KM;
  const electricityCO2 = Math.max(0, electricity) * EMISSION_FACTORS.ELECTRICITY_PER_KWH;
  const dietCO2 = EMISSION_FACTORS.DIET[diet] || EMISSION_FACTORS.DIET.vegetarian;

  const total = commuteCO2 + electricityCO2 + dietCO2;

  const commutePct = total > 0 ? Math.round((commuteCO2 / total) * 100) : 0;
  const electricityPct = total > 0 ? Math.round((electricityCO2 / total) * 100) : 0;
  const dietPct = total > 0 ? Math.max(0, 100 - commutePct - electricityPct) : 0;

  return {
    total: parseFloat(total.toFixed(2)),
    commuteCO2: parseFloat(commuteCO2.toFixed(2)),
    electricityCO2: parseFloat(electricityCO2.toFixed(2)),
    dietCO2: parseFloat(dietCO2.toFixed(2)),
    commutePct,
    electricityPct,
    dietPct,
    annualKg: Math.round(total * 365),
  };
}

/**
 * Determine dynamic tier, feedback copy and campus tips based on score
 */
function getFeedbackProfile(totalCO2, breakdown) {
  const diffFromAvg = (totalCO2 - EMISSION_FACTORS.CAMPUS_AVERAGE_DAILY).toFixed(1);
  const diffPct = Math.abs(Math.round(((totalCO2 - EMISSION_FACTORS.CAMPUS_AVERAGE_DAILY) / EMISSION_FACTORS.CAMPUS_AVERAGE_DAILY) * 100));

  // Determine biggest emission source for targeted actionable tip
  let prioritySource = 'diet';
  if (breakdown.commuteCO2 >= breakdown.electricityCO2 && breakdown.commuteCO2 >= breakdown.dietCO2) {
    prioritySource = 'commute';
  } else if (breakdown.electricityCO2 >= breakdown.commuteCO2 && breakdown.electricityCO2 >= breakdown.dietCO2) {
    prioritySource = 'electricity';
  }

  const campusTips = {
    commute: 'Your transit is your largest footprint factor. Try combining campus bus routes, utilizing campus bike-shares, or grouping grocery runs with roommates.',
    electricity: 'Power consumption is your primary driver. Unplug gaming consoles when studying, switch dorm desk lamps to warm LEDs, and defrost dorm mini-fridges regularly.',
    diet: 'Dining choices form the bulk of your emissions. Swapping 2 meat meals per week for campus salad bars or grain bowls saves ~210 kg CO₂ each semester.',
  };

  if (totalCO2 < 6.0) {
    return {
      tierClass: 'tier-hero',
      statusText: 'Eco Champion',
      badgeClass: 'bg-emerald-500/10 text-neon-accent border-emerald-500/30',
      icon: 'sparkles',
      iconBoxClass: 'bg-emerald-500/10 border-emerald-500/30 text-neon-accent',
      tierTitle: 'Eco Champion 🌿',
      comparison: `${diffPct}% below campus average`,
      headline: 'Outstanding! Exceptional Low-Impact Living',
      text: `Your daily carbon footprint of ${totalCO2} kg CO₂ is well below typical student life. You are leading the charge towards a zero-carbon campus. Keep encouraging peers in your dorm!`,
      tip: campusTips[prioritySource],
    };
  } else if (totalCO2 <= 11.0) {
    return {
      tierClass: 'tier-good',
      statusText: 'Sustainable Scholar',
      badgeClass: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
      icon: 'award',
      iconBoxClass: 'bg-teal-500/10 border-teal-500/30 text-teal-300',
      tierTitle: 'Sustainable Scholar 🌱',
      comparison: `${diffPct}% below campus average`,
      headline: 'Great Balance! Low Student Emissions',
      text: `At ${totalCO2} kg CO₂/day, you're tracking substantially cleaner than the average undergraduate. A few conscious campus micro-habits could bring you down to Eco Champion status!`,
      tip: campusTips[prioritySource],
    };
  } else if (totalCO2 <= 17.0) {
    return {
      tierClass: 'tier-moderate',
      statusText: 'Campus Average',
      badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      icon: 'compass',
      iconBoxClass: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
      tierTitle: 'Conscious Commuter ⚡',
      comparison: totalCO2 > EMISSION_FACTORS.CAMPUS_AVERAGE_DAILY ? `+${diffFromAvg} kg vs campus baseline` : `${diffPct}% of campus baseline`,
      headline: 'Average Student Footprint — High Potential',
      text: `Your footprint of ${totalCO2} kg CO₂/day reflects typical active college life. Targeting your highest contributing category (${prioritySource}) will easily shave off 3–5 kg daily.`,
      tip: campusTips[prioritySource],
    };
  } else {
    return {
      tierClass: 'tier-heavy',
      statusText: 'High Footprint',
      badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      icon: 'alert-triangle',
      iconBoxClass: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      tierTitle: 'High Impact Emitter 🚨',
      comparison: `+${diffFromAvg} kg above average`,
      headline: 'Heavy Carbon Footprint Detected',
      text: `At ${totalCO2} kg CO₂/day (${(totalCO2 * 365).toLocaleString()} kg/year), your current lifestyle places high strain on environmental resources. Simple lifestyle tweaks will make an immediate positive difference.`,
      tip: campusTips[prioritySource],
    };
  }
}

/**
 * Update UI with calculation results
 */
function renderResults(emissions, animate = true) {
  const currentDisplayed = parseFloat(co2ValueEl.textContent) || 0;
  
  if (animate) {
    animateCounter(co2ValueEl, currentDisplayed, emissions.total);
  } else {
    co2ValueEl.textContent = emissions.total.toFixed(1);
  }

  // Update annual pace
  annualPaceEl.textContent = `${emissions.annualKg.toLocaleString()} kg / yr`;

  // Update breakdown bars
  barCommute.style.width = `${emissions.commutePct}%`;
  barElectricity.style.width = `${emissions.electricityPct}%`;
  barDiet.style.width = `${emissions.dietPct}%`;

  pctCommute.textContent = `${emissions.commutePct}%`;
  pctElectricity.textContent = `${emissions.electricityPct}%`;
  pctDiet.textContent = `${emissions.dietPct}%`;

  // Feedback configuration
  const feedback = getFeedbackProfile(emissions.total, emissions);

  // Status badge update
  statusBadge.className = `px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase flex items-center gap-1 ${feedback.badgeClass}`;
  statusBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-current animate-ping"></span><span>${feedback.statusText}</span>`;

  // Remove previous tier classes on feedback container
  feedbackContainer.classList.remove('tier-hero', 'tier-good', 'tier-moderate', 'tier-heavy');
  feedbackContainer.classList.add(feedback.tierClass);

  // Update feedback contents
  feedbackTier.textContent = feedback.tierTitle;
  feedbackComparison.textContent = feedback.comparison;
  feedbackHeadline.textContent = feedback.headline;
  feedbackText.textContent = feedback.text;
  tipContent.textContent = feedback.tip;

  // Update Icon Box
  feedbackIconBox.className = `w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-neon-sm ${feedback.iconBoxClass}`;
  feedbackIcon.setAttribute('data-lucide', feedback.icon);

  refreshIcons();
}

/**
 * Save current state to browser LocalStorage
 */
function persistToStorage() {
  try {
    const payload = {
      commute: state.commute,
      electricity: state.electricity,
      diet: state.diet,
      totalCO2: state.totalCO2,
      lastCalculated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    lastSavedTimeEl.textContent = formatDate(payload.lastCalculated);
  } catch (err) {
    console.warn('LocalStorage is unavailable or full:', err);
  }
}

/**
 * Load saved state from LocalStorage
 */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.totalCO2 === 'number') {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse stored EcoTrack state:', err);
  }
  return null;
}

/**
 * Live input badge updater
 */
function updateInputBadges() {
  const commVal = parseFloat(commuteInput.value);
  commuteBadge.textContent = !isNaN(commVal) && commVal >= 0 ? `${commVal.toFixed(1)} km` : '0.0 km';

  const elecVal = parseFloat(electricityInput.value);
  electricityBadge.textContent = !isNaN(elecVal) && elecVal >= 0 ? `${elecVal.toFixed(1)} kWh` : '0.0 kWh';

  const dietMap = {
    vegan: 'Vegan',
    vegetarian: 'Vegetarian',
    'meat-heavy': 'Meat-heavy',
  };
  dietBadge.textContent = dietMap[dietSelect.value] || 'Vegetarian';
}

/**
 * Handle form submission
 */
function handleSubmit(e) {
  if (e) e.preventDefault();

  const commuteVal = parseFloat(commuteInput.value);
  const electricityVal = parseFloat(electricityInput.value);
  const dietVal = dietSelect.value;

  // Validation
  if (isNaN(commuteVal) || commuteVal < 0 || isNaN(electricityVal) || electricityVal < 0) {
    errorMessage.classList.remove('hidden');
    errorText.textContent = 'Please enter valid non-negative numbers for commute distance and electricity.';
    return;
  }

  errorMessage.classList.add('hidden');

  // Update State
  state.commute = commuteVal;
  state.electricity = electricityVal;
  state.diet = dietVal;

  const emissions = calculateEmissions(state.commute, state.electricity, state.diet);
  state.totalCO2 = emissions.total;
  state.lastCalculated = new Date().toISOString();

  // Render & Persist
  renderResults(emissions, true);
  persistToStorage();

  // Button micro-interaction
  calculateBtn.classList.add('scale-[0.98]');
  setTimeout(() => calculateBtn.classList.remove('scale-[0.98]'), 150);
}

/**
 * Reset calculation and clear LocalStorage
 */
function handleReset() {
  localStorage.removeItem(STORAGE_KEY);
  commuteInput.value = '';
  electricityInput.value = '';
  dietSelect.value = 'vegetarian';
  updateInputBadges();

  state = {
    commute: 0,
    electricity: 0,
    diet: 'vegetarian',
    totalCO2: 0,
    lastCalculated: null,
  };

  co2ValueEl.textContent = '0.0';
  annualPaceEl.textContent = '0 kg / yr';
  barCommute.style.width = '33%';
  barElectricity.style.width = '33%';
  barDiet.style.width = '34%';
  pctCommute.textContent = '0%';
  pctElectricity.textContent = '0%';
  pctDiet.textContent = '0%';

  statusBadge.className = 'px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-500/10 text-neon-accent border border-emerald-500/30 flex items-center gap-1';
  statusBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-neon-accent animate-ping"></span><span>Ready</span>';

  feedbackContainer.classList.remove('tier-hero', 'tier-good', 'tier-moderate', 'tier-heavy');
  feedbackTier.textContent = 'Ready To Calculate';
  feedbackComparison.textContent = 'vs Campus Avg';
  feedbackHeadline.textContent = 'Awaiting your input';
  feedbackText.textContent = 'Fill in your daily travel distance, dorm or apartment electric consumption, and typical diet to compute your carbon footprint and unlock customized campus sustainability tips.';
  tipContent.textContent = 'Switching one daily vehicle commute to a bicycle or campus shuttle reduces yearly emissions by up to 450 kg CO₂.';
  
  feedbackIconBox.className = 'w-12 h-12 rounded-2xl bg-neon-accent/10 border border-neon-accent/30 text-neon-accent flex items-center justify-center shrink-0 shadow-neon-sm';
  feedbackIcon.setAttribute('data-lucide', 'award');
  lastSavedTimeEl.textContent = 'No prior calculation saved';

  refreshIcons();
}

/**
 * Handle presets buttons
 */
function handlePresetClick(e) {
  const btn = e.target.closest('[data-preset]');
  if (!btn) return;
  const presetKey = btn.dataset.preset;
  const preset = PRESETS[presetKey];
  if (!preset) return;

  commuteInput.value = preset.commute;
  electricityInput.value = preset.electricity;
  dietSelect.value = preset.diet;
  updateInputBadges();
  handleSubmit();
}

/**
 * App Bootstrapping
 */
function init() {
  refreshIcons();

  // Attach event listeners
  form.addEventListener('submit', handleSubmit);
  commuteInput.addEventListener('input', updateInputBadges);
  electricityInput.addEventListener('input', updateInputBadges);
  dietSelect.addEventListener('change', updateInputBadges);
  if (resetBtn) resetBtn.addEventListener('click', handleReset);

  document.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', handlePresetClick);
  });

  // Restore stored session if exists
  const savedData = loadFromStorage();
  if (savedData) {
    commuteInput.value = savedData.commute;
    electricityInput.value = savedData.electricity;
    dietSelect.value = savedData.diet || 'vegetarian';
    updateInputBadges();

    state.commute = savedData.commute;
    state.electricity = savedData.electricity;
    state.diet = savedData.diet || 'vegetarian';
    state.totalCO2 = savedData.totalCO2;
    state.lastCalculated = savedData.lastCalculated;

    lastSavedTimeEl.textContent = formatDate(savedData.lastCalculated);
    const emissions = calculateEmissions(state.commute, state.electricity, state.diet);
    renderResults(emissions, false);
  } else {
    // Sensible initial defaults for first visit
    commuteInput.value = '5.0';
    electricityInput.value = '3.5';
    dietSelect.value = 'vegetarian';
    updateInputBadges();
  }
}

// Fire on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
