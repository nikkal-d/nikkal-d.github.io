// js/ui.js
import {
  addText,
  addImageFromFile,
  zoomIn,
  zoomOut,
  zoomReset,
  zoomFit,
  setCanvasSize,
  exportFlipbook,
  previewFlipbook,
} from "./core.js";

/* ======================
   SAFE BIND HELPER
====================== */
function bind(id, event, handler) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener(event, handler);
}

/* ======================
   TEXT
====================== */
bind("addTextBtn", "click", () => {
  console.log("🟢 Add Text clicked");
  addText();
});

/* ======================
   IMAGES
====================== */
const imageInput = document.getElementById("imageInput");
if (imageInput) {
  imageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) addImageFromFile(file);
    imageInput.value = "";
  });
}

/* ======================
   ZOOM (CANVAS)
====================== */
bind("zoomInBtn", "click", zoomIn);
bind("zoomOutBtn", "click", zoomOut);
bind("zoomResetBtn", "click", zoomReset);
bind("zoomFitBtn", "click", zoomFit);

/* ======================
   CANVAS SIZE
====================== */
bind("pageSizeSelect", "change", (e) => {
  setCanvasSize(e.target.value);
});

/* ======================
   EXPORT
====================== */
bind("exportFlipBtn", "click", exportFlipbook);
bind("previewFlipBtn", "click", previewFlipbook);
