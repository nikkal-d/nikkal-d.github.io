import {
  addText,
  addImageFromFile,
  setZoom,
  resetZoom,
  exportFlipbook,
  setCanvasSize
} from "./core.js";

document.getElementById("addTextBtn")?.addEventListener("click", addText);

document.getElementById("imageInput")?.addEventListener("change", e => {
  if (e.target.files[0]) addImageFromFile(e.target.files[0]);
});

document.getElementById("zoomInBtn")?.onclick = () => setZoom(0.1);
document.getElementById("zoomOutBtn")?.onclick = () => setZoom(-0.1);
document.getElementById("zoomResetBtn")?.onclick = resetZoom;

document.getElementById("exportFlipbookBtn")?.onclick = exportFlipbook;

document.getElementById("canvasSizeBtn")?.onclick = () => {
  setCanvasSize(1240, 1754); // A4
};
