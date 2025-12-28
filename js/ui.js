// js/ui.js
import {
  initCanvas,
  addText,
  addPage,
  goToPage,
  getPageInfo,
  zoomIn,
  zoomOut,
  resetZoom,
  getZoom,
  setCanvasSize
} from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();
  bindUI();
  updatePageInfo();
  updateZoomLabel();
});

function bindUI() {
  // TEXT
  document.getElementById("addTextBtn")?.addEventListener("click", addText);

  // PAGES
  document.getElementById("addPageBtn")?.addEventListener("click", () => {
    addPage();
    updatePageInfo();
  });

  document.getElementById("prevPageBtn")?.addEventListener("click", () => {
    const info = getPageInfo();
    goToPage(info.current - 2);
    updatePageInfo();
  });

  document.getElementById("nextPageBtn")?.addEventListener("click", () => {
    const info = getPageInfo();
    goToPage(info.current);
    updatePageInfo();
  });

  // ZOOM
  document.getElementById("zoomInBtn")?.addEventListener("click", () => {
    zoomIn();
    updateZoomLabel();
  });

  document.getElementById("zoomOutBtn")?.addEventListener("click", () => {
    zoomOut();
    updateZoomLabel();
  });

  document.getElementById("zoomResetBtn")?.addEventListener("click", () => {
    resetZoom();
    updateZoomLabel();
  });

  // PAGE SIZE
  document.getElementById("pageSizeSelect")?.addEventListener("change", (e) => {
    const v = e.target.value;
    const sizes = {
      A4P: [1240, 1754],
      A4L: [1754, 1240],
      SQUARE: [1400, 1400],
      HD: [1920, 1080],
    };
    if (sizes[v]) setCanvasSize(...sizes[v]);
  });
}

function updatePageInfo() {
  const info = getPageInfo();
  const el = document.getElementById("pageInfo");
  if (el) el.textContent = `${info.current} / ${info.total}`;
}

function updateZoomLabel() {
  const el = document.getElementById("zoomValue");
  if (el) el.textContent = Math.round(getZoom() * 100) + "%";
}
