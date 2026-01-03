// js/ui.js
// Binds UI to core.js (safe: checks for element existence)

import {
  initCanvas,
  fabricCanvas,
  // pages
  addPage, duplicatePage, deletePage, nextPage, prevPage, goToPage,
  getPageIndex, getPageCount,
  // add
  addText, addImageFromFile,
  addRect, addCircle, addLine, addTriangle,
  // canvas size + zoom
  setPagePreset, setCanvasSize,
  zoomIn, zoomOut, zoomReset, zoomFitToHost, applyZoom,
  // style
  setCanvasBackground, setActiveFill, setActiveTextStyle,
  deleteActive, bringForward, sendBackwards, toggleLockActive,
  // tools
  cropSelected, removeBgSelected,
  // exports
  previewFlipbook, closeFlipbookPreview, exportFlipbook, exportPNG, exportJPG, exportPDF,
  // pdf upload
  addPagesFromPDF,
  // cloud
  saveToCloud, loadFromCloud
} from "./core.js";

const $ = (id) => document.getElementById(id);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

function setText(el, txt){ if (el) el.textContent = txt; }
function setValue(el, val){ if (el) el.value = val; }

function updatePageInfo() {
  const info = $("pageInfo");
  if (info) setText(info, `${getPageIndex() + 1} / ${getPageCount()}`);
  const zoomValue = $("zoomValue");
  if (zoomValue) {
    // core dispatches pb:zoom, but keep safe
  }
}

function init() {
  initCanvas();

  // Pages
  on($("addPageBtn"), "click", () => addPage());
  on($("dupPageBtn"), "click", () => duplicatePage());
  on($("delPageBtn"), "click", () => deletePage());
  on($("nextPageBtn"), "click", () => nextPage());
  on($("prevPageBtn"), "click", () => prevPage());

  // PageSize preset
  on($("pageSizeSelect"), "change", (e) => setPagePreset(e.target.value));
  // Also export-size select might exist
  on($("exportSizeSelect"), "change", (e) => setPagePreset(e.target.value));

  // Zoom
  on($("zoomInBtn"), "click", () => zoomIn());
  on($("zoomOutBtn"), "click", () => zoomOut());
  on($("zoomResetBtn"), "click", () => zoomReset());
  on($("zoomFitBtn"), "click", () => zoomFitToHost());
  on($("fitBtn"), "click", () => zoomFitToHost());

  // Text add
  on($("addTextBtn"), "click", () => {
    const fontFamily = $("fontSelect")?.value || "Arial";
    const fontSize = Number($("fontSizeInput")?.value || 48);
    const fill = $("textColorInput")?.value || "#111111";
    addText({ fontFamily, fontSize, fill });
  });

  // Image upload
  on($("imageInput"), "change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await addImageFromFile(file);
    e.target.value = "";
  });

  // PDF upload (optional input id="pdfInput")
  on($("pdfInput"), "change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await addPagesFromPDF(file);
    e.target.value = "";
  });

  // Shapes
  on($("addRectBtn"), "click", () => addRect());
  on($("addCircleBtn"), "click", () => addCircle());
  on($("addLineBtn"), "click", () => addLine());
  on($("addTriangleBtn"), "click", () => addTriangle());

  // Colors
  on($("canvasBgColor"), "input", (e) => setCanvasBackground(e.target.value));
  on($("objFillColor"), "input", (e) => setActiveFill(e.target.value));
  document.querySelectorAll("[data-bg]").forEach(btn => {
    on(btn, "click", () => setCanvasBackground(btn.dataset.bg));
  });

  // Text styling controls
  on($("fontSelect"), "change", (e) => setActiveTextStyle({ fontFamily: e.target.value }));
  on($("fontSizeInput"), "input", (e) => setActiveTextStyle({ fontSize: e.target.value }));
  on($("textColorInput"), "input", (e) => setActiveTextStyle({ fill: e.target.value }));

  on($("boldBtn"), "click", () => {
    const obj = fabricCanvas?.getActiveObject();
    const next = (obj?.fontWeight === "bold") ? "normal" : "bold";
    setActiveTextStyle({ fontWeight: next });
  });
  on($("italicBtn"), "click", () => {
    const obj = fabricCanvas?.getActiveObject();
    const next = (obj?.fontStyle === "italic") ? "normal" : "italic";
    setActiveTextStyle({ fontStyle: next });
  });
  on($("underlineBtn"), "click", () => {
    const obj = fabricCanvas?.getActiveObject();
    setActiveTextStyle({ underline: !obj?.underline });
  });

  on($("alignLeftBtn"), "click", () => setActiveTextStyle({ textAlign: "left" }));
  on($("alignCenterBtn"), "click", () => setActiveTextStyle({ textAlign: "center" }));
  on($("alignRightBtn"), "click", () => setActiveTextStyle({ textAlign: "right" }));

  // Layers actions
  on($("deleteObjBtn"), "click", () => deleteActive());
  on($("bringFwdBtn"), "click", () => bringForward());
  on($("sendBackBtn"), "click", () => sendBackwards());
  on($("lockObjBtn"), "click", () => toggleLockActive());

  // Crop / Remove BG
  on($("cropBtn"), "click", () => cropSelected());
  on($("removeBgBtn"), "click", () => removeBgSelected());

  // Export buttons
  on($("exportFlipBtn"), "click", async () => {
    const dir = $("flipDirSelect")?.value || "horizontal";
    await exportFlipbook({ direction: dir, mode: "download" });
  });
  on($("exportPngBtn"), "click", () => exportPNG());
  on($("exportJpgBtn"), "click", () => exportJPG());
  on($("exportPdfBtn"), "click", () => exportPDF());

  // Preview flipbook in modal if exists
  on($("previewFlipBtn"), "click", async () => {
    const dir = $("flipDirSelect")?.value || "horizontal";
    const url = await previewFlipbook({ direction: dir });
    const modal = $("flipPreviewModal");
    const frame = $("flipPreviewFrame");
    if (modal && frame) {
      frame.src = url;
      modal.classList.add("open");
    } else {
      window.open(url, "_blank");
    }
  });
  on($("closeFlipPreview"), "click", () => {
    const modal = $("flipPreviewModal");
    const frame = $("flipPreviewFrame");
    if (frame) frame.src = "about:blank";
    if (modal) modal.classList.remove("open");
    closeFlipbookPreview();
  });

  // Link/share export (upload)
  on($("exportLinkBtn"), "click", async () => {
    const dir = $("flipDirSelect")?.value || "horizontal";
    const res = await exportFlipbook({ direction: dir, mode: "upload" });
    if (res?.url) {
      await navigator.clipboard.writeText(res.url);
      alert("Link copied:\n" + res.url);
    } else {
      alert("Δεν έγινε upload (έγινε download το αρχείο).");
    }
  });

  // Cloud save/load if you have buttons
  on($("exportCloudBtn"), "click", async () => {
    try {
      await saveToCloud();
      alert("Saved to cloud.");
    } catch (e) {
      alert("Cloud save failed. Check Firestore rules.\n" + (e?.message || e));
    }
  });
  on($("loadCloudBtn"), "click", async () => {
    try {
      const ok = await loadFromCloud();
      if (!ok) alert("No cloud project found yet.");
    } catch (e) {
      alert("Cloud load failed.\n" + (e?.message || e));
    }
  });

  // Listen core events
  window.addEventListener("pb:pages", updatePageInfo);
  window.addEventListener("pb:zoom", (e) => {
    const z = e.detail.zoom;
    const zoomValue = $("zoomValue");
    if (zoomValue) zoomValue.textContent = Math.round(z * 100) + "%";
  });

  updatePageInfo();

  // Basic layer list (optional)
  const layersList = $("layersList");
  function renderLayers() {
    if (!layersList || !fabricCanvas) return;
    layersList.innerHTML = "";
    const objs = fabricCanvas.getObjects().slice().reverse();
    objs.forEach((o, idx) => {
      const row = document.createElement("div");
      row.className = "layerRow";
      const label = document.createElement("span");
      label.className = "layerLabel";
      label.textContent = `${o.type}${o.text ? ": " + String(o.text).slice(0, 10) : ""}`;
      const lock = document.createElement("button");
      lock.className = "miniBtn";
      lock.textContent = o.locked ? "🔒" : "🔓";
      lock.onclick = () => {
        fabricCanvas.setActiveObject(o);
        toggleLockActive();
        renderLayers();
      };
      row.onclick = () => fabricCanvas.setActiveObject(o);
      row.appendChild(lock);
      row.appendChild(label);
      layersList.appendChild(row);
    });
  }
  window.addEventListener("pb:selection", renderLayers);
  window.addEventListener("pb:pages", renderLayers);

  // Context menu (right-click)
  const host = $("canvasHost") || $("canvasFrame") || document.body;
  let menu = document.getElementById("ctxMenu");
  if (!menu) {
    menu = document.createElement("div");
    menu.id = "ctxMenu";
    menu.style.position = "fixed";
    menu.style.zIndex = 99999;
    menu.style.display = "none";
    menu.style.background = "rgba(20,20,20,.95)";
    menu.style.border = "1px solid rgba(255,255,255,.16)";
    menu.style.borderRadius = "12px";
    menu.style.padding = "8px";
    menu.style.backdropFilter = "blur(6px)";
    menu.innerHTML = `
      <button data-act="front">Bring +</button>
      <button data-act="back">Send -</button>
      <button data-act="lock">Lock/Unlock</button>
      <button data-act="del" style="color:#ff453a">Delete</button>
    `;
    menu.querySelectorAll("button").forEach(b => {
      b.style.display="block";
      b.style.width="100%";
      b.style.margin="4px 0";
      b.style.padding="8px 10px";
      b.style.borderRadius="10px";
      b.style.border="0";
      b.style.cursor="pointer";
    });
    document.body.appendChild(menu);

    menu.addEventListener("click", (e) => {
      const act = e.target?.dataset?.act;
      if (!act) return;
      if (act === "front") bringForward();
      if (act === "back") sendBackwards();
      if (act === "lock") toggleLockActive();
      if (act === "del") deleteActive();
      menu.style.display = "none";
    });
  }

  host.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    menu.style.left = e.clientX + "px";
    menu.style.top = e.clientY + "px";
    menu.style.display = "block";
  });
  window.addEventListener("click", () => { menu.style.display = "none"; });
}

document.addEventListener("DOMContentLoaded", init);
