// js/ui.js
// UI bindings – ΔΕΝ ορίζει logic, μόνο κουμπιά → core.js

import {
  canvas,
  addText,
  addImageFromFile,
  zoomIn,
  zoomOut,
  resetZoom,
  fitToScreen,
  addPage,
  prevPage,
  nextPage,
  setPageSize,
  exportFlipbook,
  previewFlipbook
} from "./core.js";

/* ---------------- TEXT ---------------- */

const addTextBtn = document.getElementById("addTextBtn");
addTextBtn?.addEventListener("click", () => {
  addText();
});

/* ---------------- IMAGE ---------------- */

const imageInput = document.getElementById("imageInput");
imageInput?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) addImageFromFile(file);
  imageInput.value = "";
});

/* ---------------- ZOOM ---------------- */

document.getElementById("zoomInBtn")?.addEventListener("click", zoomIn);
document.getElementById("zoomOutBtn")?.addEventListener("click", zoomOut);
document.getElementById("zoomResetBtn")?.addEventListener("click", resetZoom);
document.getElementById("fitBtn")?.addEventListener("click", fitToScreen);
document.getElementById("zoomFitBtn")?.addEventListener("click", fitToScreen);

/* ---------------- PAGES ---------------- */

document.getElementById("addPageBtn")?.addEventListener("click", addPage);
document.getElementById("prevPageBtn")?.addEventListener("click", prevPage);
document.getElementById("nextPageBtn")?.addEventListener("click", nextPage);

/* ---------------- PAGE SIZE ---------------- */

const pageSizeSelect = document.getElementById("pageSizeSelect");
pageSizeSelect?.addEventListener("change", () => {
  setPageSize(pageSizeSelect.value);
});

/* ---------------- EXPORT ---------------- */

document.getElementById("exportFlipBtn")?.addEventListener("click", () => {
  exportFlipbook();
});

document.getElementById("previewFlipBtn")?.addEventListener("click", () => {
  previewFlipbook();
});

/* ---------------- DEBUG (safe) ---------------- */

window.__canvas = canvas;
