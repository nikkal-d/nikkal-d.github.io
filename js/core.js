// js/core.js
// =====================================================
// CORE CANVAS API – STABLE
// =====================================================

export let fabricCanvas = null;
let zoom = 1;

// ---------- INIT ----------
export function initCanvas(id = "canvas") {
  if (fabricCanvas) return fabricCanvas;

  fabricCanvas = new fabric.Canvas(id, {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
    selection: true
  });

  return fabricCanvas;
}

// ---------- TEXT ----------
export function addText() {
  if (!fabricCanvas) return;

  const t = new fabric.Textbox("Text", {
    left: 150,
    top: 150,
    fontSize: 40,
    fill: "#111",
    fontFamily: "Arial",
    textBaseline: "top" // ✅ FIX
  });

  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  fabricCanvas.requestRenderAll();
}

// ---------- IMAGE ----------
export function addImageFromFile(file) {
  if (!fabricCanvas || !file) return;

  const reader = new FileReader();
  reader.onload = e => {
    fabric.Image.fromURL(e.target.result, img => {
      img.scaleToWidth(300);
      img.left = 150;
      img.top = 150;
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
    });
  };
  reader.readAsDataURL(file);
}

// ---------- EMOJI ----------
export function addEmoji(char) {
  if (!fabricCanvas) return;

  const e = new fabric.Text(char, {
    left: 200,
    top: 200,
    fontSize: 64,
    textBaseline: "top"
  });

  fabricCanvas.add(e);
  fabricCanvas.setActiveObject(e);
  fabricCanvas.requestRenderAll();
}

// ---------- ZOOM ----------
export function getZoom() {
  return zoom;
}

export function applyZoom(value) {
  if (!fabricCanvas) return;

  zoom = Math.min(4, Math.max(0.2, value));
  const center = fabricCanvas.getCenter();
  fabricCanvas.zoomToPoint(
    new fabric.Point(center.left, center.top),
    zoom
  );
  fabricCanvas.requestRenderAll();
}

export function resetZoom() {
  zoom = 1;
  fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  fabricCanvas.requestRenderAll();
}

// ---------- PLACEHOLDERS (για tools.js) ----------
export function refreshThumbnails() {
  // θα μπει κανονικά αργότερα
}

// =====================================================
// COMPAT EXPORTS (για ui.js & tools.js)
// ΜΗΝ τα σβήσεις
// =====================================================

// tools.js τα ζητάει
export function refreshThumbnails() {
  // προσωρινό stub – θα υλοποιηθεί σωστά μετά
}

// ui.js το ζητάει
export function applyZoom(value) {
  setZoom(value);
}
