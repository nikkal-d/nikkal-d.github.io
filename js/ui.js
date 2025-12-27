// js/ui.js
import {
  initCanvas,
  addText,
  addImageFromFile,
  setZoom,
  getZoom,
  addPage,
  exportFlipbook
} from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  // TEXT
  document.getElementById("addTextBtn")?.addEventListener("click", addText);

  // IMAGE
  document.getElementById("imageInput")?.addEventListener("change", e => {
    if (e.target.files[0]) addImageFromFile(e.target.files[0]);
  });

  // ZOOM
  document.getElementById("zoomInBtn")?.onclick = () =>
    setZoom(getZoom() + 0.1);

  document.getElementById("zoomOutBtn")?.onclick = () =>
    setZoom(getZoom() - 0.1);

  // PAGE
  document.getElementById("addPageBtn")?.onclick = addPage;

  // EXPORT
  document.getElementById("exportFlipbookBtn")?.onclick = exportFlipbook;
});
