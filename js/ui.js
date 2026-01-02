// js/ui.js
import {
  initCanvas, addText, addPage, duplicatePage,
  nextPage, prevPage, addImageFromFile, exportFlipbook
} from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  document.getElementById("addTextBtn").onclick = addText;
  document.getElementById("addPageBtn").onclick = addPage;
  document.getElementById("dupPageBtn").onclick = duplicatePage;
  document.getElementById("nextPageBtn").onclick = nextPage;
  document.getElementById("prevPageBtn").onclick = prevPage;

  document.getElementById("imageInput").onchange = e => {
    if (e.target.files[0]) addImageFromFile(e.target.files[0]);
  };

  document.getElementById("exportFlipBtn").onclick = () => {
    const pages = exportFlipbook();
    console.log("Flipbook pages:", pages);
  };
});
