// js/ui.js
// ============================================================
// UI glue: drawer panels, zoom, sizes, layers list, preview, export
// ============================================================

import {
  fabricCanvas,
  addPage,
  duplicatePage,
  deletePage,
  nextPage,
  prevPage,
  undo,
  redo,
  setZoom,
  getZoom,
  resetZoom,
  fitToScreen,
  setCanvasSizePreset,
  setCanvasCustom,
  saveCurrentPage,
  refreshThumbnails,
  updatePageInfo
} from "./core.js";

import {
  importImage,
  importPDF,
  addHeading,
  addBody,
  addCustomText,
  addRect,
  addCircle,
  addLine,
  setOpacity,
  toggleShadow,
  deleteSelected,
  bringForward,
  sendBackward,
  bringToFront,
  sendToBack,
  loadStickers,
  addSticker,
  removeBackground
} from "./tools.js";

import { exportDo } from "./export.js";
import { openPreview, closePreview, prev as pvPrev, next as pvNext } from "./flipbook-preview.js";

const panelTitles = {
  import: "Import",
  text: "Text",
  stickers: "Stickers",
  shapes: "Shapes",
  effects: "Effects",
  layers: "Layers"
};

window.addEventListener("DOMContentLoaded", async () => {
  // theme
  const themeBtn = document.getElementById("themeToggleBtn");
  themeBtn?.addEventListener("click", () => {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "light" ? "" : "light";
    if (next) root.setAttribute("data-theme", next);
    else root.removeAttribute("data-theme");
  });

  // left drawer panels
  const drawer = document.getElementById("leftDrawer");
  const drawerTitle = document.getElementById("drawerTitle");
  const closeBtn = document.getElementById("drawerCloseBtn");
  const railBtns = [...document.querySelectorAll(".rail-btn")];
  const panels = [...document.querySelectorAll(".panel")];

  function openPanel(name) {
    railBtns.forEach(b => b.classList.toggle("active", b.dataset.panel === name));
    panels.forEach(p => p.classList.toggle("active", p.id === `panel-${name}`));
    drawerTitle.textContent = panelTitles[name] || "Panel";
    drawer.classList.add("open");
  }

  railBtns.forEach(btn => btn.addEventListener("click", () => openPanel(btn.dataset.panel)));
  closeBtn?.addEventListener("click", () => drawer?.classList.remove("open"));

  // top undo/redo
  document.getElementById("undoBtn")?.addEventListener("click", undo);
  document.getElementById("redoBtn")?.addEventListener("click", redo);

  // keyboard undo/redo
  document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (e.ctrlKey && k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
    if (e.ctrlKey && (k === "y" || (k === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
  });

  // zoom controls
  const zoomLbl = document.getElementById("zoomLabel");
  function updateZoomLabel() {
    zoomLbl.textContent = `${Math.round(getZoom() * 100)}%`;
  }
  document.getElementById("zoomInBtn")?.addEventListener("click", () => { setZoom(getZoom() * 1.1); updateZoomLabel(); });
  document.getElementById("zoomOutBtn")?.addEventListener("click", () => { setZoom(getZoom() / 1.1); updateZoomLabel(); });
  document.getElementById("zoomResetBtn")?.addEventListener("click", () => { resetZoom(); fitToScreen(); updateZoomLabel(); });
  document.getElementById("zoomFitBtn")?.addEventListener("click", () => { fitToScreen(); updateZoomLabel(); });

  // size presets
  const preset = document.getElementById("sizePreset");
  preset?.addEventListener("change", () => {
    if (preset.value === "CUSTOM") {
      const w = prompt("Width (px):", "1400");
      const h = prompt("Height (px):", "1400");
      if (w && h) setCanvasCustom(w, h);
    } else {
      setCanvasSizePreset(preset.value);
    }
    updateZoomLabel();
    saveCurrentPage();
    refreshThumbnails();
  });

  // pages
  document.getElementById("prevPageBtn")?.addEventListener("click", () => { prevPage(); updateLayersUI(); });
  document.getElementById("nextPageBtn")?.addEventListener("click", () => { nextPage(); updateLayersUI(); });
  document.getElementById("addPageBtn")?.addEventListener("click", () => { addPage(); updatePageInfo(); refreshThumbnails(); updateLayersUI(); });
  document.getElementById("dupPageBtn")?.addEventListener("click", () => { duplicatePage(); updatePageInfo(); refreshThumbnails(); updateLayersUI(); });
  document.getElementById("deletePageBtn")?.addEventListener("click", () => { deletePage(); updatePageInfo(); refreshThumbnails(); updateLayersUI(); });

  // import
  const imageInput = document.getElementById("imageInput");
  const pdfInput = document.getElementById("pdfInput");
  document.getElementById("btnUploadImage")?.addEventListener("click", () => imageInput.click());
  document.getElementById("btnUploadPDF")?.addEventListener("click", () => pdfInput.click());

  imageInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importImage(file);
    e.target.value = "";
    updateLayersUI();
  });

  pdfInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (file) await importPDF(file);
    e.target.value = "";
    updateLayersUI();
  });

  // text
  document.getElementById("addHeadingBtn")?.addEventListener("click", () => addHeading());
  document.getElementById("addBodyBtn")?.addEventListener("click", () => addBody());
  document.getElementById("addCustomTextBtn")?.addEventListener("click", () => {
    const v = prompt("Text:", "Custom text");
    addCustomText(v);
  });

  // shapes
  document.getElementById("addRectBtn")?.addEventListener("click", addRect);
  document.getElementById("addCircleBtn")?.addEventListener("click", addCircle);
  document.getElementById("addLineBtn")?.addEventListener("click", addLine);

  // effects
  document.getElementById("opacityRange")?.addEventListener("input", (e) => setOpacity(e.target.value));
  document.getElementById("shadowToggle")?.addEventListener("change", (e) => toggleShadow(e.target.checked));
  document.getElementById("deleteObjBtn")?.addEventListener("click", deleteSelected);

  // layers buttons
  document.getElementById("bringForwardBtn")?.addEventListener("click", bringForward);
  document.getElementById("sendBackwardBtn")?.addEventListener("click", sendBackward);
  document.getElementById("bringToFrontBtn")?.addEventListener("click", bringToFront);
  document.getElementById("sendToBackBtn")?.addEventListener("click", sendToBack);

  // preview
  document.getElementById("previewFlipbookBtn")?.addEventListener("click", () => openPreview());
  document.getElementById("closePreviewBtn")?.addEventListener("click", closePreview);
  document.getElementById("pvPrev")?.addEventListener("click", pvPrev);
  document.getElementById("pvNext")?.addEventListener("click", pvNext);

  // export drawer
  const exportFab = document.getElementById("exportFab");
  const exportDrawer = document.getElementById("exportDrawer");
  document.getElementById("exportCloseBtn")?.addEventListener("click", () => exportDrawer.classList.remove("open"));
  exportFab?.addEventListener("click", () => exportDrawer.classList.add("open"));

  document.getElementById("doExportBtn")?.addEventListener("click", async () => {
    const format = document.getElementById("exportFormat").value;
    const range = document.getElementById("exportRange").value;
    const quality = Number(document.getElementById("exportQuality").value);
    await exportDo({ format, range, quality });
  });

  // stickers
  await renderStickers();
  document.getElementById("reloadStickersBtn")?.addEventListener("click", renderStickers);
  document.getElementById("stickerSearch")?.addEventListener("input", (e) => renderStickers(e.target.value));

  // update layers on canvas changes
  fabricCanvas.on("selection:created", updateLayersUI);
  fabricCanvas.on("selection:updated", updateLayersUI);
  fabricCanvas.on("selection:cleared", updateLayersUI);
  fabricCanvas.on("object:added", () => { updateLayersUI(); saveCurrentPage(); refreshThumbnails(); });
  fabricCanvas.on("object:removed", () => { updateLayersUI(); saveCurrentPage(); refreshThumbnails(); });
  fabricCanvas.on("object:modified", () => { updateLayersUI(); saveCurrentPage(); refreshThumbnails(); });

  // init
  updateZoomLabel();
  updatePageInfo();
  refreshThumbnails();
  updateLayersUI();
  fitToScreen();
});

async function renderStickers(query = "") {
  const grid = document.getElementById("stickerGrid");
  if (!grid) return;

  grid.innerHTML = "";
  let stickers = [];
  try {
    stickers = await loadStickers();
  } catch (e) {
    grid.innerHTML = `<div class="hint">Δεν βρέθηκε stickers list.json</div>`;
    return;
  }

  const q = (query || "").trim().toLowerCase();
  const filtered = q
    ? stickers.filter(s => (s.name || "").toLowerCase().includes(q) || (s.value || "").toLowerCase().includes(q))
    : stickers;

  filtered.slice(0, 80).forEach(st => {
    const d = document.createElement("div");
    d.className = "sticker";
    d.title = st.name || "";

    if (st.type === "emoji") d.textContent = st.value;
    else d.textContent = "🖼";

    d.addEventListener("click", () => addSticker(st));
    grid.appendChild(d);
  });
}

function updateLayersUI() {
  const box = document.getElementById("layersList");
  if (!box || !fabricCanvas) return;

  box.innerHTML = "";
  const objs = fabricCanvas.getObjects().slice().reverse();

  if (!objs.length) {
    box.innerHTML = `<div class="hint">Κανένα αντικείμενο</div>`;
    return;
  }

  const active = fabricCanvas.getActiveObject();

  objs.forEach((obj) => {
    const row = document.createElement("div");
    row.className = "layer-item" + (obj === active ? " active" : "");

    const left = document.createElement("div");
    left.className = "layer-left";
    left.innerHTML = `<span>${obj.type}</span><span class="badge">${obj.visible === false ? "hidden" : ""}${obj.lockMovementX ? " locked" : ""}</span>`;

    const actions = document.createElement("div");
    actions.className = "layer-actions";

    const eye = document.createElement("button");
    eye.className = "pill";
    eye.textContent = obj.visible === false ? "🙈" : "👁";
    eye.onclick = (e) => {
      e.stopPropagation();
      obj.visible = !(obj.visible !== false);
      fabricCanvas.requestRenderAll();
      updateLayersUI();
      saveCurrentPage();
      refreshThumbnails();
    };

    const lock = document.createElement("button");
    lock.className = "pill";
    lock.textContent = obj.lockMovementX ? "🔓" : "🔒";
    lock.onclick = (e) => {
      e.stopPropagation();
      const locked = !obj.lockMovementX;
      obj.set({
        lockMovementX: locked,
        lockMovementY: locked,
        lockScalingX: locked,
        lockScalingY: locked,
        lockRotation: locked,
        selectable: !locked
      });
      fabricCanvas.discardActiveObject();
      fabricCanvas.requestRenderAll();
      updateLayersUI();
      saveCurrentPage();
      refreshThumbnails();
    };

    actions.appendChild(eye);
    actions.appendChild(lock);

    row.appendChild(left);
    row.appendChild(actions);

    row.onclick = () => {
      if (obj.visible === false) obj.visible = true;
      fabricCanvas.setActiveObject(obj);
      fabricCanvas.requestRenderAll();
      updateLayersUI();
    };

    box.appendChild(row);
  });
}
