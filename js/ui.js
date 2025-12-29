// js/ui.js
import {
  initCanvas,
  addText,
  addImageFromFile,
  zoomIn,
  zoomOut,
  resetZoom,
  setPageSize,
  addPage,
  nextPage,
  prevPage,
  exportFlipbook
} from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  document.getElementById("addTextBtn")?.addEventListener("click", addText);

  document.getElementById("imageInput")?.addEventListener("change", e => {
    if (e.target.files[0]) addImageFromFile(e.target.files[0]);
  });

  document.getElementById("zoomInBtn")?.addEventListener("click", zoomIn);
  document.getElementById("zoomOutBtn")?.addEventListener("click", zoomOut);
  document.getElementById("zoomResetBtn")?.addEventListener("click", resetZoom);

  document.getElementById("pageSizeSelect")?.addEventListener("change", e => {
    setPageSize(e.target.value);
  });

  document.getElementById("addPageBtn")?.addEventListener("click", addPage);
  document.getElementById("nextPageBtn")?.addEventListener("click", nextPage);
  document.getElementById("prevPageBtn")?.addEventListener("click", prevPage);

  document.getElementById("exportFlipBtn")?.addEventListener("click", exportFlipbook);
});
