// js/ui.js
import {
  initCanvas,
  addText,
  addImage,
  applyZoom,
  getZoom,
  nextPage,
  prevPage,
  exportFlipbook
} from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  document.getElementById("addTextBtn").onclick = addText;

  document.getElementById("imageInput").onchange = e => {
    if (e.target.files[0]) addImage(e.target.files[0]);
  };

  document.getElementById("zoomInBtn").onclick = () =>
    applyZoom(getZoom() + 0.1);

  document.getElementById("zoomOutBtn").onclick = () =>
    applyZoom(getZoom() - 0.1);

  document.getElementById("nextPageBtn").onclick = nextPage;
  document.getElementById("prevPageBtn").onclick = prevPage;

  document.getElementById("exportFlipBtn").onclick = exportFlipbook;
});
