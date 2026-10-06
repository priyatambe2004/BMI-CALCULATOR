const $ = (id) => document.getElementById(id);

const form = $("bmi-form");
const heightCm = $("height-cm"), heightFt = $("height-ft"), heightIn = $("height-in"), weightInput = $("weight");
const errorEl = $("error"), resultEl = $("result");
const historyList = $("history-list"), historyEmpty = $("history-empty");

let unit = "metric";
let history = [];


function parsePositive(text) {
  const t = text.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}


function calculateBMI(kg, cm) {
  const m = cm / 100;
  return kg / (m * m);
}

function getCategory(bmi) {
  if (bmi < 18.5) return { name: "Underweight", css: "underweight", tip: "Consider talking to a doctor or dietitian about healthy weight gain." };
  else if (bmi < 25) return { name: "Normal weight", css: "normal", tip: "Great! Keep up balanced eating and regular activity." };
  else if (bmi < 30) return { name: "Overweight", css: "overweight", tip: "Small changes in diet and daily activity can help." };
  else return { name: "Obese", css: "obese", tip: "A doctor can help you build a safe, personal plan." };
}

const kgToLb = (kg) => kg / 0.45359237;



function showError(text, ...fields) {
  errorEl.textContent = text;
  fields.forEach((f) => f.classList.add("invalid"));
  resultEl.hidden = true;
}
function clearError() {
  errorEl.textContent = "";
  document.querySelectorAll("input").forEach((i) => i.classList.remove("invalid"));
}



function setUnit(next) {
  unit = next;
  $("metric").classList.toggle("active", unit === "metric");
  $("imperial").classList.toggle("active", unit === "imperial");
  $("height-metric").hidden = unit !== "metric";
  $("height-imperial").hidden = unit !== "imperial";
  $("weight-label").textContent = unit === "metric" ? "Weight (kg)" : "Weight (lb)";
  weightInput.placeholder = unit === "metric" ? "e.g. 58" : "e.g. 128";
  form.reset();
  clearError();
  resultEl.hidden = true;
}
$("metric").addEventListener("click", () => setUnit("metric"));
$("imperial").addEventListener("click", () => setUnit("imperial"));

/* ---------- Result display ---------- */

// Counts the number up from 0 for a smooth effect
function animateValue(target) {
  const start = performance.now(), duration = 700;
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    $("bmi-value").textContent = (target * p).toFixed(1);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function showResult(bmi, cm) {
  const cat = getCategory(bmi);
  resultEl.className = "result " + cat.css;
  resultEl.hidden = false;
  $("bmi-category").textContent = cat.name;
  $("advice").textContent = cat.tip;
  animateValue(bmi);

  // Marker position on the 10 - 40 scale
  const pct = Math.min(Math.max((bmi - 10) / 30, 0), 1) * 100;
  $("marker").style.left = "0%";
  requestAnimationFrame(() => requestAnimationFrame(() => ($("marker").style.left = pct + "%")));

  // Healthy weight range for this height (BMI 18.5 to 24.9)
  const m2 = (cm / 100) ** 2;
  const lowKg = 18.5 * m2, highKg = 24.9 * m2;
  $("range").textContent = unit === "metric"
    ? `Healthy weight for your height: ${lowKg.toFixed(1)} – ${highKg.toFixed(1)} kg`
    : `Healthy weight for your height: ${kgToLb(lowKg).toFixed(0)} – ${kgToLb(highKg).toFixed(0)} lb`;
}

/* ---------- History (saved in the browser) ---------- */

function loadHistory() {
  try { history = JSON.parse(localStorage.getItem("bmi-history")) || []; } catch { history = []; }
}
function saveHistory() {
  try { localStorage.setItem("bmi-history", JSON.stringify(history)); } catch { /* storage blocked */ }
}
function renderHistory() {
  historyList.innerHTML = "";
  history.forEach((h) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${h.time} · BMI ${h.bmi}</span><span class="tag ${h.css}">${h.name}</span>`;
    historyList.appendChild(li);
  });
  historyEmpty.hidden = history.length > 0;
}
function addHistory(bmi, cat) {
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  history.unshift({ time, bmi: bmi.toFixed(1), name: cat.name, css: cat.css });
  history = history.slice(0, 5);
  saveHistory();
  renderHistory();
}
$("clear-history").addEventListener("click", () => { history = []; saveHistory(); renderHistory(); });

/* ---------- Form submit ---------- */

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearError();

  let cm;
  if (unit === "metric") {
    if (heightCm.value.trim() === "") return showError("Please enter your height.", heightCm);
    const h = parsePositive(heightCm.value);
    if (h === null) return showError("Height must be a number greater than 0.", heightCm);
    cm = h;
  } else {
    if (heightFt.value.trim() === "") return showError("Please enter your height in feet.", heightFt);
    const ft = parsePositive(heightFt.value);
    if (ft === null) return showError("Feet must be a number greater than 0.", heightFt);
    const inchText = heightIn.value.trim();
    const inch = inchText === "" ? 0 : Number(inchText);
    if (!Number.isFinite(inch) || inch < 0 || inch >= 12) return showError("Inches must be between 0 and 11.", heightIn);
    cm = (ft * 12 + inch) * 2.54;
  }

  if (weightInput.value.trim() === "") return showError("Please enter your weight.", weightInput);
  const w = parsePositive(weightInput.value);
  if (w === null) return showError("Weight must be a number greater than 0.", weightInput);
  const kg = unit === "metric" ? w : w * 0.45359237;

  if (cm < 50 || cm > 272) return showError("Height looks unrealistic. Please check the value.", unit === "metric" ? heightCm : heightFt);
  if (kg < 2 || kg > 650) return showError("Weight looks unrealistic. Please check the value.", weightInput);

  const bmi = calculateBMI(kg, cm);
  showResult(bmi, cm);
  addHistory(bmi, getCategory(bmi));
});

form.addEventListener("reset", () => { clearError(); resultEl.hidden = true; });

/* ---------- Theme ---------- */

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  $("theme").textContent = theme === "dark" ? "🌙" : "☀️";
  try { localStorage.setItem("bmi-theme-v2", theme); } catch { /* ignore */ }
}
$("theme").addEventListener("click", () => {
  applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
});

/* ---------- Start ---------- */
let savedTheme = "light";
try { savedTheme = localStorage.getItem("bmi-theme-v2") || "light"; } catch { /* ignore */ }
applyTheme(savedTheme);
loadHistory();
renderHistory();
