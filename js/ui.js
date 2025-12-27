// js/ui.js
import {
  initCanvas,
  addText,
  addImageFromFile,
  addPage,
  goToPage,
  setZoom,
  getZoom,
  setCanvasSize,
  exportFlipbookHTML
} from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  document.getElementById("addTextBtn").onclick = addText;

  document.getElementById("imageInput").onchange = e => {
    if (e.target.files[0]) addImageFromFile(e.target.files[0]);
  };

  document.getElementById("addPageBtn").onclick = addPage;

  document.getElementById("zoomIn").onclick = () => {
    setZoom(getZoom() + 0.1);
    document.getElementById("zoomValue").textContent = Math.round(getZoom()*100)+"%";
  };

  document.getElementById("zoomOut").onclick = () => {
    setZoom(getZoom() - 0.1);
    document.getElementById("zoomValue").textContent = Math.round(getZoom()*100)+"%";
  };

  document.getElementById("a4Btn").onclick = () => setCanvasSize(1240,1754);
  document.getElementById("squareBtn").onclick = () => setCanvasSize(1200,1200);

  document.getElementById("exportFlipbookBtn").onclick = () => {
    const url = exportFlipbookHTML();
    window.open(url, "_blank");
  };
});
