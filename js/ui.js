// js/ui.js
import {
  initCanvas,
  addText,
  addImageFromFile,
  addPage,
  prevPage,
  nextPage,
  duplicatePage,
  exportFlipbook
} from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  document.getElementById("addTextBtn").onclick = addText;

  document.getElementById("imageInput").onchange = e => {
    if (e.target.files[0]) {
      addImageFromFile(e.target.files[0]);
    }
  };

  document.getElementById("addPageBtn").onclick = addPage;
  document.getElementById("prevPageBtn").onclick = prevPage;
  document.getElementById("nextPageBtn").onclick = nextPage;
  document.getElementById("dupPageBtn").onclick = duplicatePage;

  document.getElementById("exportFlipBtn").onclick = exportFlipbook;
});
