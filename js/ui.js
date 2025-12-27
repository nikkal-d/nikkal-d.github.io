// js/ui.js
import {
  initCanvas,
  addText,
  addImageFromFile,
  addPage,
  goToPage,
  applyZoom,
  setCanvasSize,
  generateFlipbookLink
} from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  document.getElementById("addTextBtn")?.addEventListener("click", addText);

  document.getElementById("imageInput")?.addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) addImageFromFile(file);
  });

  document.getElementById("addPageBtn")?.addEventListener("click", addPage);

  document.getElementById("zoomRange")?.addEventListener("input", e => {
    const z = parseFloat(e.target.value);
    applyZoom(z);
    document.getElementById("zoomValue").textContent = Math.round(z * 100) + "%";
  });

  document.getElementById("canvasSizeBtn")?.addEventListener("click", () => {
    const w = parseInt(document.getElementById("canvasW").value);
    const h = parseInt(document.getElementById("canvasH").value);
    if (w && h) setCanvasSize(w, h);
  });

  document.getElementById("flipbookLinkBtn")?.addEventListener("click", () => {
    const link = generateFlipbookLink();
    prompt("Flipbook link:", link);
  });
});
