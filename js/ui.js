// js/ui.js
import {
  addText,
  addImageFromFile,
  addRect,
  addCircle,
  addLine,
  setZoom,
  getZoom,
  fitToScreen,
  undo,
  redo,
  addPage,
  duplicatePage,
  deletePage,
  prevPage,
  nextPage,
  switchPage,
  getPageInfo,
  getThumbnails,
  exportFlipbookHTML,
  buildFlipbookPreviewURL,
  exportCurrentPNG,
  getObjects,
  getActiveObject,
  bringForward,
  sendBackwards,
  bringToFront,
  sendToBack,
  saveDraft
} from "./core.js";

// --------- Helpers ---------
function $(id) { return document.getElementById(id); }

function updateZoomLabel() {
  const el = $("zoomValue");
  if (!el) return;
  el.textContent = Math.round(getZoom() * 100) + "%";
}

function updatePageUI() {
  const info = getPageInfo();
  const pi = $("pageInfo");
  if (pi) pi.textContent = `${info.currentPage + 1} / ${info.pageCount}`;

  const strip = $("thumbStrip");
  if (!strip) return;

  const thumbs = getThumbnails();
  strip.innerHTML = "";

  thumbs.forEach((src, i) => {
    const d = document.createElement("div");
    d.className = "thumb" + (i === info.currentPage ? " active" : "");
    const img = document.createElement("img");
    img.src = src || "";
    img.alt = `page ${i + 1}`;
    d.appendChild(img);
    d.onclick = () => switchPage(i);
    strip.appendChild(d);
  });
}

function updateLayersUI() {
  const list = $("layersList");
  if (!list) return;

  list.innerHTML = "";
  const objs = getObjects().slice().reverse(); // top first

  objs.forEach((o, idx) => {
    const row = document.createElement("div");
    row.className = "layerRow";

    const label = document.createElement("div");
    label.className = "layerLabel";
    label.textContent = o.type || "object";

    const btn = document.createElement("button");
    btn.className = "icon";
    btn.textContent = "👁";
    btn.title = "Toggle visibility";
    btn.onclick = () => {
      o.visible = !o.visible;
      o.canvas?.requestRenderAll();
      saveDraft();
    };

    row.appendChild(label);
    row.appendChild(btn);

    row.onclick = () => {
      o.canvas?.setActiveObject(o);
      o.canvas?.requestRenderAll();
    };

    list.appendChild(row);
  });
}

function openModal(modalId) {
  const m = $(modalId);
  if (!m) return;
  m.classList.add("open");
  m.setAttribute("aria-hidden", "false");
}
function closeModal(modalId) {
  const m = $(modalId);
  if (!m) return;
  m.classList.remove("open");
  m.setAttribute("aria-hidden", "true");
}

// --------- Bind once ready ---------
window.addEventListener("pb:ready", () => {
  // Insert
  $("addTextBtn")?.addEventListener("click", () => addText("Text"));
  $("addHeadingBtn")?.addEventListener("click", () => addText("Heading", { fontSize: 72 }));
  $("addSubheadingBtn")?.addEventListener("click", () => addText("Subheading", { fontSize: 54 }));
  $("addBodyTextBtn")?.addEventListener("click", () => addText("Body text", { fontSize: 34 }));

  $("imageInput")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) addImageFromFile(file);
    e.target.value = "";
  });

  // Shapes
  $("addRectBtn")?.addEventListener("click", () => addRect(readShapeStyle()));
  $("addCircleBtn")?.addEventListener("click", () => addCircle(readShapeStyle()));
  $("addLineBtn")?.addEventListener("click", () => addLine(readShapeStyle()));

  $("applyTextStyleBtn")?.addEventListener("click", () => {
    const o = getActiveObject();
    if (!o) return;
    const ff = $("fontFamily")?.value || "Arial";
    const fs = Number($("fontSize")?.value || 48);
    const fc = $("fontColor")?.value || "#111";
    o.set({ fontFamily: ff, fontSize: fs, fill: fc });
    o.canvas?.requestRenderAll();
    saveDraft();
  });

  $("applyShapeStyleBtn")?.addEventListener("click", () => {
    const o = getActiveObject();
    if (!o) return;
    const st = readShapeStyle();
    o.set({
      fill: st.fill,
      stroke: st.stroke,
      strokeWidth: st.strokeWidth
    });
    o.canvas?.requestRenderAll();
    saveDraft();
  });

  // Layers ordering
  $("bringForwardBtn")?.onclick = bringForward;
  $("sendBackBtn")?.onclick = sendBackwards;
  $("bringToFrontBtn")?.onclick = bringToFront;
  $("sendToBackBtn")?.onclick = sendToBack;

  // Pages
  $("addPageBtn")?.onclick = addPage;
  $("dupPageBtn")?.onclick = duplicatePage;
  $("delPageBtn")?.onclick = deletePage;
  $("prevPageBtn")?.onclick = prevPage;
  $("nextPageBtn")?.onclick = nextPage;

  // Zoom
  $("zoomInBtn")?.addEventListener("click", () => { setZoom(getZoom() + 0.1); updateZoomLabel(); });
  $("zoomOutBtn")?.addEventListener("click", () => { setZoom(getZoom() - 0.1); updateZoomLabel(); });
  $("zoomResetBtn")?.addEventListener("click", () => { fitToScreen(); updateZoomLabel(); });

  // History
  $("undoBtn")?.onclick = undo;
  $("redoBtn")?.onclick = redo;

  // Export
  $("exportFlipbookBtn")?.onclick = () => exportFlipbookHTML();
  $("exportPNGBtn")?.onclick = () => exportCurrentPNG();

  $("previewFlipbookBtn")?.onclick = () => {
    const url = buildFlipbookPreviewURL();
    const frame = $("flipbookFrame");
    if (frame) frame.src = url;
    openModal("flipbookModal");
  };
  $("closeFlipbookModal")?.onclick = () => closeModal("flipbookModal");
  $("flipbookModal")?.addEventListener("click", (e) => {
    if (e.target?.id === "flipbookModal") closeModal("flipbookModal");
  });

  // Theme
  $("themeToggle")?.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    document.body.classList.toggle("light");
  });

  // Initial UI sync
  updateZoomLabel();
  updatePageUI();
  updateLayersUI();
});

// Updates from core
window.addEventListener("pb:pages", () => updatePageUI());
window.addEventListener("pb:pagechange", () => updatePageUI());
window.addEventListener("pb:layers", () => updateLayersUI());

// Shape style helpers
function readShapeStyle() {
  const fill = $("shapeFill")?.value || "#ff4d4d";
  const stroke = $("shapeStroke")?.value || "#111";
  const strokeWidth = Number($("shapeStrokeWidth")?.value || 2);
  return { fill, stroke, strokeWidth };
}
