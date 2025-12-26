// ui.js
import {
  initCanvas,
  addText,
  addImageFromFile,
  setZoom,
  getZoom
} from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  // TEXT
  document.getElementById("addTextBtn")?.addEventListener("click", () => {
    addText();
  });

  // IMAGE
  document.getElementById("imageInput")?.addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) addImageFromFile(file);
  });

  // ZOOM
  const zoomLabel = document.getElementById("zoomValue");

  document.getElementById("zoomInBtn")?.addEventListener("click", () => {
    setZoom(getZoom() + 0.1);
    zoomLabel.textContent = Math.round(getZoom() * 100) + "%";
  });

  document.getElementById("zoomOutBtn")?.addEventListener("click", () => {
    setZoom(getZoom() - 0.1);
    zoomLabel.textContent = Math.round(getZoom() * 100) + "%";
  });
});
