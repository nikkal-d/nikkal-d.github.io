export let canvas = null;

window.addEventListener("DOMContentLoaded", () => {
  canvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  // ⛔ ΣΗΜΑΝΤΙΚΟ: reset viewport
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.setZoom(1);

  canvas.setBackgroundColor("#ffffff", canvas.renderAll.bind(canvas));

  console.log("✅ Canvas initialized");
});

/* =========================
   ΒΟΗΘΗΤΙΚΑ
========================= */

function resetView() {
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.setZoom(1);
}

function centerCoords() {
  return {
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2
  };
}

/* =========================
   TEXT
========================= */

export function addText() {
  if (!canvas) return;

  resetView();

  const { left, top } = centerCoords();

  const t = new fabric.Textbox("Text", {
    left,
    top,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",
    fontFamily: "Arial",
    textBaseline: "top" // 🔇 μειώνει warnings
  });

  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.requestRenderAll();
}

/* =========================
   IMAGE
========================= */

export function addImageFromFile(file) {
  if (!canvas || !file) return;

  resetView();

  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      const { left, top } = centerCoords();

      img.scaleToWidth(canvas.getWidth() * 0.4);
      img.set({
        left,
        top,
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
   ZOOM (ΑΠΛΟ, ΣΤΑΘΕΡΟ)
========================= */

export function zoom(delta) {
  let z = canvas.getZoom();
  z = Math.max(0.2, Math.min(4, z + delta));

  canvas.zoomToPoint(
    new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2),
    z
  );

  canvas.requestRenderAll();
}
