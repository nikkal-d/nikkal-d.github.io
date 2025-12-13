// js/ui.js
// ---------------------------------------------
// UI CONTROLLER (aligned with photobook (3).html)
// ---------------------------------------------
import {
  setZoom, resetZoom, getZoom,
  addImageFromFile,
  fitToScreen
} from "./core.js";

// -----------------------------
// LEFT TOOLBAR -> LEFT PANELS
// -----------------------------
const toolButtons = document.querySelectorAll(".sidebar .toolbtn");
const panels = document.querySelectorAll(".leftPanel .panel");

function showPanel(name) {
  panels.forEach(p => {
    const isMatch = p.dataset.panel === name;
    p.style.display = isMatch ? "" : "none";
  });

  toolButtons.forEach(b => {
    b.classList.toggle("active", b.dataset.tool === name);
  });
}

// initial
showPanel("images");

toolButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    showPanel(btn.dataset.tool);
  });
});

// -----------------------------
// RIGHT EXPORT PANEL TOGGLE
// -----------------------------
const toggleRight = document.getElementById("toggleRight");
const rightPanel = document.getElementById("rightPanel");

toggleRight?.addEventListener("click", () => {
  rightPanel?.classList.toggle("open");
});

// -----------------------------
// ZOOM CONTROLS (REAL IDs in HTML)
// -----------------------------
const zoomInBtn = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");
const zoomResetBtn = document.getElementById("zoomReset");
const zoomLabel = document.getElementById("zoomLabel");

function updateZoomLabel() {
  if (!zoomLabel) return;
  zoomLabel.textContent = `${Math.round(getZoom() * 100)}%`;
}

zoomInBtn?.addEventListener("click", () => {
  setZoom(getZoom() + 0.1);
  updateZoomLabel();
});

zoomOutBtn?.addEventListener("click", () => {
  setZoom(getZoom() - 0.1);
  updateZoomLabel();
});

zoomResetBtn?.addEventListener("click", () => {
  resetZoom();
  updateZoomLabel();
});

updateZoomLabel();

// -----------------------------
// IMAGE INPUT (REAL id="imgInput")
// -----------------------------
document.getElementById("imgInput")?.addEventListener("change", e => {
  const file = e.target.files?.[0];
  if (file) addImageFromFile(file);
  e.target.value = ""; // allow re-upload same file
});

// Fit to page button (exists in your HTML)
document.getElementById("fitToPage")?.addEventListener("click", () => {
  fitToScreen();
  updateZoomLabel();
});

// -----------------------------
// LOGIN BUTTON (don’t break UI if auth not wired yet)
// -----------------------------
document.getElementById("loginBtn")?.addEventListener("click", () => {
  alert("Σύνδεση: θα κουμπώσει με Firebase όταν φτιάξουμε auth.js exports.");
});
