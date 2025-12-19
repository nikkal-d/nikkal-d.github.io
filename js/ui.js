// js/ui.js
import {
  initCanvas,
  addText,
  addImageFromFile,
  zoomIn,
  zoomOut,
  resetZoom,
  fitToScreen
} from "./core.js";

document.addEventListener("DOMContentLoaded", () => {
  initCanvas("canvas");

  // TEXT
  document.getElementById("addTextBtn")?.addEventListener("click", addText);

  // IMAGE
  document.getElementById("addImageBtn")?.addEventListener("click", () => {
    document.getElementById("imageInput")?.click();
  });

  document.getElementById("imageInput")?.addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) addImageFromFile(file);
  });

  // ZOOM
  document.getElementById("zoomInBtn")?.addEventListener("click", zoomIn);
  document.getElementById("zoomOutBtn")?.addEventListener("click", zoomOut);
  document.getElementById("zoomResetBtn")?.addEventListener("click", resetZoom);
  document.getElementById("fitBtn")?.addEventListener("click", fitToScreen);
});
