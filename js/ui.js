// js/ui.js
// Wires UI elements -> core functions (safe, no crashes)

import {
  initCanvas,
  addText,
  addImageFromFile,
  addRect, addCircle, addLine,
  getZoom, setZoom, resetZoom, fitToScreen,
  setCanvasSizePreset, setCanvasCustomSize, getCanvasSizePreset,
  setCanvasBackground,
  addPage, duplicatePage, deletePage, nextPage, prevPage, goToPage,
  refreshThumbnails, updatePageInfo,
  exportPNG, exportJPG,
  previewFlipbook, exportFlipbookHTML, makeFlipbookLink,
} from "./core.js";

function $(id){ return document.getElementById(id); }

function setText(el, txt){ if (el) el.textContent = txt; }

function updateZoomLabel(){
  const z = getZoom();
  const el = $("zoomValue");
  if (el) el.textContent = Math.round(z * 100) + "%";
}

function bindOnce(){
  // Canvas init
  initCanvas();
  refreshThumbnails();
  updatePageInfo();
  updateZoomLabel();

  // ---- Pages
  $("addPageBtn")?.addEventListener("click", () => { addPage(); });
  $("dupPageBtn")?.addEventListener("click", () => { duplicatePage(); });
  $("delPageBtn")?.addEventListener("click", () => { deletePage(); });

  $("prevPageBtn")?.addEventListener("click", () => { prevPage(); });
  $("nextPageBtn")?.addEventListener("click", () => { nextPage(); });

  // ---- Text
  $("addTextBtn")?.addEventListener("click", () => {
    const font = $("fontSelect")?.value || "Arial";
    const size = Number($("fontSizeInput")?.value || 48);
    const color = $("textColorInput")?.value || "#111111";
    addText({ fontFamily: font, fontSize: size, fill: color, text: "Text" });
  });

  // ---- Images
  $("imageInput")?.addEventListener("change", (e) => {
    const file = e.target?.files?.[0];
    if (file) addImageFromFile(file);
    e.target.value = "";
  });

  // ---- Shapes
  $("addRectBtn")?.addEventListener("click", addRect);
  $("addCircleBtn")?.addEventListener("click", addCircle);
  $("addLineBtn")?.addEventListener("click", addLine);

  // ---- Canvas colors
  $("canvasBgColor")?.addEventListener("input", (e) => setCanvasBackground(e.target.value));
  document.querySelectorAll("[data-bg]").forEach(btn => {
    btn.addEventListener("click", () => setCanvasBackground(btn.dataset.bg));
  });

  // ---- Zoom (canvas zoom)
  $("zoomInBtn")?.addEventListener("click", () => { setZoom(getZoom() + 0.1); updateZoomLabel(); });
  $("zoomOutBtn")?.addEventListener("click", () => { setZoom(getZoom() - 0.1); updateZoomLabel(); });
  $("zoomResetBtn")?.addEventListener("click", () => { resetZoom(true); updateZoomLabel(); });
  $("zoomFitBtn")?.addEventListener("click", () => { fitToScreen(); updateZoomLabel(); });
  $("fitBtn")?.addEventListener("click", () => { fitToScreen(); updateZoomLabel(); });

  // Ctrl+wheel zoom
  const host = $("canvasHost");
  host?.addEventListener("wheel", (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.95 : 1.05;
    setZoom(getZoom() * factor);
    updateZoomLabel();
  }, { passive:false });

  // ---- Page size preset
  $("pageSizeSelect")?.addEventListener("change", (e) => {
    setCanvasSizePreset(e.target.value);
    updateZoomLabel();
  });

  // ---- Export images
  $("exportPngBtn")?.addEventListener("click", () => {
    const url = exportPNG();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url; a.download = "page.png";
    a.click();
  });

  $("exportJpgBtn")?.addEventListener("click", () => {
    const url = exportJPG();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url; a.download = "page.jpg";
    a.click();
  });

  // ---- Flipbook preview/export
  const modal = $("flipPreviewModal");
  const frame = $("flipPreviewFrame");

  const flipDirSelect = $("flipDirSelect");
  const getFlipDir = () => (flipDirSelect?.value === "vertical" ? "vertical" : "horizontal");

  async function openPreview(){
    if (!modal || !frame) return;
    modal.classList.add("open");
    frame.src = "about:blank";
    const url = await previewFlipbook({ direction: getFlipDir(), title: "Photobook" });
    frame.src = url;
  }

  $("previewFlipBtn")?.addEventListener("click", openPreview);
  $("exportFlipBtn")?.addEventListener("click", async () => {
    await exportFlipbookHTML({ direction: getFlipDir(), title: "Photobook", filename: "photobook_flipbook" });
  });

  $("closeFlipPreview")?.addEventListener("click", () => {
    modal?.classList.remove("open");
    if (frame) frame.src = "about:blank";
  });

  // Export Link (local blob URL – user can copy)
  $("exportLinkBtn")?.addEventListener("click", async () => {
    const url = await previewFlipbook({ direction: getFlipDir(), title: "Photobook" });
    const link = makeFlipbookLink(url);
    try {
      await navigator.clipboard.writeText(link);
      alert("✅ Copied link (works in this browser session). Για δημόσιο link θέλει upload.");
    } catch {
      prompt("Copy link:", link);
    }
  });

  // Cloud placeholder
  $("exportCloudBtn")?.addEventListener("click", () => {
    alert("Cloud export: θα μπει στο επόμενο βήμα (χρειάζεται backend).");
  });

  // Keep UI preset synced (if draft loaded different preset)
  const presetNow = getCanvasSizePreset();
  const ps = $("pageSizeSelect");
  if (ps && presetNow && ps.value !== presetNow && presetNow !== "custom") ps.value = presetNow;
}

document.addEventListener("DOMContentLoaded", bindOnce);
