// js/ui.js
// ============================================================
// UI glue for Photobook Studio
// - Left panel open/close (optional panels)
// - Keeps core isolated: UI only calls exported core functions
// ============================================================

import { applyZoom, getZoom, resetZoom, fitToScreen } from "./core.js";

const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const $ = (id) => document.getElementById(id);

// LEFT PANEL TOGGLE (buttons with data-panel="name")
function initLeftPanels() {
  $$(".sidebar button[data-panel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.panel;
      toggleLeftPanel(name);
    });
  });
}

function toggleLeftPanel(name) {
  const panels = $$(".panel-container");
  panels.forEach((p) => {
    if (p.id === `panel-${name}`) p.classList.toggle("open");
    else p.classList.remove("open");
  });
}

// ZOOM LABEL SYNC (optional)
function initZoomUi() {
  const lbl = $("zoomValue");
  if (!lbl) return;

  const sync = () => { lbl.textContent = Math.round(getZoom() * 100) + "%"; };

  $("zoomInBtn")?.addEventListener("click", sync);
  $("zoomOutBtn")?.addEventListener("click", sync);
  $("zoomResetBtn")?.addEventListener("click", () => { resetZoom(); sync(); });
  $("fitBtn")?.addEventListener("click", () => { fitToScreen(); sync(); });

  sync();
}

// Right panel toggle (if not already bound by core – safe duplicate guard)
function initRightPanel() {
  const btn = $("toggleRight");
  const panel = $("rightPanel");
  if (!btn || !panel) return;
  btn.addEventListener("click", () => panel.classList.toggle("open"));
}

document.addEventListener("DOMContentLoaded", () => {
  initLeftPanels();
  initZoomUi();
  initRightPanel();
});
