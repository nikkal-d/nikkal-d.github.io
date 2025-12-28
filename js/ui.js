// js/ui.js
import {
  initCanvas,
  addText,
  addImageFromFile,
  addPage,
  goToPage,
  setZoom,
  fitToScreen,
  setPageSize,
  exportFlipbook
} from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  // TEXT
  document.getElementById("addTextBtn")?.addEventListener("click", addText);

  // IMAGE
  document.getElementById("imageInput")?.addEventListener("change", e => {
    if (e.target.files[0]) addImageFromFile(e.target.files[0]);
  });

  // PAGES
  document.getElementById("addPageBtn")?.addEventListener("click", addPage);
  document.getElementById("prevPageBtn")?.addEventListener("click", () => goToPage(App.currentPage - 1));
  document.getElementById("nextPageBtn")?.addEventListener("click", () => goToPage(App.currentPage + 1));

  // ZOOM
  document.getElementById("zoomInBtn")?.addEventListener("click", () => setZoom(App.zoom + 0.1));
  document.getElementById("zoomOutBtn")?.addEventListener("click", () => setZoom(App.zoom - 0.1));
  document.getElementById("zoomResetBtn")?.addEventListener("click", fitToScreen);

  // PAGE SIZE
  document.getElementById("pageSizeSelect")?.addEventListener("change", e => {
    setPageSize(e.target.value);
  });

  // EXPORT
  document.getElementById("exportFlipBtn")?.addEventListener("click", exportFlipbook);
});
