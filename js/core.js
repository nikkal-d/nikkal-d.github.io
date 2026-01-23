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
  autosaveKey: "photobook_draft_v3"
}; // <--- Εδώ κλείνει το αντικείμενο

window.App = App; // <--- Μετά το κλείσιμο, το κάνουμε ορατό παντού


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

export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = (f) => {
    const data = f.target.result;
    
    const imgObj = new Image();
    imgObj.src = data;
    imgObj.onload = function () {
      // 1. Υπολογισμός μέγιστης διάστασης (π.χ. 1600px) για ταχύτητα
      const maxSide = 1600;
      let w = imgObj.width;
      let h = imgObj.height;

      if (w > maxSide || h > maxSide) {
        if (w > h) {
          h = (maxSide / w) * h;
          w = maxSide;
        } else {
          w = (maxSide / h) * w;
          h = maxSide;
        }
      }

      // 2. Δημιουργία προσωρινού καμβά για το Resize
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgObj, 0, 0, w, h);

      // 3. Ανέβασμα της "ελαφριάς" εικόνας στον Fabric Canvas
      const resizedData = canvas.toDataURL('image/jpeg', 0.8);
      
      fabric.Image.fromURL(resizedData, (img) => {
        img.scaleToWidth(App.canvas.width * 0.5);
        App.canvas.add(img);
        App.canvas.setActiveObject(img);
        App.canvas.renderAll();
        scheduleAutosave();
      });
    };
  };
  reader.readAsDataURL(file);
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
  saveCurrentPage();
  const images = [];
  const wasAutosave = App.autosaveEnabled;
  App.autosaveEnabled = false;

  for (let i = 0; i < App.pages.length; i++) {
    await new Promise((resolve) => {
      App.canvas.loadFromJSON(App.pages[i].json, () => {
        App.canvas.renderAll();
        setTimeout(() => {
          App.canvas.renderAll();
          images.push(App.canvas.toDataURL({ format: 'jpeg', quality: 0.9, multiplier: 1.0 }));
          resolve();
        }, 250);
      });
    });
  }
  
  App.autosaveEnabled = wasAutosave;
  await renderCurrentPage();

  const modal = document.getElementById("flipPreviewModal");
  const frame = document.getElementById("flipPreviewFrame");
  if (!modal || !frame) return;

  let leavesHtml = "";
  for (let i = 0; i < images.length; i += 2) {
    const isCover = (i === 0);
    const zIndex = Math.floor((images.length - i) / 2) + 50;
    leavesHtml += `
      <div class="leaf ${isCover ? 'hard-cover-front' : ''}" style="z-index: ${zIndex}">
        <div class="page front"><img src="${images[i]}"></div>
        <div class="page back">${images[i+1] ? `<img src="${images[i+1]}">` : '<div style="background:white;width:100%;height:100%"></div>'}</div>
      </div>`;
  }

  const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      :root { --bg-grad: linear-gradient(135deg, #2c3e50, #000000); --cover-grad: linear-gradient(to bottom, #333, #000); }
      
      body { 
        margin:0; background: var(--bg-grad); background-attachment: fixed;
        color:white; font-family: 'Segoe UI', sans-serif; 
        display:flex; flex-direction:column; height:100vh; overflow:hidden; 
      }
      
      .nav { 
        width:100%; background: rgba(0,0,0,0.85); padding:10px; 
        display:flex; justify-content:center; align-items:center; gap:10px; z-index:9999;
        backdrop-filter: blur(10px); border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      
      .btn { padding:10px 16px; border:none; border-radius:20px; cursor:pointer; font-weight:bold; color:white; background: linear-gradient(to bottom, #555, #333); transition:0.3s; display:flex; align-items:center; gap:5px; font-size:11px; }
      .btn:hover { transform:translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
      .btn-primary { background: linear-gradient(135deg, #27ae60, #1e8449); }
      .btn-danger { background: linear-gradient(135deg, #e74c3c, #c0392b); }

      /* VIEWPORT ΜΕ SCROLLBAR ΓΙΑ ZOOM */
      .viewport { 
        flex:1; width:100%; display:flex; justify-content:center; align-items:center; 
        perspective:3000px; overflow: auto; padding: 50px;
        scrollbar-width: thin; scrollbar-color: #555 transparent;
      }
      .viewport::-webkit-scrollbar { height: 8px; width: 8px; }
      .viewport::-webkit-scrollbar-thumb { background: #555; border-radius: 10px; }

      .book { 
        position:relative; width: 80vh; height: 56vh; 
        transform-style:preserve-3d; transition: transform 0.6s cubic-bezier(0.645, 0.045, 0.355, 1);
        transform-origin: center center;
      }

      .leaf { position:absolute; inset:0; transform-origin:left center; transition:transform 0.7s ease-in-out; transform-style:preserve-3d; }
      .page { position:absolute; inset:0; background:white; backface-visibility:hidden; box-shadow: inset 0 0 50px rgba(0,0,0,0.05); }
      .page img { width:100%; height:100%; object-fit:contain; pointer-events: none; }

      .hard-cover-front .front { 
        border-radius: 0 4px 4px 0; 
        border-right: 12px solid transparent;
        border-image: var(--cover-grad) 1;
        box-shadow: 20px 0 40px rgba(0,0,0,0.7); 
      }
      
      .page.front::after { content: ""; position: absolute; top: 0; left: 0; width: 40px; height: 100%; background: linear-gradient(to right, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 100%); }
      .back { transform:rotateY(180deg); }
      .flipped { transform:rotateY(-180deg) !important; }

      @media print {
        @page { size: portrait; margin: 0; }
        .nav { display:none !important; }
        body { background: white !important; overflow: visible !important; }
        .viewport { display: block !important; overflow: visible !important; padding: 0 !important; }
        .book { transform: none !important; width: 100% !important; height: auto !important; }
        .leaf { position: relative !important; width: 100% !important; transform: none !important; display: block !important; z-index: auto !important; }
        .page { position: relative !important; display: block !important; width: 100% !important; height: 100vh !important; page-break-after: always !important; transform: none !important; }
        .page.back { transform: none !important; }
      }
    </style>
  </head>
  <body>
    <audio id="snd1" src="https://www.soundjay.com/misc/sounds/page-flip-01a.mp3"></audio>

    <div class="nav">
      <button class="btn" onclick="p()">❮ ΠΙΣΩ (←)</button>
      <button class="btn" onclick="n()">ΕΠΟΜΕΝΟ (→)</button>
      
      <div style="background:rgba(255,255,255,0.1); padding:5px 15px; border-radius:20px; display:flex; align-items:center; gap:10px;">
        <button class="btn" style="width:30px" onclick="changeZoom(-0.2)">−</button>
        <span id="zoomLvl" style="font-size:12px; font-weight:bold; min-width:40px; text-align:center">100%</span>
        <button class="btn" style="width:30px" onclick="changeZoom(0.2)">+</button>
      </div>

      <div style="font-size:10px; display:flex; gap:10px;">
        🎨 ΦΟΝΤΟ <input type="color" value="#2c3e50" onchange="updateColors(this.value, 'bg')">
        📘 ΕΞΩΦΥΛΛΟ <input type="color" value="#333333" onchange="updateColors(this.value, 'cover')">
      </div>

      <button class="btn" onclick="toggleFS()">📺 FULL SCREEN</button>
      <button class="btn btn-primary" onclick="saveH()">💾 HTML</button>
      <button class="btn" style="background: #2980b9" onclick="window.print()">📄 PDF</button>
      <button class="btn btn-danger" onclick="window.parent.closeFlipbookPreview()">✖</button>
    </div>

    <div class="viewport" id="vp">
      <div class="book" id="book">${leavesHtml}</div>
    </div>

    <script>
      let cur = 0, zoom = 1.0;
      const leafs = document.querySelectorAll('.leaf'), book = document.getElementById('book');

      // 1. Έλεγχος Πληκτρολογίου
      window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') n();
        if (e.key === 'ArrowLeft') p();
      });

      function n() {
        if (cur < leafs.length) {
          document.getElementById('snd1').currentTime=0; document.getElementById('snd1').play().catch(()=>{});
          const target = leafs[cur];
          target.classList.add('flipped');
          setTimeout(() => { target.style.zIndex = cur; }, 400);
          cur++; u();
        }
      }

      function p() {
        if (cur > 0) {
          document.getElementById('snd1').currentTime=0; document.getElementById('snd1').play().catch(()=>{});
          cur--;
          leafs[cur].style.zIndex = leafs.length + 50 - cur;
          leafs[cur].classList.remove('flipped');
          u();
        }
      }

      function changeZoom(v) {
        zoom = Math.max(0.5, Math.min(3, zoom + v));
        document.getElementById('zoomLvl').innerText = Math.round(zoom*100)+'%';
        u();
      }

      function updateColors(val, type) {
        if(type === 'bg') document.documentElement.style.setProperty('--bg-grad', \`linear-gradient(135deg, \${val}, #000)\`);
        else document.documentElement.style.setProperty('--cover-grad', \`linear-gradient(to bottom, \${val}, #000)\`);
      }

      function toggleFS() {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
      }

      function u() {
        let x = cur > 0 ? "25%" : "0%"; // Μικρότερο shift για να μην βγαίνει εκτός οθόνης στο zoom
        book.style.transform = \`scale(\${zoom}) translateX(\${x})\`;
      }

      function saveH() {
        const b = new Blob([document.documentElement.outerHTML], {type:'text/html'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'Premium_Album.html'; a.click();
      }
    </script>
  </body>
  </html>`;

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
