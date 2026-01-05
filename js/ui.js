// js/ui.js
import {
  initCanvas,
  addText,
  addImageFromFile,
  addRect,
  addCircle,
  addLine,
  addPage,
  nextPage,
  prevPage,
  duplicatePage,
  exportFlipbook
} from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  document.getElementById("addTextBtn")?.onclick = addText;
  document.getElementById("addPageBtn")?.onclick = addPage;
  document.getElementById("nextPageBtn")?.onclick = nextPage;
  document.getElementById("prevPageBtn")?.onclick = prevPage;
  document.getElementById("dupPageBtn")?.onclick = duplicatePage;

  document.getElementById("addRectBtn")?.onclick = addRect;
  document.getElementById("addCircleBtn")?.onclick = addCircle;
  document.getElementById("addLineBtn")?.onclick = addLine;

  document.getElementById("exportFlipBtn")?.onclick = exportFlipbook;

  document.getElementById("imageInput")?.addEventListener("change", e => {
    if (e.target.files[0]) addImageFromFile(e.target.files[0]);
  });
});
