// js/ui.js
import {
  addText,
  addImageFromFile,
  applyZoom,
  getZoom,
  addPage,
  nextPage,
  prevPage,
  exportFlipbookHTML,
  setPageSize
} from "./core.js";

document.getElementById("addTextBtn")?.addEventListener("click", addText);

document.getElementById("imageInput")?.addEventListener("change", e => {
  if (e.target.files[0]) addImageFromFile(e.target.files[0]);
});

// Zoom
document.getElementById("zoomInBtn")?.addEventListener("click", () => {
  applyZoom(getZoom() + 0.1);
  document.getElementById("zoomValue").textContent = Math.round(getZoom()*100)+"%";
});
document.getElementById("zoomOutBtn")?.addEventListener("click", () => {
  applyZoom(getZoom() - 0.1);
  document.getElementById("zoomValue").textContent = Math.round(getZoom()*100)+"%";
});
document.getElementById("zoomResetBtn")?.addEventListener("click", () => {
  applyZoom(1);
  document.getElementById("zoomValue").textContent = "100%";
});

// Pages
document.getElementById("addPageBtn")?.addEventListener("click", () => addPage());
document.getElementById("nextPageBtn")?.addEventListener("click", nextPage);
document.getElementById("prevPageBtn")?.addEventListener("click", prevPage);

// Page size
document.getElementById("pageSizeSelect")?.addEventListener("change", e => {
  setPageSize(e.target.value);
});

// Flipbook
document.getElementById("exportFlipBtn")?.addEventListener("click", () => {
  const html = exportFlipbookHTML();
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
});
