// ui.js
// Wires UI buttons/inputs to core.js exports (safe guards for missing elements)

import {
  initCanvas,
  addText,
  addImageFromFile,
  addRect,
  addCircle,
  addLine,
  setCanvasSizePreset,
  setCanvasCustom,
  getZoom,
  zoomIn,
  zoomOut,
  resetZoom,
  fitToScreen,
  addPage,
  duplicatePage,
  deletePage,
  nextPage,
  prevPage,
  goToPage,
  exportPNG,
  exportJPG,
  exportPDF,
  exportFlipbook,
  previewFlipbook,
  closeFlipbookPreview,
  copyFlipbookDataLink
} from "./core.js";

const $ = (id) => document.getElementById(id);

// Init
document.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  // -------- Pages --------
  $("addPageBtn")?.addEventListener("click", addPage);
  $("dupPageBtn")?.addEventListener("click", duplicatePage);
  $("delPageBtn")?.addEventListener("click", deletePage);
  $("nextPageBtn")?.addEventListener("click", nextPage);
  $("prevPageBtn")?.addEventListener("click", prevPage);

  // -------- Size preset --------
  $("pageSizeSelect")?.addEventListener("change", (e) => {
    setCanvasSizePreset(e.target.value);
  });

  // Optional custom size inputs if you add them in HTML later:
  $("canvasWInput")?.addEventListener("change", () => {
    setCanvasCustom($("canvasWInput").value, $("canvasHInput").value);
  });
  $("canvasHInput")?.addEventListener("change", () => {
    setCanvasCustom($("canvasWInput").value, $("canvasHInput").value);
  });

  // -------- Text --------
  $("addTextBtn")?.addEventListener("click", () => {
    const fontFamily = $("fontSelect")?.value || "Arial";
    const fontSize = Number($("fontSizeInput")?.value || 48);
    const fill = $("textColorInput")?.value || "#111111";
    addText({ fontFamily, fontSize, fill });
  });

  // -------- Images --------
  $("imageInput")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) addImageFromFile(file);
    e.target.value = "";
  });

  // -------- Shapes --------
  $("addRectBtn")?.addEventListener("click", addRect);
  $("addCircleBtn")?.addEventListener("click", addCircle);
  $("addLineBtn")?.addEventListener("click", addLine);

  // -------- Zoom --------
  const zoomValue = $("zoomValue");
  const syncZoomLabel = () => {
    if (!zoomValue) return;
    zoomValue.textContent = Math.round(getZoom() * 100) + "%";
  };
  syncZoomLabel();

  $("zoomInBtn")?.addEventListener("click", () => { zoomIn(); syncZoomLabel(); });
  $("zoomOutBtn")?.addEventListener("click", () => { zoomOut(); syncZoomLabel(); });
  $("zoomResetBtn")?.addEventListener("click", () => { resetZoom(); syncZoomLabel(); });
  $("zoomFitBtn")?.addEventListener("click", () => { fitToScreen(); syncZoomLabel(); });
  $("fitBtn")?.addEventListener("click", () => { fitToScreen(); syncZoomLabel(); });

  // -------- Export --------
  const getOrientation = () => $("flipOrientation")?.value || "horizontal";

  $("exportPngBtn")?.addEventListener("click", exportPNG);
  $("exportJpgBtn")?.addEventListener("click", exportJPG);
  $("exportPdfBtn")?.addEventListener("click", exportPDF);

  $("exportFlipBtn")?.addEventListener("click", () => exportFlipbook({ orientation: getOrientation() }));
  $("previewFlipBtn")?.addEventListener("click", () => previewFlipbook({ orientation: getOrientation() }));
  $("exportLinkBtn")?.addEventListener("click", () => copyFlipbookDataLink({ orientation: getOrientation() }));

  $("closeFlipPreview")?.addEventListener("click", closeFlipbookPreview);
  $("flipPreviewModal")?.addEventListener("click", (e) => {
    if (e.target?.id === "flipPreviewModal") closeFlipbookPreview();
  });
});
