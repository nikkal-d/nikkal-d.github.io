import {
  addText,
  addImageFromFile,
  zoomIn,
  zoomOut,
  zoomReset,
  addPage,
  goToPage,
  exportFlipbookHTML,
  setCanvasSize
} from "./core.js";

/* TEXT */
document.getElementById("addTextBtn")?.addEventListener("click", addText);

/* IMAGE */
document.getElementById("imageInput")?.addEventListener("change", (e) => {
  if (e.target.files[0]) addImageFromFile(e.target.files[0]);
});

/* ZOOM */
document.getElementById("zoomInBtn")?.onclick = zoomIn;
document.getElementById("zoomOutBtn")?.onclick = zoomOut;
document.getElementById("zoomResetBtn")?.onclick = zoomReset;

/* PAGES */
document.getElementById("addPageBtn")?.onclick = () => {
  addPage();
  goToPage(pages.length - 1);
};

document.getElementById("prevPageBtn")?.onclick = () =>
  goToPage(currentPage - 1);

document.getElementById("nextPageBtn")?.onclick = () =>
  goToPage(currentPage + 1);

/* SIZE */
document.getElementById("pageSizeSelect")?.addEventListener("change", (e) => {
  setCanvasSize(e.target.value);
});

/* FLIPBOOK */
document.getElementById("exportFlipBtn")?.onclick = () => {
  const url = exportFlipbookHTML();
  window.open(url, "_blank");
};

document.getElementById("previewFlipBtn")?.onclick = () => {
  const url = exportFlipbookHTML();
  document.getElementById("flipPreviewFrame").src = url;
  document.getElementById("flipPreviewModal").classList.add("open");
};

document.getElementById("closeFlipPreview")?.onclick = () => {
  document.getElementById("flipPreviewModal").classList.remove("open");
};
