// ui.js
import {
  initCanvas,
  addText,
  addRect,
  addCircle,
  addLine,
  addImageFromFile,
  addPage,
  nextPage,
  prevPage,
  zoomIn,
  zoomOut,
  zoomReset,
  exportFlipbook,
} from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  bind("addTextBtn", addText);
  bind("addRectBtn", addRect);
  bind("addCircleBtn", addCircle);
  bind("addLineBtn", addLine);

  bind("addPageBtn", addPage);
  bind("nextPageBtn", nextPage);
  bind("prevPageBtn", prevPage);

  bind("zoomInBtn", zoomIn);
  bind("zoomOutBtn", zoomOut);
  bind("zoomResetBtn", zoomReset);

  bind("exportFlipBtn", exportFlipbook);

  const imgInput = document.getElementById("imageInput");
  if (imgInput) {
    imgInput.onchange = (e) => {
      if (e.target.files[0]) addImageFromFile(e.target.files[0]);
    };
  }
});

function bind(id, fn) {
  const el = document.getElementById(id);
  if (el) el.onclick = fn;
}
