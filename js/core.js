// js/core.js
// =====================================================
// SINGLE SOURCE OF TRUTH FOR CANVAS (Fabric.js)
// - Initializes canvas
// - Adds text & images
// - Zoom controls
// - Exposes App for debugging
// =====================================================

export let fabricCanvas = null;

let zoom = 1;

// ---------------- INIT ----------------
export function initCanvas(canvasId) {
  if (fabricCanvas) return fabricCanvas; // guard (avoid double init)

  if (typeof fabric === "undefined") {
    console.error("Fabric.js not loaded. Check <script src=...fabric.min.js> order.");
    return null;
  }

  fabricCanvas = new fabric.Canvas(canvasId, {
    preserveObjectStacking: true,
    selection: true
  });

  fabricCanvas.setBackgroundColor("#ffffff", fabricCanvas.renderAll.bind(fabricCanvas));

  console.log("✅ Canvas initialized");

  // Expose for console/debug + potential legacy onclick usage
  window.App = window.App || {};
  window.App.canvas = fabricCanvas;
  window.App.addText = addText;
  window.App.addImageFromFile = addImageFromFile;
  window.App.zoomIn = zoomIn;
  window.App.zoomOut = zoomOut;
  window.App.resetZoom = resetZoom;
  window.App.fitToScreen = fitToScreen;

  // OPTIONAL: also expose direct globals so `addText()` in console works
  window.addText = addText;
  window.addImageFromFile = addImageFromFile;

  return fabricCanvas;
}

// ---------------- TEXT ----------------
export function addText() {
  if (!fabricCanvas) return;

  const t = new fabric.Textbox("Text", {
    left: 150,
    top: 150,
    fontSize: 44,
    fill: "#111",
    fontFamily: "Arial",

    // 🔥 ΤΟ ΚΛΕΙΔΙ
    textBaseline: "top",
    originX: "left",
    originY: "top"
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
    fabric.Image.fromURL(reader.result, (img) => {
      // fit image to 50% of canvas width
      const targetW = fabricCanvas.getWidth() * 0.5;
      img.scaleToWidth(targetW);

      // center
      img.left = (fabricCanvas.getWidth() - img.getScaledWidth()) / 2;
      img.top = (fabricCanvas.getHeight() - img.getScaledHeight()) / 2;

      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
    });
  };
  reader.readAsDataURL(file);
}

// ---------------- ZOOM ----------------
function applyZoom(value) {
  if (!fabricCanvas) return;
  zoom = Math.max(0.2, Math.min(4, Number(value) || 1));

  const center = new fabric.Point(fabricCanvas.getWidth() / 2, fabricCanvas.getHeight() / 2);
  fabricCanvas.zoomToPoint(center, zoom);
  fabricCanvas.requestRenderAll();

  // update label if exists
  const el = document.getElementById("zoomValue");
  if (el) el.textContent = Math.round(zoom * 100) + "%";
}

export function zoomIn() {
  applyZoom(zoom + 0.1);
}

export function zoomOut() {
  applyZoom(zoom - 0.1);
}

export function resetZoom() {
  zoom = 1;
  if (!fabricCanvas) return;
  fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  fabricCanvas.requestRenderAll();

  const el = document.getElementById("zoomValue");
  if (el) el.textContent = "100%";
}

export function fitToScreen() {
  // Minimal fit: reset for now (later we can compute fit-to-host)
  resetZoom();
}
