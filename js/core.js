// js/core.js
// =====================================================
// SINGLE SOURCE OF TRUTH FOR CANVAS
// =====================================================

export let App = {
  canvas: null,
  zoom: 1
};

// ================= INIT =================

export function initCanvas(canvasId = "canvas") {
  if (App.canvas) return; // ❗ init μόνο ΜΙΑ φορά

  const el = document.getElementById(canvasId);
  if (!el || typeof fabric === "undefined") {
    console.error("Canvas or Fabric missing");
    return;
  }

  App.canvas = new fabric.Canvas(canvasId, {
    preserveObjectStacking: true,
    selection: true
  });

  // default size
  App.canvas.setWidth(1240);
  App.canvas.setHeight(1754);
  App.canvas.setBackgroundColor("#ffffff", App.canvas.renderAll.bind(App.canvas));

  bindWheelZoom();

  console.log("✅ Canvas initialized");
}

// ================= TEXT =================

export function addText() {
  if (!App.canvas) return;

  const text = new fabric.Textbox("Text", {
    left: 150,
    top: 150,
    fontSize: 40,
    fill: "#111",
    fontFamily: "Arial",
    textBaseline: "top" // ✅ ΜΟΝΟ ΕΔΩ
  });

  App.canvas.add(text);
  App.canvas.setActiveObject(text);
  App.canvas.requestRenderAll();
}

// ================= IMAGE =================

export function addImageFromFile(file) {
  if (!App.canvas || !file) return;

  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(App.canvas.getWidth() * 0.5);
      img.left = 100;
      img.top = 100;
      App.canvas.add(img);
      App.canvas.setActiveObject(img);
      App.canvas.requestRenderAll();
    });
  };
  reader.readAsDataURL(file);
}

// ================= ZOOM =================

export function applyZoom(value) {
  if (!App.canvas) return;

  App.zoom = Math.max(0.2, Math.min(4, value));

  const center = new fabric.Point(
    App.canvas.getWidth() / 2,
    App.canvas.getHeight() / 2
  );

  App.canvas.zoomToPoint(center, App.zoom);
  App.canvas.requestRenderAll();
}

export function resetZoom() {
  if (!App.canvas) return;

  App.zoom = 1;
  App.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  App.canvas.requestRenderAll();
}

export function fitToScreen() {
  resetZoom();
}

// ================= INTERNAL =================

function bindWheelZoom() {
  App.canvas.on("mouse:wheel", opt => {
    const e = opt.e;
    if (!e.ctrlKey) return;

    e.preventDefault();
    const delta = e.deltaY;
    const factor = delta > 0 ? 0.9 : 1.1;
    applyZoom(App.zoom * factor);
  });
}

// ================= SAFE STUBS =================
// (για να ΜΗΝ σπάνε tools.js / ui.js)

export function refreshThumbnails() {}
export function saveCurrentPage() {}
