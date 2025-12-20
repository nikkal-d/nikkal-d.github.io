// js/core.js
export let canvas;
let zoom = 1;

window.addEventListener("DOMContentLoaded", () => {
  canvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  canvas.setWidth(1240);
  canvas.setHeight(1754);
  canvas.setBackgroundColor("#ffffff", canvas.renderAll.bind(canvas));

  fitToScreen();
  console.log("✅ Canvas initialized");
});

/* =========================
   HELPERS
========================= */
function getViewportCenter() {
  const vpt = canvas.viewportTransform;
  const cx = (canvas.width / 2 - vpt[4]) / vpt[0];
  const cy = (canvas.height / 2 - vpt[5]) / vpt[3];
  return { x: cx, y: cy };
}

/* =========================
   ADD TEXT
========================= */
export function addText() {
  const { x, y } = getViewportCenter();

  const t = new fabric.Textbox("Text", {
    left: x,
    top: y,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111"
  });

  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.requestRenderAll();
}

/* =========================
   ADD IMAGE
========================= */
export function addImageFromFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      const { x, y } = getViewportCenter();

      img.scaleToWidth(canvas.getWidth() * 0.4);
      img.set({
        left: x,
        top: y,
        originX: "center",
        originY: "center"
      });

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    });
  };
  reader.readAsDataURL(file);
}

/* =========================
   ZOOM
========================= */
export function zoomIn() {
  applyZoom(zoom + 0.1);
}
export function zoomOut() {
  applyZoom(zoom - 0.1);
}
export function resetZoom() {
  zoom = 1;
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  fitToScreen();
}

function applyZoom(val) {
  zoom = Math.min(3, Math.max(0.2, val));
  const center = new fabric.Point(canvas.width / 2, canvas.height / 2);
  canvas.zoomToPoint(center, zoom);
}

/* =========================
   FIT TO SCREEN
========================= */
function fitToScreen() {
  const host = document.getElementById("canvasHost");
  if (!host) return;

  const scale = Math.min(
    host.clientWidth / canvas.width,
    host.clientHeight / canvas.height
  );

  zoom = scale;
  canvas.setViewportTransform([scale, 0, 0, scale, 0, 0]);
  canvas.requestRenderAll();
}
