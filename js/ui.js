// js/ui.js
// ---------------------------------------------
// UI CONTROLLER (binds buttons -> core)
// ---------------------------------------------
import {
  initCanvas,
  addText,
  addImageFromFile,
  zoomIn,
  zoomOut,
  resetZoom,
  fitToScreen
} from "./core.js";

function bindUI() {
  // Init canvas once
  initCanvas("canvas");

  // TEXT
  document.getElementById("addTextBtn")?.addEventListener("click", () => {
    addText();
  });

  // IMAGE (your HTML uses id="railImage")
  const imgBtn = document.getElementById("railImage") || document.getElementById("addImageBtn");
  imgBtn?.addEventListener("click", () => {
    document.getElementById("imageInput")?.click();
  });

  document.getElementById("imageInput")?.addEventListener("change", (e) => {
    const file = e.target?.files?.[0];
    if (file) addImageFromFile(file);
    // allow re-selecting same file
    if (e.target) e.target.value = "";
  });

  // ZOOM
  document.getElementById("zoomInBtn")?.addEventListener("click", zoomIn);
  document.getElementById("zoomOutBtn")?.addEventListener("click", zoomOut);
  document.getElementById("zoomResetBtn")?.addEventListener("click", resetZoom);
  document.getElementById("fitBtn")?.addEventListener("click", fitToScreen);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindUI);
} else {
  bindUI();
}
