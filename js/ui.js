import {
  initCanvas, addText, addRect, addCircle,
  addImageFromFile, zoomIn, zoomOut,
  addPage, duplicatePage, prevPage, nextPage,
  exportFlipbook
} from "./core.js";

initCanvas();

document.getElementById("addTextBtn").onclick = addText;
document.getElementById("addRectBtn").onclick = addRect;
document.getElementById("addCircleBtn").onclick = addCircle;

document.getElementById("imageInput").onchange =
  e => addImageFromFile(e.target.files[0]);

document.getElementById("zoomInBtn").onclick = zoomIn;
document.getElementById("zoomOutBtn").onclick = zoomOut;

document.getElementById("addPageBtn").onclick = addPage;
document.getElementById("dupPageBtn").onclick = duplicatePage;
document.getElementById("prevPageBtn").onclick = prevPage;
document.getElementById("nextPageBtn").onclick = nextPage;

document.getElementById("exportFlipBtn").onclick = exportFlipbook;
