// core.js
import { uploadPhotobook } from "./saveToFirebase.js";

export let fabricCanvas = null;
export let pages = [];
export let currentPage = 0;

// --------------------
// INIT
// --------------------
export function initCanvas() {
  fabricCanvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
  });

  pages = [serializeCanvas()];
  currentPage = 0;
}

// --------------------
// PAGE MANAGEMENT
// --------------------
function serializeCanvas() {
  return fabricCanvas.toJSON();
}

function loadCanvas(data) {
  fabricCanvas.loadFromJSON(data, () => {
    fabricCanvas.requestRenderAll();
  });
}

export function addPage() {
  pages[currentPage] = serializeCanvas();
  pages.push(null);
  currentPage = pages.length - 1;
  fabricCanvas.clear();
  fabricCanvas.setBackgroundColor("#ffffff", () => {});
}

export function goToPage(index) {
  if (index < 0 || index >= pages.length) return;
  pages[currentPage] = serializeCanvas();
  currentPage = index;

  fabricCanvas.clear();
  if (pages[index]) {
    loadCanvas(pages[index]);
  }
}

// --------------------
// OBJECTS
// --------------------
export function addText() {
  const t = new fabric.Textbox("Text", {
    left: 200,
    top: 200,
    fontSize: 48,
    fill: "#111",
  });
  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
}

export function addCircle() {
  const c = new fabric.Circle({
    radius: 60,
    fill: "#4f46e5",
    left: 200,
    top: 200,
  });
  fabricCanvas.add(c);
}

export function addRect() {
  const r = new fabric.Rect({
    width: 160,
    height: 100,
    fill: "#22c55e",
    left: 200,
    top: 200,
  });
  fabricCanvas.add(r);
}

export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(400);
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
    });
  };
  reader.readAsDataURL(file);
}

// --------------------
// EXPORT FLIPBOOK (🔥 ΤΟ ΣΗΜΑΝΤΙΚΟ)
// --------------------
export async function exportFlipbook() {
  pages[currentPage] = serializeCanvas();

  const pageImages = [];

  for (let i = 0; i < pages.length; i++) {
    await new Promise(res => {
      fabricCanvas.clear();
      if (pages[i]) {
        loadCanvas(pages[i]);
      }
      setTimeout(() => {
        pageImages.push(fabricCanvas.toDataURL({ format: "png" }));
        res();
      }, 100);
    });
  }

  const docId = await uploadPhotobook(pageImages, {
    title: "My Photobook",
  });

  return docId; // για share link
}
