// js/ui.js
import {
  addText,
  addImageFromFile,
  applyZoom,
  resetZoom,
  fitToScreen
} from "./core.js";

// ==========================
// TEXT
// ==========================
document.getElementById("addTextBtn")?.addEventListener("click", () => {
  addText();
});

// ==========================
// IMAGE
// ==========================
const imageInput = document.getElementById("imageInput");
document.getElementById("railImage")?.addEventListener("click", () => {
  imageInput?.click();
});

imageInput?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) addImageFromFile(file);
  e.target.value = "";
});

// ==========================
// ZOOM
// ==========================
document.getElementById("zoomInBtn")?.addEventListener("click", () => applyZoom(1.1));
document.getElementById("zoomOutBtn")?.addEventListener("click", () => applyZoom(0.9));
document.getElementById("zoomResetBtn")?.addEventListener("click", () => resetZoom());
document.getElementById("fitBtn")?.addEventListener("click", () => fitToScreen());
