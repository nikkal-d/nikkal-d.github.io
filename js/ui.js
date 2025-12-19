// js/ui.js
import {
  addText,
  addImageFromFile,
  applyZoom,
  resetZoom,
  fitToScreen
} from "./core.js";

/* ======================
   TEXT
====================== */
const addTextBtn = document.getElementById("addTextBtn");
if (addTextBtn) {
  addTextBtn.addEventListener("click", () => {
    addText();
  });
}

/* ======================
   IMAGE
====================== */
const imageInput = document.getElementById("imageInput");
if (imageInput) {
  imageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) addImageFromFile(file);
    e.target.value = "";
  });
}

/* ======================
   ZOOM
====================== */
document.getElementById("zoomInBtn")
  ?.addEventListener("click", () => applyZoom(1.1));

document.getElementById("zoomOutBtn")
  ?.addEventListener("click", () => applyZoom(0.9));

document.getElementById("zoomResetBtn")
  ?.addEventListener("click", () => resetZoom());

document.getElementById("fitBtn")
  ?.addEventListener("click", () => fitToScreen());
