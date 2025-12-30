// js/ui.js
// UI bindings – SAFE VERSION (no broken imports)

import {
  initCanvas,
  addText,
  addImageFromFile,
  zoomIn,
  zoomOut,
  resetZoom,
  fitToScreen,
  setCanvasSizePreset,
  addPage,
  nextPage,
  prevPage,
  exportFlipbook,
  previewFlipbook
} from "./core.js";

// ---------- INIT ----------
window.addEventListener("DOMContentLoaded", () => {
  console.log("🟢 UI loaded");

  initCanvas();
  bindUI();
});

// ---------- HELPERS ----------
const $ = (id) => document.getElementById(id);

// ---------- UI BINDINGS ----------
function bindUI() {

  /* TEXT */
  $("addTextBtn")?.addEventListener("click", () => {
    console.log("🟢 Add Text");
    addText();
  });

  /* IMAGE */
  const imageInput = $("imageInput");
  if (imageInput) {
    imageInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) addImageFromFile(file);
      imageInput.value = "";
    });
  }

  /* ZOOM */
  $("zoomInBtn")?.addEventListener("click", zoomIn);
  $("zoomOutBtn")?.addEventListener("click", zoomOut);
  $("zoomResetBtn")?.addEventListener("click", resetZoom);
  $("fitBtn")?.addEventListener("click", fitToScreen);
  $("zoomFitBtn")?.addEventListener("click", fitToScreen);

  /* PAGE SIZE */
  $("pageSizeSelect")?.addEventListener("change", (e) => {
    setCanvasSizePreset(e.target.value);
  });

  /* PAGES */
  $("addPageBtn")?.addEventListener("click", addPage);
  $("nextPageBtn")?.addEventListener("click", nextPage);
  $("prevPageBtn")?.addEventListener("click", prevPage);

  /* EXPORT */
  $("exportFlipBtn")?.addEventListener("click", () => {
    exportFlipbook();
  });

  $("previewFlipBtn")?.addEventListener("click", () => {
    previewFlipbook();
  });

  console.log("✅ UI bindings OK");
}
