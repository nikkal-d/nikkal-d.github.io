// js/ui.js
// Wires UI controls to core functions (safe: no null crashes)

import {
  initCanvas,
  addText,
  addImageFromFile,
  addRect,
  addCircle,
  addLine,
  setPageSize,
  setCanvasBackground,
  setZoom,
  zoomIn,
  zoomOut,
  fitToScreen,
  resetZoom,
  nextPage,
  prevPage,
  addPage,
  duplicatePage,
  deletePage,
  goToPage,
  refreshThumbnails,
  refreshLayers,
  setActiveFontFamily,
  setActiveFontSize,
  setActiveFill,
  setActiveStroke,
  setActiveOpacity,
  cropSelected,
  removeBgSelected,
  exportFlipbook,
  exportFlipbookLink,
  previewFlipbook,
  closeFlipbookPreview,
  exportPrintablePDF,
} from "./core.js";

const $ = (id) => document.getElementById(id);

function on(id, evt, fn){
  const el = $(id);
  if (!el) return;
  el.addEventListener(evt, fn);
}

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  // Pages
  on("addPageBtn", "click", () => addPage());
  on("dupPageBtn", "click", () => duplicatePage());
  on("delPageBtn", "click", () => deletePage());
  on("nextPageBtn", "click", () => nextPage());
  on("prevPageBtn", "click", () => prevPage());

  // Text
  on("addTextBtn", "click", () => addText("Text"));
  on("fontSelect", "change", (e) => setActiveFontFamily(e.target.value));
  on("fontSizeInput", "input", (e) => setActiveFontSize(e.target.value));
  on("textColorInput", "input", (e) => setActiveFill(e.target.value));

  // extra text stroke + opacity (if controls exist)
  on("textStrokeInput", "input", (e) => setActiveStroke(e.target.value));
  on("opacityInput", "input", (e) => setActiveOpacity(Number(e.target.value)/100));

  // Images
  const imgInput = $("imageInput");
  if (imgInput){
    imgInput.addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (f) addImageFromFile(f);
      imgInput.value = "";
    });
  }

  on("removeBgBtn", "click", () => removeBgSelected());
  on("cropBtn", "click", () => cropSelected());

  // Colors (canvas bg)
  on("canvasBgColor", "input", (e) => setCanvasBackground(e.target.value));
  document.querySelectorAll("[data-bg]").forEach(btn => {
    btn.addEventListener("click", () => {
      const c = btn.getAttribute("data-bg");
      if (c) setCanvasBackground(c);
      const picker = $("canvasBgColor");
      if (picker) picker.value = c;
    });
  });

  // Shapes
  on("addRectBtn", "click", () => addRect());
  on("addCircleBtn", "click", () => addCircle());
  on("addLineBtn", "click", () => addLine());

  // Zoom (canvas zoom)
  on("zoomInBtn", "click", () => zoomIn());
  on("zoomOutBtn", "click", () => zoomOut());
  on("zoomResetBtn", "click", () => resetZoom());
  on("zoomFitBtn", "click", () => fitToScreen());
  on("fitBtn", "click", () => fitToScreen());

  // Page size
  on("pageSizeSelect", "change", (e) => setPageSize(e.target.value));

  // Export
  on("exportFlipBtn", "click", async () => exportFlipbook());
  on("exportPdfBtn", "click", async () => exportPrintablePDF());
  on("previewFlipBtn", "click", async () => previewFlipbook());
  on("closeFlipPreview", "click", () => closeFlipbookPreview());

  on("exportLinkBtn", "click", async () => {
    const url = await exportFlipbookLink();
    try{
      await navigator.clipboard.writeText(url);
      alert("Link copied (temporary blob link).");
    }catch(_e){
      prompt("Copy this link:", url);
    }
  });

  // Keep UI lists fresh (when user clicks tabs etc)
  // (core already refreshes on object/page changes, but safe)
  setInterval(() => {
    refreshLayers();
    refreshThumbnails();
  }, 1500);
});
