// js/ui.js
import {
  initCanvas,
  addText,
  addImage,
  addPage,
  prevPage,
  nextPage,
  zoomIn,
  zoomOut,
  resetZoom,
  setPageSize,
  exportFlipbook
} from "./core.js";

initCanvas();

// TEXT
document.getElementById("addTextBtn")?.addEventListener("click", addText);

// IMAGE
document.getElementById("imageInput")?.addEventListener("change", e => {
  if (e.target.files[0]) addImage(e.target.files[0]);
});

// PAGES
document.getElementById("addPageBtn")?.addEventListener("click", addPage);
document.getElementById("prevPageBtn")?.addEventListener("click", prevPage);
document.getElementById("nextPageBtn")?.addEventListener("click", nextPage);

// ZOOM
document.getElementById("zoomInBtn")?.addEventListener("click", zoomIn);
document.getElementById("zoomOutBtn")?.addEventListener("click", zoomOut);
document.getElementById("zoomResetBtn")?.addEventListener("click", resetZoom);

// SIZE
document.getElementById("pageSizeSelect")?.addEventListener("change", e => {
  setPageSize(e.target.value);
});

// EXPORT
document.getElementById("exportFlipBtn")?.addEventListener("click", () => {
  exportFlipbook(false);
});
document.getElementById("previewFlipBtn")?.addEventListener("click", () => {
  exportFlipbook(true);
});

// MODAL CLOSE
document.getElementById("closeFlipPreview")?.onclick = () => {
  document.getElementById("flipPreviewModal").classList.remove("open");
};
