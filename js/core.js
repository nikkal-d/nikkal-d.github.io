// js/core.js
// =====================================================
// CORE CANVAS API – STABLE & COMPATIBLE
// =====================================================

export let fabricCanvas = null;
let zoom = 1;

// -----------------------------------------------------
// FABRIC FIX – kill "alphabetical" warning forever
// -----------------------------------------------------
(function fixFabricBaseline() {
  if (typeof fabric === "undefined") return;

  const patch = proto => {
    Object.defineProperty(proto, "textBaseline", {
      get() { return "top"; },
      set() {}
    });
  };

  if (fabric.Textbox) patch(fabric.Textbox.prototype);
  if (fabric.IText) patch(fabric.IText.prototype);
})();

// -----------------------------------------------------
// INIT
// -----------------------------------------------------
export function initCanvas(id = "canvas") {
  if (fabricCanvas) return fabricCanvas;

  fabricCanvas = new fabric.Canvas(id, {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
    selection: true
  });

  return fabricCanvas;
}

// -----------------------------------------------------
// TEXT
// -----------------------------------------------------
export function addText() {
  if (!fabricCanvas) return;

  const t = new fabric.Textbox("Text", {
    left: 150,
    top: 150,
    fontSize: 40,
    fill: "#111",
    fontFamily: "Arial",
    textBaseline: "top"
  });

  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  fabricCanvas.requestRenderAll();
}

// -----------------------------------------------------
// IMAGE
// -----------------------------------------------------
export function addImageFromFile(file) {
  if (!fabricCanvas || !file) return;

  const reader = new FileReader();
  reader.onload = e => {
    fabric.Image.fromURL(e.target.result, img => {
      img.set({
        left: 150,
        top: 150,
        scaleX: 0.5,
        scaleY: 0.5
      });
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
    });
  };
  reader.readAsDataURL(file);
}

// -----------------------------------------------------
// EMOJI
// -----------------------------------------------------
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

// -----------------------------------------------------
// ZOOM
// -----------------------------------------------------
export function getZoom() {
  return zoom;
}

export function applyZoom(value) {
  if (!fabricCanvas) return;

  zoom = Math.max(0.2, Math.min(4, Number(value)));
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

export function fitToScreen() {
  if (!fabricCanvas) return;

  const host = document.getElementById("canvasHost");
  if (!host) return;

  const pad = 20;
  const scale = Math.min(
    (host.clientWidth - pad) / fabricCanvas.getWidth(),
    (host.clientHeight - pad) / fabricCanvas.getHeight()
  );

  applyZoom(scale);
}

// -----------------------------------------------------
// REQUIRED STUBS (για tools.js / ui.js)
// -----------------------------------------------------
export function refreshThumbnails() {
  // θα υλοποιηθεί κανονικά αργότερα
}

export function saveCurrentPage() {
  if (!fabricCanvas) return;
  try {
    fabricCanvas.requestRenderAll();
  } catch {}
}
