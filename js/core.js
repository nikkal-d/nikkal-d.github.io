// js/core.js
import { uploadPhotobook } from "./saveToFirebase.js";

export let fabricCanvas = null;
export let pages = [];
export let currentPage = 0;

export function initCanvas() {
  fabricCanvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    backgroundColor: "#ffffff"
  });

  addPage(true);
}

export function addPage(isFirst = false) {
  if (!isFirst) saveCurrentPage();

  pages.push({ json: null });
  currentPage = pages.length - 1;

  fabricCanvas.clear();
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));
  updatePageInfo();
}

export function saveCurrentPage() {
  if (!pages[currentPage]) return;
  pages[currentPage].json = fabricCanvas.toJSON();
}

export function loadPage(index) {
  if (!pages[index]) return;
  saveCurrentPage();
  currentPage = index;

  fabricCanvas.clear();
  if (pages[index].json) {
    fabricCanvas.loadFromJSON(pages[index].json, () => {
      fabricCanvas.renderAll();
    });
  }
  updatePageInfo();
}

export function updatePageInfo() {
  const el = document.getElementById("pageInfo");
  if (el) el.textContent = `${currentPage + 1} / ${pages.length}`;
}

/* =========================
   OBJECTS
========================= */

export function addText() {
  const t = new fabric.Textbox("Text", {
    left: 200,
    top: 200,
    fontSize: 48,
    fill: "#111"
  });
  fabricCanvas.add(t);
}

export function addCircle() {
  const c = new fabric.Circle({
    radius: 60,
    fill: "#3b82f6",
    left: 200,
    top: 200
  });
  fabricCanvas.add(c);
}

export function addRect() {
  const r = new fabric.Rect({
    width: 160,
    height: 100,
    fill: "#22c55e",
    left: 200,
    top: 200
  });
  fabricCanvas.add(r);
}

export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(400);
      img.set({ left: 200, top: 200 });
      fabricCanvas.add(img);
    });
  };
  reader.readAsDataURL(file);
}

/* =========================
   ZOOM (CANVAS)
========================= */

let zoom = 1;

export function setZoom(z) {
  zoom = Math.max(0.2, Math.min(3, z));
  fabricCanvas.setZoom(zoom);
  fabricCanvas.requestRenderAll();

  const zv = document.getElementById("zoomValue");
  if (zv) zv.textContent = Math.round(zoom * 100) + "%";
}

export function zoomIn() { setZoom(zoom + 0.1); }
export function zoomOut() { setZoom(zoom - 0.1); }
export function resetZoom() { setZoom(1); }

/* =========================
   EXPORT FLIPBOOK (FIREBASE)
========================= */

export async function exportFlipbook() {
  saveCurrentPage();

  const images = [];
  for (const p of pages) {
    if (!p.json) continue;

    fabricCanvas.clear();
    await new Promise(res => {
      fabricCanvas.loadFromJSON(p.json, () => {
        fabricCanvas.renderAll();
        images.push(fabricCanvas.toDataURL({ format: "png" }));
        res();
      });
    });
  }

  const docId = await uploadPhotobook(images, {
    title: "My Photobook"
  });

  const link = `${location.origin}/viewer.html?id=${docId}`;
  alert("Flipbook link:\n" + link);
}
