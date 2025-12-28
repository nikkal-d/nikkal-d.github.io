// js/ui.js
import {
  initCanvas,
  addText,
  addRect,
  addCircle,
  addImageFromFile,
  addPage,
  prevPage,
  nextPage,
  setPageSize,
} from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  // TEXT
  document.getElementById("addTextBtn")?.addEventListener("click", addText);

  // SHAPES
  document.getElementById("addRectBtn")?.addEventListener("click", addRect);
  document.getElementById("addCircleBtn")?.addEventListener("click", addCircle);

  // IMAGE
  document.getElementById("imageInput")?.addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) addImageFromFile(file);
  });

  // PAGES
  document.getElementById("addPageBtn")?.addEventListener("click", addPage);
  document.getElementById("prevPageBtn")?.addEventListener("click", prevPage);
  document.getElementById("nextPageBtn")?.addEventListener("click", nextPage);

  // PAGE SIZE
  document.getElementById("pageSizeSelect")?.addEventListener("change", e => {
    setPageSize(e.target.value);
  });
});
