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
    const file = e.target.files[0];
    if (file) addImageFromFile(file);
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
  const z = document.getElementById("zoomValue");
  if (z) z.textContent = Math.round(getZoom() * 100) + "%";
}

function updatePageInfo() {
  const info = document.getElementById("pageInfo");
  if (!info) return;
  const p = getPageInfo();
  info.textContent = `${p.current} / ${p.total}`;
}
