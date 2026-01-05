// js/ui.js
// UI bindings (no inline onclick) - depends on core.js exports

import {
  initCanvas,
  addText,
  addImageFromFile,
  addRect,
  addCircle,
  addLine,
  zoomIn,
  zoomOut,
  resetZoom,
  fitToScreen,
  setCanvasPreset,
  setCanvasCustom,
  addPage,
  duplicatePage,
  deletePage,
  prevPage,
  nextPage,
  goToPage,
  previewFlipbook,
  closeFlipbookPreview,
  exportFlipbookLink
} from "./core.js";

const $ = (id) => document.getElementById(id);

initCanvas();

// -------- Pages --------
$("addPageBtn")?.addEventListener("click", addPage);
$("dupPageBtn")?.addEventListener("click", duplicatePage);
$("delPageBtn")?.addEventListener("click", deletePage);
$("prevPageBtn")?.addEventListener("click", prevPage);
$("nextPageBtn")?.addEventListener("click", nextPage);

// Clicking thumbnails handled in core.refreshThumbnails()

// -------- Text --------
$("addTextBtn")?.addEventListener("click", () => {
  const fontFamily = $("fontSelect")?.value || "Arial";
  const fontSize = Number($("fontSizeInput")?.value) || 48;
  const fill = $("textColorInput")?.value || "#111111";
  addText({ fontFamily, fontSize, fill });
});

// -------- Images --------
$("imageInput")?.addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (f) addImageFromFile(f);
  e.target.value = "";
});

// -------- Shapes --------
$("addRectBtn")?.addEventListener("click", addRect);
$("addCircleBtn")?.addEventListener("click", addCircle);
$("addLineBtn")?.addEventListener("click", addLine);

// -------- Zoom / Fit --------
$("zoomInBtn")?.addEventListener("click", zoomIn);
$("zoomOutBtn")?.addEventListener("click", zoomOut);
$("zoomResetBtn")?.addEventListener("click", resetZoom);
$("fitBtn")?.addEventListener("click", fitToScreen);
$("zoomFitBtn")?.addEventListener("click", fitToScreen);

// -------- Size preset --------
$("pageSizeSelect")?.addEventListener("change", (e) => {
  setCanvasPreset(e.target.value);
});

// -------- Flipbook preview/export --------
$("previewFlipBtn")?.addEventListener("click", () => previewFlipbook({ direction: "horizontal" }));
$("closeFlipPreview")?.addEventListener("click", closeFlipbookPreview);
$("flipPreviewModal")?.addEventListener("click", (e) => {
  if (e.target?.id === "flipPreviewModal") closeFlipbookPreview();
});

$("exportFlipBtn")?.addEventListener("click", async () => {
  const url = await exportFlipbookLink({ direction: "horizontal" });
  // open in new tab
  window.open(url, "_blank", "noopener,noreferrer");
});

$("exportLinkBtn")?.addEventListener("click", async () => {
  const url = await exportFlipbookLink({ direction: "horizontal" });
  await navigator.clipboard?.writeText(url);
  alert("Link αντιγράφηκε (τοπικό link - δουλεύει μόνο στον ίδιο browser).");
});
