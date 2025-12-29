import {
  initCanvas,
  addText,
  addImageFromFile,
  addPage,
  prevPage,
  nextPage,
  setZoom,
  resetZoom,
  setPageSize,
  exportFlipbook
} from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  document.getElementById("addTextBtn")?.onclick = addText;

  document.getElementById("imageInput")?.addEventListener("change", e => {
    if (e.target.files[0]) addImageFromFile(e.target.files[0]);
  });

  document.getElementById("addPageBtn")?.onclick = addPage;
  document.getElementById("prevPageBtn")?.onclick = prevPage;
  document.getElementById("nextPageBtn")?.onclick = nextPage;

  document.getElementById("zoomInBtn")?.onclick = () => setZoom(0.1);
  document.getElementById("zoomOutBtn")?.onclick = () => setZoom(-0.1);
  document.getElementById("zoomResetBtn")?.onclick = resetZoom;
  document.getElementById("zoomFitBtn")?.onclick = resetZoom;

  document.getElementById("pageSizeSelect")?.addEventListener("change", e => {
    setPageSize(e.target.value);
  });

  document.getElementById("exportFlipBtn")?.onclick = exportFlipbook;
});
