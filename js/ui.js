// js/ui.js
import {
  initCanvas,
  addText,
  addCircle,
  addLine,
  addImageFromFile,
  addPage,
  prevPage,
  nextPage,
  zoomIn,
  zoomOut,
  resetZoom,
  previewFlipbook
} from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  document.getElementById("addTextBtn").onclick = addText;
  document.getElementById("addCircleBtn").onclick = addCircle;
  document.getElementById("addLineBtn").onclick = addLine;

  document.getElementById("imageInput").onchange = e =>
    addImageFromFile(e.target.files[0]);

  document.getElementById("addPageBtn").onclick = addPage;
  document.getElementById("prevPageBtn").onclick = prevPage;
  document.getElementById("nextPageBtn").onclick = nextPage;

  document.getElementById("zoomInBtn").onclick = zoomIn;
  document.getElementById("zoomOutBtn").onclick = zoomOut;
  document.getElementById("zoomResetBtn").onclick = resetZoom;

  document.getElementById("previewFlipBtn").onclick = previewFlipbook;
});
