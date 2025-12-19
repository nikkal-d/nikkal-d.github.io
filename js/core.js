// js/core.js
import { fabric } from "https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.esm.min.js";

export let fabricCanvas = null;
let zoom = 1;

// ==========================
// INIT
// ==========================
export function initCanvas(canvasId) {
  const el = document.getElementById(canvasId);
  if (!el) {
    console.error("Canvas element not found");
    return;
  }

  fabricCanvas = new fabric.Canvas(canvasId, {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
    selection: true,
  });

  fabricCanvas.renderAll();
  console.log("✅ Canvas initialized");
}

// ==========================
// TEXT
// ==========================
export function addText() {
  if (!fabricCanvas) return;

  const text = new fabric.Textbox("Text", {
    left: 150,
    top: 150,
    fontSize: 40,
    fill: "#111",
    fontFamily: "Arial",
  });

  fabricCanvas.add(text);
  fabricCanvas.setActiveObject(text);
  fabricCanvas.requestRenderAll();
}

// ==========================
// IMAGE
// ==========================
export function addImageFromFile(file) {
  if (!fabricCanvas || !file) return;

  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, (img) => {
      img.scaleToWidth(fabricCanvas.getWidth() * 0.4);
      img.left = 100;
      img.top = 100;
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
    });
  };
  reader.readAsDataURL(file);
}

// ==========================
// ZOOM
// ==========================
export function applyZoom(factor) {
  if (!fabricCanvas) return;

  zoom = Math.min(4, Math.max(0.2, zoom * factor));
  fabricCanvas.setZoom(zoom);
  fabricCanvas.requestRenderAll();

  const zv = document.getElementById("zoomValue");
  if (zv) zv.textContent = Math.round(zoom * 100) + "%";
}

export function resetZoom() {
  if (!fabricCanvas) return;
  zoom = 1;
  fabricCanvas.setZoom(1);
  fabricCanvas.viewportTransform = [1, 0, 0, 1, 0, 0];
  fabricCanvas.requestRenderAll();

  const zv = document.getElementById("zoomValue");
  if (zv) zv.textContent = "100%";
}

export function fitToScreen() {
  if (!fabricCanvas) return;
  resetZoom();
}
