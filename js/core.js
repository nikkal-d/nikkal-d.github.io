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
  A4P:    { w: 2480, h: 3508, label: "A4 Portrait (Print)" },
  A4L:    { w: 3508, h: 2480, label: "A4 Landscape (Print)" },
  SQUARE: { w: 2400, h: 2400, label: "Square 20x20cm" },
  LAND32: { w: 3600, h: 2400, label: "Photo 10x15 (3:2)" },
  HD:     { w: 1920, h: 1080, label: "Full HD Screen" }
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

export async function renderCurrentPage() {
  if (!App.pages[App.current]) return;
  
  // Καθαρισμός καμβά πριν τη φόρτωση νέας σελίδας
  App.canvas.clear(); 
  
  return new Promise((resolve) => {
    App.canvas.loadFromJSON(App.pages[App.current].json, () => {
      App.canvas.renderAll();
      updatePageInfoUI();
      resolve();
    });
  });
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


export async function exportFlipbook() {
    // 1. Προετοιμασία
    saveCurrentPage();
    const images = [];
    const wasAutosave = App.autosaveEnabled;
    App.autosaveEnabled = false;

    // 2. Δημιουργία εικόνων - Μία προς μία με ΠΛΗΡΗ απομόνωση
    for (let i = 0; i < App.pages.length; i++) {
        await new Promise((resolve) => {
            // Δημιουργούμε έναν "φανταστικό" καμβά μόνο για αυτή τη σελίδα
            const tempEl = document.createElement('canvas');
            tempEl.width = App.canvas.width;
            tempEl.height = App.canvas.height;
            
            const tempCanvas = new fabric.StaticCanvas(tempEl, {
                enableRetinaScaling: false,
                renderOnAddRemove: false
            });

            // Φόρτωση δεδομένων
            tempCanvas.loadFromJSON(App.pages[i].json, () => {
                // Επιβολή render όλων των αντικειμένων (εικόνες, κείμενα)
                tempCanvas.renderAll();
                
                // Δίνουμε χρόνο στον browser να επεξεργαστεί τα γραφικά
                setTimeout(() => {
                    tempCanvas.renderAll(); // Δεύτερο render για σιγουριά
                    const dataUrl = tempCanvas.toDataURL({
                        format: 'jpeg',
                        quality: 0.7,
                        multiplier: 1 // Διατηρούμε τις αρχικές διαστάσεις
                    });
                    
                    images.push(dataUrl);
                    
                    // ΚΑΤΑΣΤΡΟΦΗ του προσωρινού καμβά για απελευθέρωση μνήμης
                    tempCanvas.dispose();
                    tempEl.remove();
                    resolve();
                }, 350); 
            });
        });
    }

    App.autosaveEnabled = wasAutosave;
    await renderCurrentPage();

    // 3. Κατασκευή του HTML
    let leafHtml = "";
    for (let j = 0; j < images.length; j += 2) {
        const front = images[j];
        const back = images[j+1] || null;
        const zIndex = 100 - j;

        leafHtml += `
            <div class="leaf" style="z-index: ${zIndex}">
                <div class="page front"><img src="${front}"></div>
                <div class="page back">
                    ${back ? `<img src="${back}">` : '<div style="background:white;width:100%;height:100%"></div>'}
                </div>
            </div>`;
    }

    const html = `
    <!doctype html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { margin:0; background:#111; color:white; font-family:sans-serif; overflow:hidden; }
            .nav { width:100%; background:#000; padding:10px; display:flex; justify-content:center; gap:15px; position:fixed; top:0; z-index:1000; }
            .btn { padding:10px 18px; border:none; border-radius:4px; cursor:pointer; font-weight:bold; color:white; font-size:12px; }
            
            .viewport { width:100vw; height:100vh; display:flex; justify-content:center; align-items:center; perspective:2500px; }
            
            /* ΔΙΑΣΤΑΣΕΙΣ ΠΟΥ ΑΚΟΛΟΥΘΟΥΝ ΤΟΝ EDITOR */
            .book { 
                position:relative; 
                width: 80vh; height: 56.5vh; /* Αναλογία ~1.41 (A4) */
                transform-style:preserve-3d; transition:transform 0.5s ease;
            }
            
            .leaf { position:absolute; width:100%; height:100%; transform-origin:left center; transform-style:preserve-3d; transition:transform 0.7s ease; }
            .page { position:absolute; width:100%; height:100%; backface-visibility:hidden; background:white; box-shadow: 0 5px 25px rgba(0,0,0,0.5); }
            .front { z-index:2; border-right: 1px solid rgba(0,0,0,0.05); }
            .back { transform:rotateY(180deg); z-index:1; border-left: 1px solid rgba(0,0,0,0.05); }
            .page img { width:100%; height:100%; object-fit:contain; background:white; }
            
            .leaf.flipped { transform:rotateY(-180deg); }
            .arrow { position:fixed; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.1); color:white; border:none; width:60px; height:60px; border-radius:50%; font-size:30px; cursor:pointer; z-index:2000; }
            
            @media print {
                @page { size: A4 landscape; margin:0; }
                .no-print { display:none !important; }
                .print-only { display:block !important; }
                .pdf-page { page-break-after:always; width:100vw; height:100vh; }
                .pdf-page img { width:100%; height:100%; object-fit:contain; }
            }
            .print-only { display:none; }
        </style>
    </head>
    <body>
        <div class="nav no-print">
            <button class="btn" style="background:#27ae60" onclick="window.print()">📥 Download PDF</button>
            <button class="btn" style="background:#3498db" id="sBtn">💾 Save HTML</button>
            <button class="btn" style="background:#e74c3c" onclick="window.parent.closeFlipbookPreview()">X</button>
        </div>
        <button class="arrow no-print" style="left:20px" onclick="p()">❮</button>
        <button class="arrow no-print" style="right:20px" onclick="n()">❯</button>
        <div class="viewport no-print"><div class="book" id="bx">${leafHtml}</div></div>
        <div class="print-only">${images.map(s => `<div class="pdf-page"><img src="${s}"></div>`).join('')}</div>
        <script>
            let c=0; const ls=document.querySelectorAll('.leaf');
            function n(){ if(c<ls.length){ ls[c].classList.add('flipped'); c++; u(); } }
            function p(){ if(c>0){ c--; ls[c].classList.remove('flipped'); u(); } }
            function u(){ document.getElementById('bx').style.transform=c>0?"translateX(50%)":"translateX(0)"; }
            document.getElementById('sBtn').onclick=()=>{
                const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([document.documentElement.outerHTML],{type:'text/html'}));
                a.download='Photobook.html'; a.click();
            };
        </script>
    </body>
    </html>`;

    const modal = document.getElementById("flipPreviewModal");
    const frame = document.getElementById("flipPreviewFrame");
    frame.srcdoc = html;
    modal.style.display = "block";
}


// Ορισμός των exports ΜΙΑ ΦΟΡΑ στο τέλος
export const previewFlipbook = exportFlipbook;

export function closeFlipbookPreview() {
  const modal = document.getElementById("flipPreviewModal");
  if (modal) modal.style.display = "none";
}
window.closeFlipbookPreview = closeFlipbookPreview;

export async function saveDraft() {
  try {
    saveCurrentPage();
    const payload = { v: 1, preset: App.preset, current: App.current, pages: App.pages, ts: Date.now() };
    await idbSet(App.autosaveKey, payload);
  } catch (e) { console.warn("Save failed", e); }
}

export async function loadDraft() {
  try {
    const payload = await idbGet(App.autosaveKey);
    if (!payload || !payload.pages || !payload.pages.length) return false;
    App.pages = payload.pages;
    App.current = Math.max(0, Math.min(payload.current || 0, App.pages.length - 1));
    App.preset = payload.preset || App.preset;
    await renderCurrentPage();
    return true;
  } catch (e) { return false; }
}

let autosaveTimeout = null;
export function scheduleAutosave(immediate = false) {
  if (!App.autosaveEnabled) return;
  if (autosaveTimeout) clearTimeout(autosaveTimeout);
  autosaveTimeout = setTimeout(() => saveDraft(), immediate ? 0 : 1000);
}

export async function clearDraft() {
  if (confirm("Διαγραφή προσχεδίου;")) {
    await idbDel(App.autosaveKey);
    location.reload();
  }
}
export function exportLink() { alert("Coming soon"); }
