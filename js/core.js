// js/core.js
// Photobook core (Fabric.js)
// - Pages with thumbnails
// - Canvas zoom/fit + page size presets
// - Export: PNG/JPG/PDF + Flipbook (all pages)
// - Autosave via IndexedDB (avoids localStorage quota)
// - Optional Firebase hooks (if window.FirebaseStore is provided)

export const App = {
  canvas: null,
  pages: [],
  current: 0,
  preset: "A4P",
  zoom: 1,
  autosaveEnabled: true,
  autosaveKey: "photobook_draft_v3",
};

const PRESETS = {
  A4P:    { w: 2480, h: 3508, label: "A4 Portrait (Print)" },
  A4L:    { w: 3508, h: 2480, label: "A4 Landscape (Print)" },
  SQUARE: { w: 2400, h: 2400, label: "Square 20x20cm" },
  LAND32: { w: 3600, h: 2400, label: "Photo 3:2" },
  HD:     { w: 1920, h: 1080, label: "Full HD" }
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

// Σωστή σειρά αρχικοποίησης
App.canvas = new fabric.Canvas('c', { // Το 'c' πρέπει να είναι το ID του canvas στο HTML
    preserveObjectStacking: true,
    backgroundColor: 'white'
});

// ΤΩΡΑ ρυθμίζουμε τα properties, αφού το App.canvas ΔΕΝ είναι πια null
App.canvas.selection = true;
App.canvas.renderOnAddRemove = false; 
fabric.Object.prototype.objectCaching = true;

App.canvas.on('image:loaded', () => {
    console.log("Μια εικόνα μόλις φορτώθηκε από το Firebase!");
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
    
    const newPage = {
        // Σημαντικό: Το json πρέπει να είναι ένα καθαρό αντικείμενο fabric
        json: { objects: [], background: "white" },
        preset: App.preset
    };

    App.pages.push(newPage);
    App.current = App.pages.length - 1;

    App.canvas.clear(); 
    App.canvas.setBackgroundColor("white", () => {
        App.canvas.renderAll();
        refreshThumbnails(); 
        updatePageInfoUI();
        saveDraft(); // Σώσε αμέσως τη νέα κενή σελίδα
    });
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
export function setCanvasSize(presetKey) {
  const size = PRESETS[presetKey];
  if (!size) return;

  App.preset = presetKey;
  
  // Επιβολή διαστάσεων στον Fabric καμβά
  App.canvas.setWidth(size.w);
  App.canvas.setHeight(size.h);
  App.canvas.setDimensions({ width: size.w, height: size.h });

  // Ενημέρωση της τρέχουσας σελίδας
  if (App.pages[App.current]) {
    App.pages[App.current].preset = presetKey;
  }

  fitToScreen(); // Αυτό θα το φέρει στα ίσια του οπτικά
  App.canvas.renderAll();
  saveDraft();
}


export function fitToScreen() {
  if (!App.canvas) return;
  const container = document.querySelector(".canvasHost");
  if (!container) return;

  // Αυξάνουμε το pad στα 120 για να "αναπνέει" ο καμβάς
  const pad = 120; 
  const cw = container.clientWidth - pad;
  const ch = container.clientHeight - pad;

  const preset = PRESETS[App.preset] || PRESETS.A4P;
  
  // Υπολογισμός zoom ώστε να χωράει 100% στην οθόνη
  const zoom = Math.min(cw / preset.w, ch / preset.h);

  setZoom(zoom);
}



export function setZoom(n) {
  const next = Math.max(0.05, Math.min(5, n));
  App.zoom = next;
  if (!App.canvas) return;

  // Παίρνουμε τις διαστάσεις του τρέχοντος preset (π.χ. Α4)
  const preset = PRESETS[App.preset] || PRESETS.A4P;

  // 1. Αλλάζουμε το οπτικό μέγεθος του καμβά στην οθόνη
  App.canvas.setDimensions({
    width: preset.w * next,
    height: preset.h * next
  });

  // 2. Εφαρμόζουμε το zoom στο περιεχόμενο
  App.canvas.setZoom(next);

  App.canvas.requestRenderAll();
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
export async function pageToDataURL(canvas, page, format, multiplier = 2) {
  return new Promise((resolve) => {
    canvas.loadFromJSON(page.json, () => {
      canvas.renderAll();
      const dataUrl = canvas.toDataURL({
        format: format,
        quality: 1,
        multiplier: multiplier, // Εδώ ορίζεται η τελική διάσταση
        enableRetinaScaling: true
      });
      resolve(dataUrl);
    });
  });
}



export async function exportPNG(multiplier = 2) {
  saveCurrentPage();
  // Περνάμε το multiplier στη βοηθητική συνάρτηση
  const url = await pageToDataURL(App.canvas, App.pages[App.current], "png", multiplier);
  downloadDataURL(url, `page-${App.current + 1}.png`);
}

export async function exportJPG(multiplier = 2) {
  saveCurrentPage();
  const url = await pageToDataURL(App.canvas, App.pages[App.current], "jpeg", multiplier);
  downloadDataURL(url, `page-${App.current + 1}.jpg`);
}



export async function exportPDF() {
  saveCurrentPage();
  const { jsPDF } = window.jspdf;
  
  // 1. Παίρνουμε το μέγεθος (π.χ. A4L για οριζόντιο)
  const size = PRESETS[App.preset];
  const isLandscape = size.w > size.h;

  // 2. Δημιουργούμε το PDF σε χιλιοστά (mm) - Αυτό είναι το κλειδί!
  const pdf = new jsPDF({
    orientation: isLandscape ? "l" : "p",
    unit: "mm",
    format: "a4"
  });

  // Διαστάσεις χαρτιού Α4 σε mm
  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;

  // Καθαρίζουμε τυχόν επιλεγμένα αντικείμενα για να μην φαίνονται τα πλαίσια
  App.canvas.discardActiveObject();

  for (let i = 0; i < App.pages.length; i++) {
    const page = App.pages[i];
    
    await new Promise((resolve) => {
      App.canvas.loadFromJSON(page.json, () => {
        // Επιβολή των σωστών pixels στον καμβά πριν τη λήψη της φωτογραφίας
        App.canvas.setDimensions({ width: size.w, height: size.h });
        App.canvas.renderAll();
        
        // Λήψη εικόνας σε υψηλή ποιότητα
        const imgData = App.canvas.toDataURL({
          format: "jpeg",
          quality: 1.0,
          multiplier: 1
        });

        if (i > 0) {
          pdf.addPage("a4", isLandscape ? "l" : "p");
        }
        
        // Η ΕΝΤΟΛΗ ΠΟΥ ΤΟ ΦΤΙΑΧΝΕΙ: 
        // Λέμε στην εικόνα να ξεκινήσει από το 0,0 και να απλωθεί σε ΟΛΑ τα χιλιοστά της σελίδας
        pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
        resolve();
      });
    });
  }

  pdf.save("photobook_final.pdf");
  renderCurrentPage(); // Επιστροφή στην κανονική προβολή
}


// Βοηθητική συνάρτηση για τη μετατροπή κάθε σελίδας σε εικόνα υψηλής ανάλυσης
async function renderPageToDataURL(page) {
  return new Promise((resolve) => {
    const preset = PRESETS[page.preset || App.preset];
    // Δημιουργούμε έναν προσωρινό static canvas για το rendering
    const tempCanvas = new fabric.StaticCanvas(null, {
      width: preset.w,
      height: preset.h,
      backgroundColor: page.json.backgroundColor || "#ffffff"
    });

    tempCanvas.loadFromJSON(page.json, () => {
      tempCanvas.renderAll();
      // multiplier: 2 για καλή ποιότητα στο export
      const dataUrl = tempCanvas.toDataURL({
        format: 'jpeg',
        quality: 0.9,
        multiplier: 2
      });
      tempCanvas.dispose();
      resolve(dataUrl);
    });
  });
}


// Flipbook: builds a standalone HTML with simple page-flip animation.
// ---------- Flipbook Export & Preview ----------
export async function exportFlipbook() {
  const images = [];
  // 1. Μετατροπή όλων των σελίδων σε εικόνες
  for (const page of App.pages) {
    await new Promise((resolve) => {
      App.canvas.loadFromJSON(page.json, () => {
        images.push(App.canvas.toDataURL({ format: "jpeg", quality: 0.8 }));
        resolve();
      });
    });
  }

  // 2. Λήψη τρεχουσών διαστάσεων για το σωστό σχήμα
  const size = PRESETS[App.preset] || { w: 2480, h: 3508 };

  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>My Photobook Flipbook</title>
  <style>
    body { margin:0; background:#111; display:flex; justify-content:center; align-items:center; height:100vh; overflow:hidden; }
    .book {
      /* ΕΔΩ ΕΙΝΑΙ Η ΔΙΟΡΘΩΣΗ: Δυναμική αναλογία για το αρχείο export */
      aspect-ratio: ${size.w} / ${size.h};
      height: 90vh;
      max-width: 95vw;
      position: relative;
      perspective: 2000px;
    }
    .page {
      position: absolute; inset: 0; background: #fff;
      transform-origin: left center;
      transition: transform .8s cubic-bezier(0.645, 0.045, 0.355, 1);
      backface-visibility: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .page img { width: 100%; height: 100%; object-fit: fill; }
    .page.flipped { transform: rotateY(-180deg); }
  </style>
</head>
<body>
  <div class="book" id="book">
    ${images.map((src, i) => `
      <div class="page" style="z-index:${images.length - i}">
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
      } else {
        // Reset αν φτάσει στο τέλος
        pages.forEach(p => p.classList.remove('flipped'));
        index = 0;
      }
    };
  </script>
</body>
</html>`;

  // 3. Λήψη και κατέβασμα του αρχείου
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "photobook-flipbook.html";
  a.click();
  
  renderCurrentPage(); // Επιστροφή στον καμβά
}


export function openFlipbookPreview(images) {
  const frame = document.getElementById("flipPreviewFrame");
  const modal = document.getElementById("flipPreviewModal");

  if (!frame || !modal) return;

  // Παίρνουμε τις διαστάσεις από το App (π.χ. A4L) για να ξέρει το Flipbook το σχήμα του
  const size = PRESETS[App.preset] || { w: 3508, h: 2480 };

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
    flex-direction: column;
    justify-content:center;
    align-items:center;
    height: 100vh;
    font-family: sans-serif;
  }
  /* Κουμπί για PDF */
  .print-btn {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    background: #27ae60;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-weight: bold;
    z-index: 9999;
  }
  .print-btn:hover { background: #2ecc71; }

  .book {
    /* Εδώ ορίζουμε το σωστό σχήμα (Landscape ή Portrait) */
    aspect-ratio: ${size.w} / ${size.h};
    height: 80vh;
    max-width: 90vw;
    perspective: 2000px;
    position: relative;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  }
  .page {
    position: absolute;
    inset: 0;
    background: #fff;
    transform-origin: left;
    transition: transform .8s ease;
    backface-visibility: hidden;
  }
  .page img {
    width: 100%;
    height: 100%;
    object-fit: fill; /* Γεμίζει όλη τη σελίδα χωρίς κενά */
  }
  .page.flipped {
    transform: rotateY(-180deg);
  }

  /* ΡΥΘΜΙΣΕΙΣ ΓΙΑ ΤΟ PDF (PRINT) */
  @media print {
    body { background: white !important; }
    .print-btn { display: none !important; }
    .book { 
      width: 100% !important; 
      height: auto !important; 
      aspect-ratio: auto !important;
      box-shadow: none !important;
      transform: none !important;
    }
    .page { 
      position: relative !important; 
      display: block !important;
      page-break-after: always !important; /* Κάθε σελίδα σε νέα σελίδα PDF */
      transform: none !important;
      opacity: 1 !important;
    }
  }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Download as PDF</button>

  <div class="book" id="bookElement">
    ${images.map((src, i) => `
      <div class="page" style="z-index:${images.length - i}">
        <img src="${src}">
      </div>
    `).join("")}
  </div>

<script>
let index = 0;
const pages = document.querySelectorAll('.page');
// Κλικ οπουδήποτε για να γυρίσει η σελίδα (εκτός από το κουμπί)
document.body.onclick = (e) => {
  if (e.target.classList.contains('print-btn')) return;
  if (index < pages.length) {
    pages[index].classList.add('flipped');
    index++;
  } else {
    // Αν τελειώσει, κάνει reset
    pages.forEach(p => p.classList.remove('flipped'));
    index = 0;
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
  // Αντί να κατεβάζει αρχείο, θα μπορούσαμε να ανοίγουμε το modal, 
  // αλλά η πιο σίγουρη λύση για να δεις το animation είναι το export.
  // Προς το παρόν, ας καλούμε την exportFlipbook που δουλεύει σωστά.
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

// Στο core.js
export async function loadDraft() {
    // Διαβάζουμε από την IndexedDB (idbGet) και όχι από το localStorage
    const data = await idbGet(App.autosaveKey);
    if (!data) return false;
    
    App.pages = data.pages || [];
    App.current = data.current || 0;
    App.preset = data.preset || "A4P";
    
    await renderCurrentPage();
    return true;
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
