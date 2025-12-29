// js/ui.js
import {
  initCanvas,
  addText,
  addRect,
  addCircle,
  addLine,
  addImageFromFile,
  addPage,
  nextPage,
  prevPage,
  zoomCanvas,
  exportFlipbook
} from "./core.js";

initCanvas();

// TEXT
document.getElementById("addTextBtn")?.addEventListener("click", addText);

// SHAPES
document.getElementById("addRectBtn")?.addEventListener("click", addRect);
document.getElementById("addCircleBtn")?.addEventListener("click", addCircle);
document.getElementById("addLineBtn")?.addEventListener("click", addLine);

// IMAGE
document.getElementById("imageInput")?.addEventListener("change", e => {
  if (e.target.files[0]) addImageFromFile(e.target.files[0]);
});

// PAGES
document.getElementById("addPageBtn")?.addEventListener("click", addPage);
document.getElementById("nextPageBtn")?.addEventListener("click", nextPage);
document.getElementById("prevPageBtn")?.addEventListener("click", prevPage);

// ZOOM
document.getElementById("zoomInBtn")?.addEventListener("click", () => zoomCanvas(0.1));
document.getElementById("zoomOutBtn")?.addEventListener("click", () => zoomCanvas(-0.1));

// EXPORT
document.getElementById("exportFlipBtn")?.addEventListener("click", exportFlipbook);
