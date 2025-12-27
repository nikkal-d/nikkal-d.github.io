// js/ui.js
import {
  initCanvas,
  addText,
  addImageFromFile,
  setZoom,
  getZoom,
  resetZoom,
  fitToScreen,
  addPage,
  goToPage,
  pageInfo,
  previewFlipbook
} from "./core.js";

document.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  // TEXT
  document.getElementById("addTextBtn")?.addEventListener("click", addText);

  // IMAGE
  document.getElementById("imageInput")?.addEventListener("change", e => {
    if (e.target.files[0]) addImageFromFile(e.target.files[0]);
  });

  // ZOOM
  const zoomVal = document.getElementById("zoomValue");
  const updateZoom = () => zoomVal.textContent = Math.round(getZoom() * 100) + "%";

  document.getElementById("zoomInBtn")?.addEventListener("click", () => {
    setZoom(getZoom() + 0.1); updateZoom();
  });
  document.getElementById("zoomOutBtn")?.addEventListener("click", () => {
    setZoom(getZoom() - 0.1); updateZoom();
  });
  document.getElementById("zoomResetBtn")?.addEventListener("click", () => {
    resetZoom(); updateZoom();
  });
  document.getElementById("fitBtn")?.addEventListener("click", fitToScreen);

  updateZoom();

  // PAGES
  document.getElementById("addPageBtn")?.addEventListener("click", () => {
    addPage();
    const info = pageInfo();
    document.getElementById("pageInfo").textContent = `${info.current} / ${info.total}`;
  });

  // FLIPBOOK PREVIEW
  document.getElementById("previewFlipBtn")?.addEventListener("click", () => {
    const url = previewFlipbook();
    const frame = document.getElementById("flipPreviewFrame");
    frame.src = url;
    document.getElementById("flipPreviewModal").classList.add("open");
  });

  document.getElementById("closeFlipPreview")?.addEventListener("click", () => {
    document.getElementById("flipPreviewModal").classList.remove("open");
  });
});
