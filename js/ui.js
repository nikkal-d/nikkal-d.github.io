// ui.js
import {
  initCanvas,
  zoomIn,
  zoomOut,
  resetZoom,
  getZoomPercent,
} from "./core.js";

// INIT
window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  const zoomLabel = document.getElementById("zoomValue");

  document.getElementById("zoomIn")?.addEventListener("click", () => {
    zoomIn();
    zoomLabel.textContent = getZoomPercent() + "%";
  });

  document.getElementById("zoomOut")?.addEventListener("click", () => {
    zoomOut();
    zoomLabel.textContent = getZoomPercent() + "%";
  });

  document.getElementById("zoomReset")?.addEventListener("click", () => {
    resetZoom();
    zoomLabel.textContent = "100%";
  });
});
