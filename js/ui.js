
// js/ui.js
import {
  fabricCanvas,
  addText,
  addImageFromFile,
  addRect, addCircle, addLine,
  getZoom, zoomIn, zoomOut, resetZoom, fitToScreen, setZoom,
  setCanvasSizePreset,
  addPage, duplicatePage, deletePage, prevPage, nextPage, goToPage,
  refreshThumbnails, updatePageInfo,
  bringForward, sendBackwards, deleteActiveObject,
  previewFlipbook, closeFlipbookPreview,
  downloadFlipbook, exportFlipbookLink
} from "./core.js";

const $ = (id) => document.getElementById(id);

function safeOn(id, event, fn){
  const el = $(id);
  if (!el) return;
  el.addEventListener(event, fn);
}

function updateZoomLabel(){
  const el = $("zoomValue");
  if (!el) return;
  el.textContent = Math.round(getZoom()*100) + "%";
}

function getTextOpts(){
  return {
    text: "Text",
    fontFamily: $("fontSelect")?.value || "Arial",
    fontSize: $("fontSizeInput")?.value || 48,
    fill: $("textColorInput")?.value || "#111111",
    bold: $("boldBtn")?.classList.contains("active"),
    italic: $("italicBtn")?.classList.contains("active"),
    underline: $("underlineBtn")?.classList.contains("active"),
    align: window.__pb_textAlign || "left"
  };
}

function toggleActive(btnId){
  const el = $(btnId);
  if (!el) return;
  el.classList.toggle("active");
}

// -------------------- bindings --------------------
window.addEventListener("DOMContentLoaded", () => {
  // TEXT
  safeOn("addTextBtn", "click", () => addText(getTextOpts()));
  safeOn("boldBtn", "click", () => toggleActive("boldBtn"));
  safeOn("italicBtn", "click", () => toggleActive("italicBtn"));
  safeOn("underlineBtn", "click", () => toggleActive("underlineBtn"));

  safeOn("alignLeftBtn", "click", () => { window.__pb_textAlign="left"; });
  safeOn("alignCenterBtn", "click", () => { window.__pb_textAlign="center"; });
  safeOn("alignRightBtn", "click", () => { window.__pb_textAlign="right"; });

  // IMAGES
  const imgInput = $("imageInput");
  if (imgInput){
    imgInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) addImageFromFile(file);
      e.target.value = "";
    });
  }

  // SHAPES
  safeOn("addRectBtn", "click", addRect);
  safeOn("addCircleBtn", "click", addCircle);
  safeOn("addLineBtn", "click", addLine);

  // LAYERS basic
  safeOn("bringFwdBtn", "click", bringForward);
  safeOn("sendBackBtn", "click", sendBackwards);
  safeOn("deleteObjBtn", "click", deleteActiveObject);

  // ZOOM
  safeOn("zoomInBtn", "click", () => { zoomIn(); updateZoomLabel(); });
  safeOn("zoomOutBtn", "click", () => { zoomOut(); updateZoomLabel(); });
  safeOn("zoomResetBtn", "click", () => { resetZoom(); updateZoomLabel(); });
  safeOn("zoomFitBtn", "click", () => { fitToScreen(); updateZoomLabel(); });
  safeOn("fitBtn", "click", () => { fitToScreen(); updateZoomLabel(); });

  // Page size
  safeOn("pageSizeSelect", "change", (e) => {
    setCanvasSizePreset(e.target.value);
    updateZoomLabel();
  });

  // PAGES
  safeOn("addPageBtn", "click", () => { addPage(); updateZoomLabel(); });
  safeOn("dupPageBtn", "click", () => { duplicatePage(); updateZoomLabel(); });
  safeOn("delPageBtn", "click", () => { deletePage(); updateZoomLabel(); });
  safeOn("prevPageBtn", "click", () => { prevPage(); updateZoomLabel(); });
  safeOn("nextPageBtn", "click", () => { nextPage(); updateZoomLabel(); });

  // EXPORT / PREVIEW
  const dirSel = $("flipDirectionSelect");
  const getDir = () => dirSel?.value || "horizontal";

  safeOn("previewFlipBtn", "click", async () => { await previewFlipbook(getDir()); });
  safeOn("exportFlipBtn", "click", async () => { await downloadFlipbook(getDir()); });
  safeOn("exportLinkBtn", "click", async () => { await exportFlipbookLink(getDir()); });

  // Close preview modal
  safeOn("closeFlipPreview", "click", closeFlipbookPreview);
  const modal = $("flipPreviewModal");
  if (modal){
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeFlipbookPreview();
    });
  }

  // Keep zoom label synced on first paint
  updateZoomLabel();

  // Also re-fit when window resizes (so canvas stays visible)
  window.addEventListener("resize", () => {
    // don't be aggressive; just keep label correct
    updateZoomLabel();
  });
});
