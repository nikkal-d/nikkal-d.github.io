// js/ui.js
import {
  initCanvas,
  addText,
  addImageFromFile,
  addPage,
  prevPage,
  nextPage,
  getPageInfo,
  applyZoom,
  getZoom,
} from "./core.js";

document.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  // TEXT
  document.getElementById("addTextBtn")?.addEventListener("click", addText);

  // IMAGE
  document.getElementById("imageInput")?.addEventListener("change", (e) => {
    if (e.target.files[0]) addImageFromFile(e.target.files[0]);
  });

  // PAGES
  document.getElementById("addPageBtn")?.addEventListener("click", () => {
    addPage();
    updatePageInfo();
  });

  document.getElementById("prevPageBtn")?.addEventListener("click", () => {
    prevPage();
    updatePageInfo();
  });

  document.getElementById("nextPageBtn")?.addEventListener("click", () => {
    nextPage();
    updatePageInfo();
  });

  // ZOOM
  document.getElementById("zoomInBtn")?.addEventListener("click", () => {
    applyZoom(getZoom() + 0.1);
    updateZoom();
  });

  document.getElementById("zoomOutBtn")?.addEventListener("click", () => {
    applyZoom(getZoom() - 0.1);
    updateZoom();
  });

  document.getElementById("zoomResetBtn")?.addEventListener("click", () => {
    applyZoom(1);
    updateZoom();
  });

  updateZoom();
  updatePageInfo();
});

function updateZoom() {
  const el = document.getElementById("zoomValue");
  if (el) el.textContent = Math.round(getZoom() * 100) + "%";
}

function updatePageInfo() {
  const el = document.getElementById("pageInfo");
  if (!el) return;
  const p = getPageInfo();
  el.textContent = `${p.current} / ${p.total}`;
}
