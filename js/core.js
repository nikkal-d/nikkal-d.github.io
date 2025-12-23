// core.js
export let canvas = null;
let zoomLevel = 1;

// ================= INIT =================
export function initCanvas() {
  if (!window.fabric) {
    console.error("❌ Fabric not loaded");
    return;
  }

  canvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true,
    backgroundColor: "#ffffff",
  });

  setCanvasSize(1240, 1754); // A4 Portrait
  centerCanvas();

  console.log("✅ Canvas initialized");
}

// ================= CANVAS SIZE =================
export function setCanvasSize(w, h) {
  canvas.setWidth(w);
  canvas.setHeight(h);
  canvas.requestRenderAll();
  resetZoom();
}

// ================= CENTER =================
export function centerCanvas() {
  const host = document.getElementById("canvasHost");
  if (!host || !canvas) return;

  const padding = 40;
  const scale = Math.min(
    (host.clientWidth - padding) / canvas.getWidth(),
    (host.clientHeight - padding) / canvas.getHeight()
  );

  zoomLevel = scale;

  canvas.setZoom(scale);
  canvas.absolutePan({
    x: (host.clientWidth - canvas.getWidth() * scale) / 2,
    y: (host.clientHeight - canvas.getHeight() * scale) / 2,
  });

  canvas.requestRenderAll();
}

// ================= ZOOM =================
export function zoomIn() {
  zoomLevel = Math.min(zoomLevel + 0.1, 3);
  canvas.setZoom(zoomLevel);
}

export function zoomOut() {
  zoomLevel = Math.max(zoomLevel - 0.1, 0.2);
  canvas.setZoom(zoomLevel);
}

export function resetZoom() {
  zoomLevel = 1;
  canvas.setZoom(1);
  centerCanvas();
}

export function getZoomPercent() {
  return Math.round(zoomLevel * 100);
}

// ================= TEXT =================
export function addText() {
  if (!canvas) return;

  const center = canvas.getCenter();

  const t = new fabric.Textbox("Text", {
    left: center.left,
    top: center.top,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",          // ΠΑΝΤΑ ΣΚΟΥΡΟ
    backgroundColor: null,
    textAlign: "center",
  });

  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.requestRenderAll();
}
