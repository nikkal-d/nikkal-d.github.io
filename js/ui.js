// js/ui.js
// Wires buttons -> core functions (safe guards, no null crashes)

import {
  fabricCanvas,
  addText,
  addImageFromFile,
  addRect,
  addCircle,
  addLine,
  setZoom,
  getZoom,
  resetZoom,
  fitToScreen,
  setCanvasSizePreset,
  setCanvasCustom,
  setCanvasBackground,
  addPage,
  duplicatePage,
  deletePage,
  nextPage,
  prevPage,
  goToPage,
  refreshThumbnails,
  updatePageInfo,
  bringForward,
  sendBackwards,
  deleteActive,
  exportFlipbook,
  previewFlipbook,
  makeFlipbookLink
} from "./core.js";

const $ = (id)=>document.getElementById(id);

function setHint(msg){
  const el = $("exportHint");
  if (el) el.textContent = msg || "";
}

function updateZoomLabel(){
  const z = Math.round(getZoom()*100);
  const el = $("zoomValue");
  if (el) el.textContent = `${z}%`;
}

window.addEventListener("DOMContentLoaded", () => {
  // -------- Text
  $("addTextBtn")?.addEventListener("click", () => {
    const font = $("fontSelect")?.value || "Arial";
    const fontSize = Number($("fontSizeInput")?.value || 48);
    const fill = $("textColorInput")?.value || "#111111";
    addText({ fontFamily: font, fontSize, fill });
  });

  // simple formatting on active textbox
  const applyToActiveText = (fn) => {
    const obj = fabricCanvas?.getActiveObject?.();
    if (!obj || obj.type !== "textbox") return;
    fn(obj);
    fabricCanvas.requestRenderAll();
  };

  $("boldBtn")?.addEventListener("click", ()=>applyToActiveText(o=>{
    o.set("fontWeight", o.fontWeight === "bold" ? "normal" : "bold");
  }));
  $("italicBtn")?.addEventListener("click", ()=>applyToActiveText(o=>{
    o.set("fontStyle", o.fontStyle === "italic" ? "normal" : "italic");
  }));
  $("underlineBtn")?.addEventListener("click", ()=>applyToActiveText(o=>{
    o.set("underline", !o.underline);
  }));

  $("alignLeftBtn")?.addEventListener("click", ()=>applyToActiveText(o=>o.set("textAlign","left")));
  $("alignCenterBtn")?.addEventListener("click", ()=>applyToActiveText(o=>o.set("textAlign","center")));
  $("alignRightBtn")?.addEventListener("click", ()=>applyToActiveText(o=>o.set("textAlign","right")));

  $("fontSelect")?.addEventListener("change",(e)=>applyToActiveText(o=>o.set("fontFamily", e.target.value)));
  $("fontSizeInput")?.addEventListener("change",(e)=>applyToActiveText(o=>o.set("fontSize", Number(e.target.value)||48)));
  $("textColorInput")?.addEventListener("input",(e)=>applyToActiveText(o=>o.set("fill", e.target.value)));

  // -------- Images
  $("imageInput")?.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) addImageFromFile(file);
    e.target.value = "";
  });

  // -------- Colors
  $("canvasBgColor")?.addEventListener("input",(e)=>setCanvasBackground(e.target.value));
  $("objFillColor")?.addEventListener("input",(e)=>{
    const obj = fabricCanvas?.getActiveObject?.();
    if (!obj) return;
    if (obj.set) obj.set("fill", e.target.value);
    fabricCanvas.requestRenderAll();
  });
  document.querySelectorAll("[data-bg]")?.forEach(btn=>{
    btn.addEventListener("click", ()=>setCanvasBackground(btn.dataset.bg));
  });

  // -------- Shapes
  $("addRectBtn")?.addEventListener("click", addRect);
  $("addCircleBtn")?.addEventListener("click", addCircle);
  $("addLineBtn")?.addEventListener("click", addLine);

  // -------- Layers
  $("bringFwdBtn")?.addEventListener("click", bringForward);
  $("sendBackBtn")?.addEventListener("click", sendBackwards);
  $("deleteObjBtn")?.addEventListener("click", deleteActive);

  // -------- Pages
  $("addPageBtn")?.addEventListener("click", addPage);
  $("dupPageBtn")?.addEventListener("click", duplicatePage);
  $("delPageBtn")?.addEventListener("click", deletePage);
  $("nextPageBtn")?.addEventListener("click", nextPage);
  $("prevPageBtn")?.addEventListener("click", prevPage);

  // -------- Zoom
  $("zoomInBtn")?.addEventListener("click", ()=>{ setZoom(getZoom()+0.1); updateZoomLabel(); });
  $("zoomOutBtn")?.addEventListener("click", ()=>{ setZoom(getZoom()-0.1); updateZoomLabel(); });
  $("zoomResetBtn")?.addEventListener("click", ()=>{ resetZoom(); updateZoomLabel(); });
  $("zoomFitBtn")?.addEventListener("click", ()=>{ fitToScreen(); updateZoomLabel(); });
  $("fitBtn")?.addEventListener("click", ()=>{ fitToScreen(); updateZoomLabel(); });

  // -------- Page size
  $("pageSizeSelect")?.addEventListener("change", (e)=>{
    const v = e.target.value;
    if (v === "CUSTOM") return; // handled by button
    setCanvasSizePreset(v);
    updateZoomLabel();
  });

  $("customSizeBtn")?.addEventListener("click", ()=>{
    const w = prompt("Canvas width (px):", String(fabricCanvas?.getWidth?.() || 1240));
    if (w === null) return;
    const h = prompt("Canvas height (px):", String(fabricCanvas?.getHeight?.() || 1754));
    if (h === null) return;
    setCanvasCustom(w,h);
    updateZoomLabel();
  });

  // -------- Export / Preview flipbook
  const modal = $("flipPreviewModal");
  const frame = $("flipPreviewFrame");

  $("closeFlipPreview")?.addEventListener("click", ()=>{
    modal?.classList.remove("open");
    if (frame) frame.srcdoc = "";
  });

  $("previewFlipBtn")?.addEventListener("click", async ()=>{
    const direction = $("flipDirectionSelect")?.value || "horizontal";
    const { html } = await previewFlipbook({ direction });
    if (frame) frame.srcdoc = html;
    modal?.classList.add("open");
    setHint("Preview ready.");
  });

  $("exportFlipBtn")?.addEventListener("click", async ()=>{
    const direction = $("flipDirectionSelect")?.value || "horizontal";
    await exportFlipbook({ direction });
    setHint("Flipbook exported: flipbook.html downloaded.");
  });

  $("exportLinkBtn")?.addEventListener("click", ()=>{
    const direction = $("flipDirectionSelect")?.value || "horizontal";
    const link = makeFlipbookLink({ direction });
    navigator.clipboard?.writeText(link).catch(()=>{});
    setHint("Link copied (viewer.html#pb=...). For small projects.");
    alert("Link copied to clipboard:\n\n" + link);
  });

  // Export PNG/JPG/PDF placeholders (UI-only for now)
  $("exportPngBtn")?.addEventListener("click", ()=>alert("PNG export: next step"));
  $("exportJpgBtn")?.addEventListener("click", ()=>alert("JPG export: next step"));
  $("exportPdfBtn")?.addEventListener("click", ()=>alert("PDF export: next step"));
  $("exportCloudBtn")?.addEventListener("click", ()=>alert("Cloud export: next step"));

  // Sync initial zoom label after canvas init
  setTimeout(()=>updateZoomLabel(), 300);
});
