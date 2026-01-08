// js/core.js
// Photobook core (Fabric.js)
// - Pages with thumbnails
// - Canvas zoom/fit + page size presets
// - Export: PNG/JPG/PDF + Flipbook (all pages)
// - Autosave via IndexedDB (avoids localStorage quota)
// - Optional Firebase hooks (if window.FirebaseStore is provided)

export const App = {
  canvas: null,
  pages: [],              // [{ json, preset }]
  current: 0,
  preset: "A4P",
  zoom: 1,
  autosaveEnabled: true,
  autosaveKey: "photobook_draft_v3",
};

const PRESETS = {
  A4P:   { w: 2480, h: 3508, label: "A4 Portrait" },   // ~300dpi
  A4L:   { w: 3508, h: 2480, label: "A4 Landscape" },
  SQUARE:{ w: 2500, h: 2500, label: "Square" },
  STORY: { w: 1080, h: 1920, label: "Story" },
  HD:    { w: 1920, h: 1080, label: "HD" },
};

// ---------- IndexedDB tiny helper ----------
const IDB_DB = "photobook_db_v1";
const IDB_STORE = "drafts";

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbDel(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- helpers ----------
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const byId = (id) => document.getElementById(id);

function getPreset(p) {
  return PRESETS[p] || PRESETS.A4P;
}

function getStageSize() {
  const host = byId("canvasHost") || byId("canvasFrame") || document.body;
  return { w: host.clientWidth || 800, h: host.clientHeight || 600 };
}

function getCanvasCenterPoint() {
  const c = App.canvas;
  const vpt = c.viewportTransform;
  // canvas center in viewport coords
  const x = (c.getWidth() / 2 - vpt[4]) / vpt[0];
  const y = (c.getHeight() / 2 - vpt[5]) / vpt[3];
  return new fabric.Point(x, y);
}

function ensureImageCrossOrigin(obj) {
  if (obj && obj.type === "image") {
    try { obj.set({ crossOrigin: "anonymous" }); } catch {}
  }
}

function enrichJSON(c) {
  // include a few extra props we rely on
  return c.toJSON([
    "id",
    "name",
    "selectable",
    "evented",
    "lockMovementX","lockMovementY","lockRotation","lockScalingX","lockScalingY",
    "opacity",
    "stroke","strokeWidth","fill",
    "fontFamily","fontSize","fontWeight","fontStyle","underline","textAlign",
    "charSpacing","lineHeight",
    "cropX","cropY",
    "rx","ry",
    "scaleX","scaleY","angle",
  ]);
}

// ---------- init ----------
export async function initCanvas({ preset = "A4P" } = {}) {
  App.preset = preset;
  const { w, h } = getPreset(preset);

  const el = byId("canvas");
  if (!el) throw new Error("Canvas element #canvas not found");

  App.canvas = new fabric.Canvas(el, {
    preserveObjectStacking: true,
    selection: true,
    backgroundColor: "#ffffff",
  });

  setCanvasSize(preset);

  // core listeners
  App.canvas.on("object:added", () => { scheduleAutosave(); });
  App.canvas.on("object:modified", () => { scheduleAutosave(); });
  App.canvas.on("object:removed", () => { scheduleAutosave(); });
  App.canvas.on("selection:created", () => { updateLayersUI(); });
  App.canvas.on("selection:updated", () => { updateLayersUI(); });
  App.canvas.on("selection:cleared", () => { updateLayersUI(); });

  // right click context menu hook
  App.canvas.upperCanvasEl.addEventListener("contextmenu", (e) => e.preventDefault());

  // load draft or start new
  const loaded = await loadDraft();
  if (!loaded) {
    App.pages = [makeBlankPage(preset)];
    App.current = 0;
    await renderCurrentPage();
  }

  fitToScreen();
  refreshThumbnails();
  updatePageInfoUI();
  updateLayersUI();

  console.log("✅ Canvas initialized");
}

function makeBlankPage(preset) {
  return { preset, json: { version: fabric.version, objects: [], background: "#ffffff" } };
}

// ---------- pages ----------
export function addPage() {
  saveCurrentPage();
  App.pages.push(makeBlankPage(App.preset));
  App.current = App.pages.length - 1;
  renderCurrentPage();
  refreshThumbnails();
  updatePageInfoUI();
  scheduleAutosave(true);
}

export function duplicatePage() {
  saveCurrentPage();
  const src = App.pages[App.current];
  const copy = JSON.parse(JSON.stringify(src)); // deep copy
  App.pages.splice(App.current + 1, 0, copy);
  App.current = App.current + 1;
  renderCurrentPage();
  refreshThumbnails();
  updatePageInfoUI();
  scheduleAutosave(true);
}

export function deletePage() {
  if (App.pages.length <= 1) return;
  App.pages.splice(App.current, 1);
  App.current = clamp(App.current, 0, App.pages.length - 1);
  renderCurrentPage();
  refreshThumbnails();
  updatePageInfoUI();
  scheduleAutosave(true);
}

export function goToPage(index) {
  saveCurrentPage();
  App.current = clamp(index, 0, App.pages.length - 1);
  renderCurrentPage();
  refreshThumbnails();
  updatePageInfoUI();
  scheduleAutosave(true);
}

export function prevPage() { goToPage(App.current - 1); }
export function nextPage() { goToPage(App.current + 1); }

async function renderCurrentPage() {
  const page = App.pages[App.current];
  if (!page) return;

  const c = App.canvas;
  setCanvasSize(page.preset || App.preset, false);

  await new Promise((resolve) => {
    c.loadFromJSON(page.json, () => {
      c.getObjects().forEach(ensureImageCrossOrigin);
      c.renderAll();
      resolve();
    });
  });

  // ensure background
  const bg = (page.json && (page.json.backgroundColor || page.json.background)) || "#ffffff";
  c.setBackgroundColor(bg, c.renderAll.bind(c));
}

export function saveCurrentPage() {
  const c = App.canvas;
  if (!c) return;
  const page = App.pages[App.current];
  if (!page) return;

  page.preset = App.preset;
  const json = enrichJSON(c);
  // keep backgroundColor
  json.backgroundColor = c.backgroundColor || "#ffffff";
  page.json = json;
}

// ---------- size / zoom ----------
export function setCanvasSize(preset, doFit = true) {
  App.preset = preset;
  const { w, h } = getPreset(preset);

  const c = App.canvas;
  c.setWidth(w);
  c.setHeight(h);

  // make sure DOM canvas matches
  c.calcOffset();
  c.requestRenderAll();

  if (doFit) fitToScreen();
}

export function fitToScreen() {
  const c = App.canvas;
  if (!c) return;

  const stage = getStageSize();
  const pad = 40;
  const sx = (stage.w - pad) / c.getWidth();
  const sy = (stage.h - pad) / c.getHeight();
  const z = clamp(Math.min(sx, sy), 0.05, 3);
  setZoom(z, true);
}

export function setZoom(z, center = true) {
  const c = App.canvas;
  if (!c) return;

  App.zoom = clamp(z, 0.05, 6);

  if (center) {
    const pt = new fabric.Point(c.getWidth() / 2, c.getHeight() / 2);
    c.zoomToPoint(pt, App.zoom);
  } else {
    c.setZoom(App.zoom);
  }

  c.requestRenderAll();
  updateZoomUI();
}

export function zoomIn() { setZoom(App.zoom * 1.1); }
export function zoomOut() { setZoom(App.zoom / 1.1); }
export function zoomReset() { setZoom(1); }

function updateZoomUI() {
  const el = byId("zoomValue");
  if (el) el.textContent = `${Math.round(App.zoom * 100)}%`;
}

// ---------- object creation (centered) ----------
function centerPos() {
  const c = App.canvas;
  const vp = getCanvasCenterPoint();
  return { left: vp.x, top: vp.y, originX: "center", originY: "center" };
}

export function addText(opts = {}) {
  const c = App.canvas;
  if (!c) return;
  const pos = centerPos();
  const t = new fabric.Textbox(opts.text || "Text", {
    ...pos,
    fontFamily: opts.fontFamily || "Arial",
    fontSize: opts.fontSize || 48,
    fill: opts.fill || "#111111",
    stroke: opts.stroke || null,
    strokeWidth: opts.strokeWidth || 0,
    opacity: opts.opacity ?? 1,
  });
  c.add(t);
  c.setActiveObject(t);
  c.requestRenderAll();
  scheduleAutosave(true);
}

export async function addImageFromFile(file) {
  const c = App.canvas;
  if (!c || !file) return;

  const pos = centerPos();

  // Try Firebase upload first (optional)
  let url = null;
  if (window.FirebaseStore && typeof window.FirebaseStore.uploadImage === "function") {
    try {
      url = await window.FirebaseStore.uploadImage(file);
    } catch (e) {
      console.warn("Firebase upload failed, fallback to local dataURL", e);
    }
  }

  if (!url) {
    url = await fileToDataURL(file);
  }

  return new Promise((resolve) => {
    fabric.Image.fromURL(url, (img) => {
      ensureImageCrossOrigin(img);
      // scale to fit ~60% of page
      const maxW = c.getWidth() * 0.6;
      const maxH = c.getHeight() * 0.6;
      const s = Math.min(maxW / img.width, maxH / img.height, 1);
      img.set({ ...pos, scaleX: s, scaleY: s });
      c.add(img);
      c.setActiveObject(img);
      c.requestRenderAll();
      scheduleAutosave(true);
      resolve(img);
    }, { crossOrigin: "anonymous" });
  });
}

export function addRect() {
  const c = App.canvas;
  const pos = centerPos();
  const r = new fabric.Rect({ ...pos, width: 320, height: 220, fill: "#ff3b30", rx: 12, ry: 12 });
  c.add(r); c.setActiveObject(r); c.requestRenderAll(); scheduleAutosave(true);
}

export function addCircle() {
  const c = App.canvas;
  const pos = centerPos();
  const o = new fabric.Circle({ ...pos, radius: 140, fill: "#34c759" });
  c.add(o); c.setActiveObject(o); c.requestRenderAll(); scheduleAutosave(true);
}

export function addLine() {
  const c = App.canvas;
  const pos = centerPos();
  const x = pos.left, y = pos.top;
  const l = new fabric.Line([x - 200, y, x + 200, y], { stroke: "#111", strokeWidth: 6, originX:"center", originY:"center" });
  c.add(l); c.setActiveObject(l); c.requestRenderAll(); scheduleAutosave(true);
}

export function addTriangle() {
  const c = App.canvas;
  const pos = centerPos();
  const t = new fabric.Triangle({ ...pos, width: 280, height: 240, fill: "#0a84ff" });
  c.add(t); c.setActiveObject(t); c.requestRenderAll(); scheduleAutosave(true);
}

export function addEllipse() {
  const c = App.canvas;
  const pos = centerPos();
  const e = new fabric.Ellipse({ ...pos, rx: 180, ry: 120, fill: "#ff9f0a" });
  c.add(e); c.setActiveObject(e); c.requestRenderAll(); scheduleAutosave(true);
}

// ---------- styling selected objects ----------
export function getActiveObject() { return App.canvas?.getActiveObject() || null; }

export function setActiveFill(color) {
  const obj = getActiveObject(); if (!obj) return;
  obj.set("fill", color);
  App.canvas.requestRenderAll(); scheduleAutosave(true); updateLayersUI();
}

export function setActiveStroke(color, width = 4) {
  const obj = getActiveObject(); if (!obj) return;
  obj.set({ stroke: color, strokeWidth: width });
  App.canvas.requestRenderAll(); scheduleAutosave(true);
}

export function setActiveOpacity(op) {
  const obj = getActiveObject(); if (!obj) return;
  obj.set("opacity", clamp(op, 0, 1));
  App.canvas.requestRenderAll(); scheduleAutosave(true);
}

export function setTextProps(props = {}) {
  const obj = getActiveObject(); if (!obj) return;
  if (obj.type !== "textbox" && obj.type !== "i-text" && obj.type !== "text") return;
  obj.set(props);
  App.canvas.requestRenderAll(); scheduleAutosave(true);
}

export function setCanvasBackground(color) {
  const c = App.canvas; if (!c) return;
  c.setBackgroundColor(color, c.requestRenderAll.bind(c));
  scheduleAutosave(true);
}

// ---------- layers ----------
export function bringForward() {
  const obj = getActiveObject(); if (!obj) return;
  App.canvas.bringForward(obj);
  App.canvas.requestRenderAll(); scheduleAutosave(true); updateLayersUI();
}
export function sendBackwards() {
  const obj = getActiveObject(); if (!obj) return;
  App.canvas.sendBackwards(obj);
  App.canvas.requestRenderAll(); scheduleAutosave(true); updateLayersUI();
}
export function deleteSelected() {
  const obj = getActiveObject(); if (!obj) return;
  App.canvas.remove(obj);
  App.canvas.requestRenderAll(); scheduleAutosave(true); updateLayersUI();
}

export function toggleLockObject(obj = getActiveObject()) {
  if (!obj) return;
  const locked = !!obj.lockMovementX;
  obj.set({
    lockMovementX: !locked,
    lockMovementY: !locked,
    lockRotation: !locked,
    lockScalingX: !locked,
    lockScalingY: !locked,
    selectable: true,
    evented: true,
  });
  App.canvas.requestRenderAll();
  scheduleAutosave(true);
  updateLayersUI();
}

export function updateLayersUI() {
  const list = byId("layersList");
  if (!list || !App.canvas) return;
  const objs = App.canvas.getObjects().slice().reverse();

  list.innerHTML = "";
  objs.forEach((o, idx) => {
    const row = document.createElement("div");
    row.className = "layerRow";
    const name = (o.type === "textbox" ? `Text: ${(o.text||"").slice(0,12)}` : o.type);
    row.innerHTML = `
      <button class="layerBtn" data-act="select">#${objs.length-idx} ${escapeHtml(name)}</button>
      <button class="layerIcon" data-act="lock" title="Lock/Unlock">${o.lockMovementX ? "🔒" : "🔓"}</button>
      <button class="layerIcon" data-act="up" title="Bring forward">⬆</button>
      <button class="layerIcon" data-act="down" title="Send back">⬇</button>
    `;
    row.querySelector('[data-act="select"]').onclick = () => {
      App.canvas.setActiveObject(o);
      App.canvas.requestRenderAll();
    };
    row.querySelector('[data-act="lock"]').onclick = () => toggleLockObject(o);
    row.querySelector('[data-act="up"]').onclick = () => { App.canvas.bringForward(o); App.canvas.requestRenderAll(); scheduleAutosave(true); updateLayersUI(); };
    row.querySelector('[data-act="down"]').onclick = () => { App.canvas.sendBackwards(o); App.canvas.requestRenderAll(); scheduleAutosave(true); updateLayersUI(); };
    list.appendChild(row);
  });
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, (m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }

// ---------- crop / remove bg (basic) ----------
export function cropSelected() {
  const c = App.canvas; if (!c) return;
  const obj = c.getActiveObject();
  if (!obj || obj.type !== "image") { alert("Επίλεξε μια εικόνα πρώτα."); return; }

  const w = obj.width || 0;
  const h = obj.height || 0;

  const cropX = Number(prompt(`cropX (0-${w})`, String(obj.cropX || 0)) ?? (obj.cropX || 0));
  const cropY = Number(prompt(`cropY (0-${h})`, String(obj.cropY || 0)) ?? (obj.cropY || 0));
  const cropW = Number(prompt(`cropW (min 10, max ${w})`, String(obj.width || w)) ?? (obj.width || w));
  const cropH = Number(prompt(`cropH (min 10, max ${h})`, String(obj.height || h)) ?? (obj.height || h));

  obj.set({ cropX: clamp(cropX, 0, w), cropY: clamp(cropY, 0, h) });
  obj.set({ width: clamp(cropW, 10, w), height: clamp(cropH, 10, h) });
  obj.setCoords();
  c.requestRenderAll();
  scheduleAutosave(true);
}

// Simple "remove white-ish background" (works best for white studio backgrounds)
export async function removeBgSelected() {
  const c = App.canvas; if (!c) return;
  const obj = c.getActiveObject();
  if (!obj || obj.type !== "image") { alert("Επίλεξε μια εικόνα πρώτα."); return; }

  const tolerance = Number(prompt("Tolerance (0-255) για λευκό background;", "40")) || 40;

  // render image to temp canvas
  const tmp = document.createElement("canvas");
  tmp.width = obj.width;
  tmp.height = obj.height;
  const ctx = tmp.getContext("2d");

  // draw original element
  const el = obj._element;
  if (!el) { alert("Δεν μπορώ να επεξεργαστώ την εικόνα."); return; }

  ctx.drawImage(el, 0, 0, tmp.width, tmp.height);
  const imgData = ctx.getImageData(0, 0, tmp.width, tmp.height);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2];
    // whiteness heuristic
    if (r > 255 - tolerance && g > 255 - tolerance && b > 255 - tolerance) {
      d[i+3] = 0;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const out = tmp.toDataURL("image/png");

  // keep transform
  const left = obj.left, top = obj.top, angle = obj.angle;
  const sx = obj.scaleX, sy = obj.scaleY;
  const ox = obj.originX, oy = obj.originY;

  return new Promise((resolve) => {
    fabric.Image.fromURL(out, (img) => {
      img.set({ left, top, angle, scaleX: sx, scaleY: sy, originX: ox, originY: oy });
      c.remove(obj);
      c.add(img);
      c.setActiveObject(img);
      c.requestRenderAll();
      scheduleAutosave(true);
      resolve(img);
    }, { crossOrigin: "anonymous" });
  });
}

// ---------- PDF upload (first page) ----------
export async function addPdfFromFile(file) {
  if (!file) return;
  if (!window.pdfjsLib) { alert("pdf.js δεν φορτώθηκε."); return; }

  const ab = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: ab }).promise;
  const pageNum = Number(prompt(`Ποια σελίδα; (1-${pdf.numPages})`, "1")) || 1;
  const page = await pdf.getPage(clamp(pageNum, 1, pdf.numPages));
  const viewport = page.getViewport({ scale: 2 });
  const cnv = document.createElement("canvas");
  cnv.width = viewport.width;
  cnv.height = viewport.height;
  await page.render({ canvasContext: cnv.getContext("2d"), viewport }).promise;
  const url = cnv.toDataURL("image/png");
  return new Promise((resolve) => {
    fabric.Image.fromURL(url, (img) => {
      ensureImageCrossOrigin(img);
      const c = App.canvas;
      const pos = centerPos();
      const maxW = c.getWidth() * 0.8;
      const maxH = c.getHeight() * 0.8;
      const s = Math.min(maxW / img.width, maxH / img.height, 1);
      img.set({ ...pos, scaleX: s, scaleY: s });
      c.add(img); c.setActiveObject(img); c.requestRenderAll();
      scheduleAutosave(true);
      resolve(img);
    }, { crossOrigin: "anonymous" });
  });
}

// ---------- thumbnails ----------
export async function refreshThumbnails() {
  const strip = byId("thumbStrip");
  if (!strip) return;

  strip.innerHTML = "";
  App.pages.forEach((p, i) => {
    const thumb = document.createElement("div");
    thumb.className = "thumb" + (i === App.current ? " active" : "");
    thumb.title = `Page ${i+1}`;
    thumb.onclick = () => goToPage(i);

    const img = document.createElement("img");
    img.alt = `Page ${i+1}`;
    img.src = makeThumbDataURL(p);
    thumb.appendChild(img);

    const cap = document.createElement("div");
    cap.className = "thumbCap";
    cap.textContent = `${i+1}`;
    thumb.appendChild(cap);

    strip.appendChild(thumb);
  });
}

function makeThumbDataURL(page) {
  try {
    const preset = getPreset(page.preset || App.preset);
    const sc = new fabric.StaticCanvas(null, { width: preset.w, height: preset.h, backgroundColor: page.json.backgroundColor || "#fff" });
    sc.loadFromJSON(page.json, () => {
      sc.getObjects().forEach(ensureImageCrossOrigin);
      sc.renderAll();
    });
    // NOTE: loadFromJSON is async; but StaticCanvas will render quickly for small thumbs.
    // We'll just return a placeholder then update later via async refresh below.
    const ratio = 240 / preset.w;
    const tmp = document.createElement("canvas");
    tmp.width = 240;
    tmp.height = Math.round(preset.h * ratio);
    const ctx = tmp.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0,0,tmp.width,tmp.height);
    // async draw after a tick
    setTimeout(() => {
      try {
        const url = sc.toDataURL({ format:"png", multiplier: ratio });
        // find current thumb img and update
        // (safe)
      } catch {}
    }, 0);
    // quick synchronous thumb from JSON (may miss images if not ready) - acceptable
    return sc.toDataURL({ format:"png", multiplier: ratio });
  } catch (e) {
    // fallback
    return "";
  }
}

function updatePageInfoUI() {
  const el = byId("pageInfo");
  if (el) el.textContent = `${App.current + 1} / ${App.pages.length}`;
}

// ---------- exports ----------
export async function pageToDataURL(canvas, page, format = "png") {
  return new Promise((resolve) => {
    if (!page || !canvas) {
      resolve(null);
      return;
    }

    const prevTransform = canvas.viewportTransform.slice();
    const prevZoom = canvas.getZoom();

    // reset view
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.setZoom(1);

    canvas.loadFromJSON(page.json, () => {
      canvas.renderAll();

      const dataUrl = canvas.toDataURL({
        format,
        quality: 1,
        multiplier: 2,
        enableRetinaScaling: true
      });

      // restore
      canvas.setViewportTransform(prevTransform);
      canvas.setZoom(prevZoom);
      canvas.renderAll();

      resolve(dataUrl);
    });
  });
}



export async function exportPNG() {
  saveCurrentPage();
  const url = await pageToDataURL(App.pages[App.current], "png");
  downloadDataURL(url, `page-${App.current+1}.png`);
}

export async function exportJPG() {
  saveCurrentPage();
  const url = await pageToDataURL(App.pages[App.current], "jpeg", 0.92);
  downloadDataURL(url, `page-${App.current+1}.jpg`);
}

export async function exportPDF() {
  if (!window.jspdf?.jsPDF) { alert("jsPDF δεν φορτώθηκε."); return; }
  saveCurrentPage();
  const doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });

  for (let i=0;i<App.pages.length;i++){
    const p = App.pages[i];
    const url = await pageToDataURL(p, "jpeg", 0.92);
    const img = await dataURLToImage(url);

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const scale = Math.min(pageW / img.width, pageH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (pageW - w)/2;
    const y = (pageH - h)/2;

    if (i>0) doc.addPage();
    doc.addImage(url, "JPEG", x, y, w, h);
  }

  doc.save("photobook.pdf");
}

// Flipbook: builds a standalone HTML with simple page-flip animation.
// ---------- Flipbook Export & Preview ----------
export async function exportFlipbook() {
  saveCurrentPage();

  if (!App.canvas || !App.pages.length) {
    alert("Δεν υπάρχουν σελίδες");
    return;
  }

  const images = [];

  for (let i = 0; i < App.pages.length; i++) {
    const dataUrl = await pageToDataURL(App.canvas, App.pages[i], "png");
    if (dataUrl) images.push(dataUrl);
  }

  openFlipbookPreview(images);
}

export function openFlipbookPreview(images) {
  const frame = document.getElementById("flipPreviewFrame");
  const modal = document.getElementById("flipPreviewModal");

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<style>
body {
  margin:0;
  background:#111;
  display:flex;
  justify-content:center;
  align-items:center;
}
.book {
  width:80vw;
  height:80vh;
  perspective:2000px;
  position:relative;
}
.page {
  position:absolute;
  inset:0;
  background:#fff;
  transform-origin:left;
  transition:transform .8s ease;
}
.page img {
  width:100%;
  height:100%;
  object-fit:contain;
}
.page.flipped {
  transform:rotateY(-180deg);
}
</style>
</head>
<body>
<div class="book">
  ${images.map((src,i)=>`
    <div class="page" style="z-index:${images.length-i}">
      <img src="${src}">
    </div>
  `).join("")}
</div>

<script>
let index = 0;
const pages = document.querySelectorAll('.page');
document.body.onclick = () => {
  if (index < pages.length) {
    pages[index].classList.add('flipped');
    index++;
  }
};
</script>
</body>
</html>
  `;

  frame.srcdoc = html;
  modal.classList.add("open");
}




export async function previewFlipbook() {
  await exportFlipbook();
}


export function closeFlipbookPreview() {
  const modal = byId("flipPreviewModal");
  const frame = byId("flipPreviewFrame");
  if (frame) frame.src = "about:blank";
  if (modal) modal.classList.remove("open");
}

export async function exportLink() {
  // A "temporary share" link (objectURL) – works on the same device/session.
  const url = await exportFlipbook({ direction: "horizontal" });
  await navigator.clipboard.writeText(url);
  alert("Έγινε αντιγραφή link (προσωρινό / τοπικό). Για πραγματικό share, ανέβασε το flipbook.html στο hosting.");
}

function buildFlipbookHTML(pageDataURLs, direction) {
  const axis = (direction === "vertical") ? "Y" : "X";
  const rotate = (direction === "vertical") ? "rotateY(180deg)" : "rotateY(180deg)";
  // simple book-style flip with CSS 3D
  const pagesJson = JSON.stringify(pageDataURLs);
  return `<!doctype html>
<html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Flipbook</title>
<style>
  html,body{margin:0;height:100%;background:#0b0b0f;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial}
  .wrap{height:100%;display:flex;align-items:center;justify-content:center;gap:16px;padding:16px}
  .book{width:min(900px,92vw);aspect-ratio: 3/2;position:relative;perspective:1800px}
  .page{position:absolute;inset:0;transform-style:preserve-3d;transition:transform 650ms cubic-bezier(.2,.7,.1,1)}
  .page img{width:100%;height:100%;object-fit:contain;background:#fff;border-radius:12px}
  .page.flipped{transform: rotate${axis}(180deg)}
  .controls{display:flex;flex-direction:column;gap:10px}
  button{background:#1f2937;color:#fff;border:1px solid rgba(255,255,255,.14);padding:10px 12px;border-radius:12px;cursor:pointer}
</style>
</head><body>
<div class="wrap">
  <div class="controls">
    <button id="prev">← Prev</button>
    <button id="next">Next →</button>
    <div id="info" style="opacity:.85"></div>
  </div>
  <div class="book" id="book"></div>
</div>
<script>
  const PAGES = ${pagesJson};
  const book = document.getElementById('book');
  let idx = 0;

  function render(){
    book.innerHTML = '';
    // stack pages so that current is top
    for(let i=PAGES.length-1;i>=0;i--){
      const d = document.createElement('div');
      d.className = 'page' + (i < idx ? ' flipped' : '');
      const img = document.createElement('img');
      img.src = PAGES[i];
      d.appendChild(img);
      book.appendChild(d);
    }
    document.getElementById('info').textContent = (idx+1) + ' / ' + PAGES.length;
  }
  function next(){ if(idx < PAGES.length-1){ idx++; render(); } }
  function prev(){ if(idx > 0){ idx--; render(); } }
  document.getElementById('next').onclick = next;
  document.getElementById('prev').onclick = prev;
  document.addEventListener('keydown', (e)=>{ if(e.key==='ArrowRight')next(); if(e.key==='ArrowLeft')prev(); });
  render();
</script>
</body></html>`;
}

function downloadDataURL(dataURL, filename) {
  const a = document.createElement("a");
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ---------- autosave ----------
let autosaveTimer = null;

function scheduleAutosave(immediate = false) {
  if (!App.autosaveEnabled) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => saveDraft(), immediate ? 0 : 600);
}

export async function saveDraft() {
  try {
    saveCurrentPage();
    const payload = {
      v: 1,
      preset: App.preset,
      current: App.current,
      pages: App.pages,
      ts: Date.now(),
    };
    await idbSet(App.autosaveKey, payload);
  } catch (e) {
    console.warn("Draft save failed", e);
    App.autosaveEnabled = false;
    console.warn("Draft too large or blocked, autosave disabled.");
  }
}

export async function loadDraft() {
  try {
    const payload = await idbGet(App.autosaveKey);
    if (!payload || !payload.pages || !payload.pages.length) return false;
    App.pages = payload.pages;
    App.current = clamp(payload.current || 0, 0, App.pages.length - 1);
    App.preset = payload.preset || App.preset;
    await renderCurrentPage();
    refreshThumbnails();
    updatePageInfoUI();
    return true;
  } catch (e) {
    console.warn("Draft load failed", e);
    return false;
  }
}

export async function clearDraft() {
  await idbDel(App.autosaveKey);
  alert("Draft cleared.");
}

// ---------- util ----------
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function dataURLToImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
