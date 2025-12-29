// js/ui.js
import {
  initCanvas,
  fabricCanvas,
  addText,
  addImageFromFile,
  addPage,
  duplicatePage,
  deletePage,
  nextPage,
  prevPage,
  goToPage,
  setZoom,
  getZoom,
  fitToHost,
  resetZoom,
  setPageSizePreset,
  setCanvasSize,
  exportFlipbookHTML,
  previewFlipbook,
  closeFlipPreview,
  exportFlipbookLink,
  addRect,
  addCircle,
  addLine
} from "./core.js";

function $(id){ return document.getElementById(id); }

function safeOn(id, evt, fn){
  const el = $(id);
  if (el) el.addEventListener(evt, fn);
}

function updateZoomLabel(){
  const z = Math.round(getZoom() * 100);
  const el = $("zoomValue");
  if (el) el.textContent = z + "%";
}

document.addEventListener("DOMContentLoaded", () => {
  initCanvas();

  // Resize observer -> keep canvas fitted & centered
  const host = $("canvasHost");
  if (host && "ResizeObserver" in window){
    const ro = new ResizeObserver(() => {
      fitToHost();
      updateZoomLabel();
    });
    ro.observe(host);
  }

  // --- TEXT ---
  safeOn("addTextBtn","click", () => {
    const font = $("fontSelect")?.value || "Arial";
    const size = Number($("fontSizeInput")?.value || 48);
    const color = $("textColorInput")?.value || "#111111";
    addText({ fontFamily: font, fontSize: size, fill: color, text: "Text" });
  });

  // Basic style buttons (selected object)
  safeOn("boldBtn","click", () => {
    const o = fabricCanvas?.getActiveObject?.();
    if (o && "fontWeight" in o){ o.set("fontWeight", o.fontWeight === "bold" ? "normal" : "bold"); fabricCanvas.requestRenderAll(); }
  });
  safeOn("italicBtn","click", () => {
    const o = fabricCanvas?.getActiveObject?.();
    if (o && "fontStyle" in o){ o.set("fontStyle", o.fontStyle === "italic" ? "normal" : "italic"); fabricCanvas.requestRenderAll(); }
  });
  safeOn("underlineBtn","click", () => {
    const o = fabricCanvas?.getActiveObject?.();
    if (o && "underline" in o){ o.set("underline", !o.underline); fabricCanvas.requestRenderAll(); }
  });

  // --- IMAGES ---
  const imgInput = $("imageInput");
  if (imgInput){
    imgInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) addImageFromFile(file);
      imgInput.value = "";
    });
  }

  // --- SHAPES ---
  safeOn("addRectBtn","click", addRect);
  safeOn("addCircleBtn","click", addCircle);
  safeOn("addLineBtn","click", addLine);

  // --- PAGES ---
  safeOn("addPageBtn","click", addPage);
  safeOn("dupPageBtn","click", duplicatePage);
  safeOn("delPageBtn","click", deletePage);
  safeOn("nextPageBtn","click", nextPage);
  safeOn("prevPageBtn","click", prevPage);

  // --- CANVAS BACKGROUND ---
  safeOn("canvasBgColor","input", (e) => {
    const v = e.target.value;
    if (!fabricCanvas) return;
    fabricCanvas.setBackgroundColor(v, fabricCanvas.requestRenderAll.bind(fabricCanvas));
  });

  // --- ZOOM (canvas viewport) ---
  safeOn("zoomInBtn","click", () => { setZoom(getZoom() * 1.12); updateZoomLabel(); });
  safeOn("zoomOutBtn","click", () => { setZoom(getZoom() / 1.12); updateZoomLabel(); });
  safeOn("zoomResetBtn","click", () => { resetZoom(); updateZoomLabel(); });
  safeOn("zoomFitBtn","click", () => { fitToHost(); updateZoomLabel(); });
  safeOn("fitBtn","click", () => { fitToHost(); updateZoomLabel(); });

  // --- PAGE SIZE ---
  safeOn("pageSizeSelect","change", (e) => {
    setPageSizePreset(e.target.value);
    fitToHost();
    updateZoomLabel();
  });

  // Optional custom size inputs if present (future)
  safeOn("applyCustomSizeBtn","click", () => {
    const w = Number($("customW")?.value);
    const h = Number($("customH")?.value);
    if (w && h) setCanvasSize(w,h);
    fitToHost();
    updateZoomLabel();
  });

  // --- FLIPBOOK ---
  safeOn("previewFlipBtn","click", async () => {
    await previewFlipbook("horizontal");
  });
  safeOn("exportFlipBtn","click", async () => {
    await exportFlipbookHTML("horizontal");
  });
  safeOn("exportLinkBtn","click", async () => {
    await exportFlipbookLink("horizontal");
  });
  safeOn("closeFlipPreview","click", closeFlipPreview);

  // Close modal by clicking backdrop
  const modal = $("flipPreviewModal");
  if (modal){
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeFlipPreview();
    });
  }

  // initial UI sync
  updateZoomLabel();
});
