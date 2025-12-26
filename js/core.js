// core.js
let canvas = null;
let zoom = 1;

export function initCanvas() {
  const el = document.getElementById("canvas");
  canvas = new fabric.Canvas(el, {
    backgroundColor: "#fff",
    preserveObjectStacking: true
  });

  canvas.setWidth(900);
  canvas.setHeight(1200);
  centerCanvas();

  console.log("✅ Canvas initialized");
}

export function getCanvas() {
  return canvas;
}

// ---------------- TEXT ----------------
export function addText() {
  if (!canvas) return;

  const center = canvas.getCenter();
  const t = new fabric.Textbox("Text", {
    left: center.left,
    top: center.top,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111"
  });

  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.requestRenderAll();
}

// ---------------- IMAGE ----------------
export function addImageFromFile(file) {
  if (!canvas || !file) return;

  const reader = new FileReader();
  reader.onload = e => {
    fabric.Image.fromURL(e.target.result, img => {
      const center = canvas.getCenter();
      img.set({
        left: center.left,
        top: center.top,
        originX: "center",
        originY: "center"
      });
      img.scaleToWidth(400);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    });
  };
  reader.readAsDataURL(file);
}

// ---------------- ZOOM ----------------
export function setZoom(value) {
  if (!canvas) return;

  zoom = Math.min(3, Math.max(0.2, value));
  canvas.setZoom(zoom);
  centerCanvas();
}

export function getZoom() {
  return zoom;
}

function centerCanvas() {
  const wrap = document.querySelector(".canvas-wrapper");
  if (!wrap || !canvas) return;

  const w = wrap.clientWidth;
  const h = wrap.clientHeight;

  const vt = canvas.viewportTransform;
  vt[4] = w / 2 - (canvas.width * zoom) / 2;
  vt[5] = h / 2 - (canvas.height * zoom) / 2;
  canvas.setViewportTransform(vt);
}
