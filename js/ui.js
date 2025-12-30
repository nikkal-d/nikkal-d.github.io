// js/ui.js
// UI bindings – SAFE VERSION (no missing exports)

import {
  canvas,
  addText,
  addImageFromFile,
  zoomIn,
  zoomOut,
  zoomReset,
  nextPage,
  prevPage,
  addPage,
  exportFlipbook
} from "./core.js";

/* --------------------------------------------------
   HELPERS
-------------------------------------------------- */
const $ = (id) => document.getElementById(id);

/* --------------------------------------------------
   TEXT
-------------------------------------------------- */
const addTextBtn = $("addTextBtn");
addTextBtn?.addEventListener("click", () => {
  addText();
});

/* --------------------------------------------------
   IMAGE UPLOAD
-------------------------------------------------- */
const imageInput = $("imageInput");
imageInput?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  addImageFromFile(file);
  imageInput.value = "";
});

/* --------------------------------------------------
   ZOOM (CANVAS ZOOM)
-------------------------------------------------- */
$("zoomInBtn")?.addEventListener("click", zoomIn);
$("zoomOutBtn")?.addEventListener("click", zoomOut);
$("zoomResetBtn")?.addEventListener("click", zoomReset);

/* --------------------------------------------------
   PAGES
-------------------------------------------------- */
$("addPageBtn")?.addEventListener("click", addPage);
$("nextPageBtn")?.addEventListener("click", nextPage);
$("prevPageBtn")?.addEventListener("click", prevPage);

/* --------------------------------------------------
   EXPORT
-------------------------------------------------- */
$("exportFlipBtn")?.addEventListener("click", () => {
  exportFlipbook();
});

/* --------------------------------------------------
   DEBUG (optional – μπορείς να το σβήσεις)
-------------------------------------------------- */
window.__canvas = canvas;
console.log("✅ ui.js loaded");
