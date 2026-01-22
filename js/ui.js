// js/ui.js
// Wires UI controls to core functions (safe bindings)

import {
  initCanvas,
  addText,
  addImageFromFile,
  addPdfFromFile,
  addRect,
  addCircle,
  addLine,
  addTriangle,
  addEllipse,
  setZoom,
  zoomIn,
  zoomOut,
  zoomReset,
  fitToScreen,
  setCanvasSize,
  addPage,
  duplicatePage,
  deletePage,
  prevPage,
  nextPage,
  exportPNG,
  exportJPG,
  exportPDF,
  exportFlipbook,
  previewFlipbook,
  closeFlipbookPreview,
  exportLink,
  cropSelected,
  removeBgSelected,
  setCanvasBackground,
  setActiveFill,
  setActiveStroke,
  setActiveOpacity,
  setTextProps,
  bringForward,
  sendBackwards,
  deleteSelected,
  updateLayersUI,
  clearDraft,
} from "./core.js";

const $ = (id) => document.getElementById(id);
const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };

// ---------- init ----------
document.addEventListener("DOMContentLoaded", async () => {
  await initCanvas({ preset: $("pageSizeSelect")?.value || "A4P" });

  // Pages
  on("addPageBtn", "click", () => addPage());
  on("dupPageBtn", "click", () => duplicatePage());
  on("delPageBtn", "click", () => deletePage());
  on("prevPageBtn", "click", () => prevPage());
  on("nextPageBtn", "click", () => nextPage());

  // Zoom / stage
  on("zoomInBtn", "click", () => zoomIn());
  on("zoomOutBtn", "click", () => zoomOut());
  on("zoomResetBtn", "click", () => zoomReset());
  on("zoomFitBtn", "click", () => fitToScreen());
  on("fitBtn", "click", () => fitToScreen());

  // Page size (canvas dimensions)
  on("pageSizeSelect", "change", (e) => {
    const preset = e.target.value;
    setCanvasSize(preset, true);
  });

  // Text
  on("addTextBtn", "click", () => {
    const font = $("fontSelect")?.value || "Arial";
    const size = Number($("fontSizeInput")?.value || 48);
    const fill = $("textColorInput")?.value || "#111111";
    addText({ fontFamily: font, fontSize: size, fill });
  });

  on("fontSelect", "change", (e) => setTextProps({ fontFamily: e.target.value }));
  on("fontSizeInput", "input", (e) => setTextProps({ fontSize: Number(e.target.value || 48) }));
  on("textColorInput", "input", (e) => setTextProps({ fill: e.target.value }));

  on("boldBtn", "click", () => toggleTextProp("fontWeight", "bold", "normal"));
  on("italicBtn", "click", () => toggleTextProp("fontStyle", "italic", "normal"));
  on("underlineBtn", "click", () => toggleTextProp("underline", true, false));

  on("alignLeftBtn", "click", () => setTextProps({ textAlign: "left" }));
  on("alignCenterBtn", "click", () => setTextProps({ textAlign: "center" }));
  on("alignRightBtn", "click", () => setTextProps({ textAlign: "right" }));

  // Images
  on("imageInput", "change", async (e) => {
    const file = e.target.files?.[0];
    if (file) await addImageFromFile(file);
    e.target.value = "";
  });

  // PDF upload (adds first/selected page as image)
  on("pdfInput", "change", async (e) => {
    const file = e.target.files?.[0];
    if (file) await addPdfFromFile(file);
    e.target.value = "";
  });

  on("cropBtn", "click", () => cropSelected());
  on("removeBgBtn", "click", () => removeBgSelected());

  // Colors
  on("canvasBgColor", "input", (e) => setCanvasBackground(e.target.value));
  on("objFillColor", "input", (e) => setActiveFill(e.target.value));
  on("objStrokeColor", "input", (e) => setActiveStroke(e.target.value, Number($("objStrokeWidth")?.value || 4)));
  on("objStrokeWidth", "input", (e) => setActiveStroke($("objStrokeColor")?.value || "#000000", Number(e.target.value || 4)));
  on("objOpacity", "input", (e) => setActiveOpacity(Number(e.target.value || 1)));

  document.querySelectorAll("[data-bg]").forEach(btn => {
    btn.addEventListener("click", () => setCanvasBackground(btn.dataset.bg));
  });

  // Shapes
  on("addRectBtn", "click", () => addRect());
  on("addCircleBtn", "click", () => addCircle());
  on("addLineBtn", "click", () => addLine());
  on("addTriBtn", "click", () => addTriangle());
  on("addEllBtn", "click", () => addEllipse());

  // Layers
  on("bringFwdBtn", "click", () => bringForward());
  on("sendBackBtn", "click", () => sendBackwards());
  on("deleteObjBtn", "click", () => deleteSelected());

  // Export
 on("exportPngBtn", "click", async () => {
  const multiplier = prompt("Εισάγετε κλίμακα ποιότητας (1 = Κανονική, 2 = Υψηλή, 3 = Πολύ Υψηλή):", "2");
  if (multiplier) exportPNG(parseFloat(multiplier));
});
 on("exportJpgBtn", "click", async () => {
  const multiplier = prompt("Εισάγετε κλίμακα ποιότητας (1 = Κανονική, 2 = Υψηλή, 3 = Πολύ Υψηλή):", "2");
  if (multiplier) exportJPG(parseFloat(multiplier));
});
  on("exportPdfBtn", "click", () => exportPDF());
 on("exportFlipbookBtn", "click", () => {
    previewFlipbook(); // Αυτό πλέον κάνει το "Export" με το PDF μέσα
});
  on("previewFlipBtn", "click", async () => {
    const dir = $("flipDirSelect")?.value || "horizontal";
    await previewFlipbook({ direction: dir });
  });
  on("closeFlipPreview", "click", () => closeFlipbookPreview());
  on("exportLinkBtn", "click", () => exportLink());
  on("clearDraftBtn", "click", () => clearDraft());

  // Keep layers refreshed when something changes (core already listens, but this helps on UI load)
  updateLayersUI();
});

// ---------- helpers ----------
function toggleTextProp(key, onVal, offVal) {
  // Read selection style via fabric active object if possible
  // We don't import getActiveObject to keep ui small; we just set the property toggling.
  // Toggle by reading current style from DOM inputs if present; fallback to off->on.
  // (Core will ignore if selection isn't text)
  const guess = (onVal === true) ? false : offVal;
  setTextProps({ [key]: guess });
  // second pass: if it was off, set on (best-effort)
  setTimeout(() => setTextProps({ [key]: onVal }), 0);
}


