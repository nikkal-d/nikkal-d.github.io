// js/ui.js
import {
  addText,
  addImageFromFile,
  setZoom,
  getZoom,
  nextPage,
  prevPage,
  exportFlipbook,
  setCanvasSize
} from "./core.js";

// TEXT
document.getElementById("addTextBtn")?.addEventListener("click", addText);

// IMAGE
document.getElementById("imageInput")?.addEventListener("change", e => {
  if (e.target.files[0]) addImageFromFile(e.target.files[0]);
});

// ZOOM
document.getElementById("zoomInBtn")?.onclick = () => {
  setZoom(getZoom() + 0.1);
  document.getElementById("zoomValue").textContent = Math.round(getZoom() * 100) + "%";
};

document.getElementById("zoomOutBtn")?.onclick = () => {
  setZoom(getZoom() - 0.1);
  document.getElementById("zoomValue").textContent = Math.round(getZoom() * 100) + "%";
};

// PAGES
document.getElementById("nextPageBtn")?.onclick = nextPage;
document.getElementById("prevPageBtn")?.onclick = prevPage;

// EXPORT
document.getElementById("exportFlipbookBtn")?.onclick = exportFlipbook;

// CANVAS SIZE
document.getElementById("sizeA4Btn")?.onclick = () => setCanvasSize(1240, 1754);
document.getElementById("sizeSquareBtn")?.onclick = () => setCanvasSize(1400, 1400);
