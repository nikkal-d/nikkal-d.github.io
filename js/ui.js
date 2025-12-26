import {
  initCanvas,
  addText,
  addImageFromFile,
  setZoom,
  getZoom,
  exportFlipbook
} from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  document.getElementById("addTextBtn")?.addEventListener("click", addText);

  document.getElementById("imageInput")?.addEventListener("change", e => {
    if (e.target.files[0]) addImageFromFile(e.target.files[0]);
  });

  document.getElementById("zoomIn")?.addEventListener("click", () => {
    setZoom(getZoom() + 0.1);
    document.getElementById("zoomValue").textContent =
      Math.round(getZoom() * 100) + "%";
  });

  document.getElementById("zoomOut")?.addEventListener("click", () => {
    setZoom(getZoom() - 0.1);
    document.getElementById("zoomValue").textContent =
      Math.round(getZoom() * 100) + "%";
  });

  document.getElementById("exportFlipbookBtn")
    ?.addEventListener("click", exportFlipbook);
});
