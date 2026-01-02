// js/core.js
// ======================================================
// CORE – SAFE STORAGE (IndexedDB + localStorage)
// No more QuotaExceededError
// ======================================================

export let fabricCanvas = null;

/* ------------------------------
   STATE
--------------------------------*/
let pages = [];
let currentPage = 0;
let zoom = 1;

const LS_KEY = "photobook_state_v1";
const DB_NAME = "photobook_assets";
const DB_STORE = "images";

/* ------------------------------
   INDEXED DB (IMAGES)
--------------------------------*/
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveImage(id, blob) {
  const db = await openDB();
  const tx = db.transaction(DB_STORE, "readwrite");
  tx.objectStore(DB_STORE).put(blob, id);
  return tx.complete;
}

async function loadImage(id) {
  const db = await openDB();
  const tx = db.transaction(DB_STORE, "readonly");
  return new Promise(res => {
    const req = tx.objectStore(DB_STORE).get(id);
    req.onsuccess = () => res(req.result || null);
  });
}

/* ------------------------------
   INIT CANVAS
--------------------------------*/
export function initCanvas() {
  fabricCanvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  setCanvasSize("A4P");
  loadState();
  renderPage();
}

/* ------------------------------
   CANVAS SIZE
--------------------------------*/
export function setCanvasSize(preset) {
  const sizes = {
    A4P: [1240, 1754],
    A4L: [1754, 1240],
    SQUARE: [1400, 1400],
    HD: [1920, 1080]
  };
  const [w, h] = sizes[preset] || sizes.A4P;
  fabricCanvas.setWidth(w);
  fabricCanvas.setHeight(h);
  fabricCanvas.setBackgroundColor("#fff", fabricCanvas.renderAll.bind(fabricCanvas));
  fitCanvas();
}

export function fitCanvas() {
  const host = document.getElementById("canvasHost");
  if (!host) return;

  const scale = Math.min(
    host.clientWidth / fabricCanvas.width,
    host.clientHeight / fabricCanvas.height
  ) * 0.95;

  zoom = scale;
  fabricCanvas.setZoom(scale);
  fabricCanvas.renderAll();
}

/* ------------------------------
   ZOOM
--------------------------------*/
export function zoomIn() {
  zoom = Math.min(3, zoom + 0.1);
  fabricCanvas.setZoom(zoom);
}
export function zoomOut() {
  zoom = Math.max(0.2, zoom - 0.1);
  fabricCanvas.setZoom(zoom);
}
export function resetZoom() {
  fitCanvas();
}

/* ------------------------------
   PAGES
--------------------------------*/
export function addPage() {
  pages.push({ objects: [] });
  currentPage = pages.length - 1;
  renderPage();
  saveState();
}

export function duplicatePage() {
  const clone = JSON.parse(JSON.stringify(pages[currentPage]));
  pages.splice(currentPage + 1, 0, clone);
  currentPage++;
  renderPage();
  saveState();
}

export function prevPage() {
  if (currentPage > 0) {
    saveCurrentPage();
    currentPage--;
    renderPage();
  }
}

export function nextPage() {
  if (currentPage < pages.length - 1) {
    saveCurrentPage();
    currentPage++;
    renderPage();
  }
}

/* ------------------------------
   OBJECTS
--------------------------------*/
export function addText() {
  const t = new fabric.Textbox("Text", {
    left: fabricCanvas.width / 2,
    top: fabricCanvas.height / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111"
  });
  fabricCanvas.add(t);
}

export async function addImageFromFile(file) {
  const id = crypto.randomUUID();
  await saveImage(id, file);

  const url = URL.createObjectURL(file);
  fabric.Image.fromURL(url, img => {
    img.assetId = id;
    img.scaleToWidth(fabricCanvas.width * 0.5);
    fabricCanvas.add(img);
  });
}

/* ------------------------------
   SAVE / LOAD
--------------------------------*/
function saveCurrentPage() {
  const json = fabricCanvas.toJSON(["assetId"]);
  pages[currentPage].objects = json.objects;
}

function renderPage() {
  fabricCanvas.clear();
  const page = pages[currentPage];
  if (!page) return;

  fabric.util.enlivenObjects(page.objects, async objects => {
    for (const obj of objects) {
      if (obj.type === "image" && obj.assetId) {
        const blob = await loadImage(obj.assetId);
        if (blob) {
          const url = URL.createObjectURL(blob);
          fabric.Image.fromURL(url, img => {
            img.set(obj);
            fabricCanvas.add(img);
          });
        }
      } else {
        fabricCanvas.add(obj);
      }
    }
    fabricCanvas.renderAll();
  });
}

function saveState() {
  saveCurrentPage();
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({ pages, currentPage })
  );
}

function loadState() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) {
    pages = [{ objects: [] }];
    return;
  }
  const data = JSON.parse(raw);
  pages = data.pages || [{ objects: [] }];
  currentPage = data.currentPage || 0;
}
