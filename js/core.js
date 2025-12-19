// js/core.js
// =================================================
// SINGLE SOURCE OF TRUTH – CANVAS
// =================================================

export let fabricCanvas = null;
let zoom = 1;

// --------- FIX FABRIC WARNING (alphabetical) ----------
(function fixFabricBaseline() {
  if (!window.fabric) return;
  const proto = fabric.Textbox.prototype;
  proto.textBaseline = "top";
})();

// ---------------- INIT ----------------
export function initCanvas(canvasId = "canvas") {
  fabricCanvas = new fabric.Canvas(canvasId, {
    preserveObjectStacking: true,
    selection: true
  });

  fabricCanvas.setWidth(1240);
  fabricCanvas.setHeight(1754);
  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));

  console.log("✅ Canvas initialized");

  // expose for debugging ONLY
  window.fabricCanvas = fabricCanvas;
}

// ---------------- TEXT ----------------
export function addText() {
  if (!fabricCanvas) return;

  const t = new fabric.Textbox("Text", {
    left: 150,
    top: 150,
    fontSize: 42,
    fill: "#111",
    fontFamily: "Arial"
  });

  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  fabricCanvas.requestRenderAll();
}

// ---------------- IMAGE ----------------
export function addImageFromFile(file) {
  if (!fabricCanvas || !file) return;

  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(fabricCanvas.getWidth() * 0.5);
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
    });
  };
  reader.readAsDataURL(file);
}

// ---------------- ZOOM ----------------
export function zoomIn() {
  applyZoom(zoom + 0.1);
}

export function zoomOut() {
  applyZoom(zoom - 0.1);
}

export function resetZoom() {
  zoom = 1;
  fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  fabricCanvas.requestRenderAll();
}

export function fitToScreen() {
  resetZoom();
}

function applyZoom(value) {
  if (!fabricCanvas) return;

  zoom = Math.max(0.2, Math.min(4, value));
  const center = fabricCanvas.getCenter();
  fabricCanvas.zoomToPoint(
    new fabric.Point(center.left, center.top),
    zoom
  );
  fabricCanvas.requestRenderAll();
}
