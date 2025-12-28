import {
  initCanvas,
  addText,
  addPage,
  prevPage,
  nextPage,
  setZoom,
  getZoom,
  resetZoom,
  exportFlipbook
} from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas("A4P");

  document.getElementById("addTextBtn").onclick = addText;
  document.getElementById("addPageBtn").onclick = addPage;
  document.getElementById("prevPageBtn").onclick = prevPage;
  document.getElementById("nextPageBtn").onclick = nextPage;

  document.getElementById("zoomInBtn").onclick = () => {
    setZoom(getZoom() + 0.1);
    updateZoom();
  };
  document.getElementById("zoomOutBtn").onclick = () => {
    setZoom(getZoom() - 0.1);
    updateZoom();
  };
  document.getElementById("zoomResetBtn").onclick = () => {
    resetZoom();
    updateZoom();
  };

  document.getElementById("exportFlipBtn").onclick = exportFlipbook;
});

function updateZoom() {
  document.getElementById("zoomValue").textContent =
    Math.round(getZoom() * 100) + "%";
}
