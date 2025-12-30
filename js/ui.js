// js/ui.js
// ===============================
// UI bindings – SAFE & STABLE
// ===============================

import {
  addText,
  addImage,
  zoomIn,
  zoomOut,
  resetZoom,
  fitCanvas,
  addPage,
  nextPage,
  prevPage,
  updatePageInfo,
  exportFlipbook,
  previewFlipbook,
  setCanvasSizePreset
} from "./core.js";

/* -----------------------------
   HELPERS
----------------------------- */
const $ = (id) => document.getElementById(id);

/* -----------------------------
   TEXT
----------------------------- */
$("addTextBtn")?.addEventListener("click", () => {
  console.log("🟢 Add Text clicked");
  addText();
});

/* -----------------------------
   IMAGE UPLOAD
----------------------------- */
$("imageInput")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  addImage(file);
  e.target.value = "";
});

/* -----------------------------
   ZOOM (CANVAS, NOT OBJECT)
----------------------------- */
$("zoomInBtn")?.addEventListener("click", zoomIn);
$("zoomOutBtn")?.addEventListener("click", zoomOut);
$("zoomResetBtn")?.addEventListener("click", resetZoom);
$("zoomFitBtn")?.addEventListener("click", fitCanvas);

/* -----------------------------
   PAGE SIZE
----------------------------- */
$("pageSizeSelect")?.addEventListener("change", (e) => {
  setCanvasSizePreset(e.target.value);
});

/* -----------------------------
   PAGES
----------------------------- */
$("addPageBtn")?.addEventListener("click", () => {
  addPage();
  updatePageInfo();
});

$("nextPageBtn")?.addEventListener("click", () => {
  nextPage();
  updatePageInfo();
});

$("prevPageBtn")?.addEventListener("click", () => {
  prevPage();
  updatePageInfo();
});

/* -----------------------------
   EXPORT / FLIPBOOK
----------------------------- */
$("exportFlipBtn")?.addEventListener("click", exportFlipbook);
$("previewFlipBtn")?.addEventListener("click", previewFlipbook);

/* -----------------------------
   INIT
----------------------------- */
console.log("✅ UI loaded");
