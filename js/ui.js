// js/ui.js
import {
  initCanvas,
  addText,
  addImageFromFile,
  addRect,
  addCircle,
  addLine,
  zoomIn,
  zoomOut,
  zoomReset,
  addPage,
  nextPage,
  prevPage,
  exportFlipbook,
  setFontFamily,
  setFontSize,
  setTextColor
} from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  document.getElementById("addTextBtn").onclick = addText;
  document.getElementById("imageInput").onchange = e => addImageFromFile(e.target.files[0]);

  document.getElementById("addRectBtn").onclick = addRect;
  document.getElementById("addCircleBtn").onclick = addCircle;
  document.getElementById("addLineBtn").onclick = addLine;

  document.getElementById("zoomInBtn").onclick = zoomIn;
  document.getElementById("zoomOutBtn").onclick = zoomOut;
  document.getElementById("zoomResetBtn").onclick = zoomReset;

  document.getElementById("addPageBtn").onclick = addPage;
  document.getElementById("nextPageBtn").onclick = nextPage;
  document.getElementById("prevPageBtn").onclick = prevPage;

  document.getElementById("exportFlipBtn").onclick = exportFlipbook;
const fontSelect = document.getElementById("fontSelect");
if (fontSelect) {
  fontSelect.onchange = e => setFontFamily(e.target.value);
}

const fontSizeInput = document.getElementById("fontSizeInput");
if (fontSizeInput) {
  fontSizeInput.oninput = e => setFontSize(+e.target.value);
}

const textColorInput = document.getElementById("textColorInput");
if (textColorInput) {
  textColorInput.oninput = e => setTextColor(e.target.value);
}

});
