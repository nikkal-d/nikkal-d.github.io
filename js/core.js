export let canvas = null;

window.addEventListener("DOMContentLoaded", () => {
  canvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  canvas.setBackgroundColor("#ffffff", canvas.renderAll.bind(canvas));
  fitToScreen();

  console.log("✅ Canvas initialized");
});

/* ======================
   VIEW HELPERS
====================== */

export function fitToScreen() {
  if (!canvas) return;

  const host = document.getElementById("canvasHost");
  const pad = 40;

  const aw = host.clientWidth - pad;
  const ah = host.clientHeight - pad;

  const scale = Math.min(
    aw / canvas.getWidth(),
    ah / canvas.getHeight()
  );

  canvas.setViewportTransform([1,0,0,1,0,0]);
  canvas.setZoom(scale);

  const vt = canvas.viewportTransform;
  vt[4] = (aw - canvas.getWidth() * scale) / 2;
  vt[5] = (ah - canvas.getHeight() * scale) / 2;

  canvas.setViewportTransform(vt);
  canvas.requestRenderAll();
}

function centerPoint() {
  return {
    x: canvas.getWidth() / 2,
    y: canvas.getHeight() / 2
  };
}

/* ======================
   TEXT
====================== */

export function addText() {
  const { x, y } = centerPoint();

  const t = new fabric.Textbox("Text", {
    left: x,
    top: y,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",
    fontFamily: "Arial"
  });

  canvas.add(t);
  canvas.setActiveObject(t);
  fitToScreen();
}

/* ======================
   IMAGE
====================== */

export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      const { x, y } = centerPoint();

      img.scaleToWidth(canvas.getWidth() * 0.4);
      img.set({
        left: x,
        top: y,
        originX: "center",
        originY: "center"
      });

      canvas.add(img);
      canvas.setActiveObject(img);
      fitToScreen();
    });
  };
  reader.readAsDataURL(file);
}

/* ======================
   ZOOM
====================== */

export function zoom(delta) {
  let z = canvas.getZoom();
  z = Math.max(0.2, Math.min(4, z + delta));

  canvas.zoomToPoint(
    new fabric.Point(canvas.getWidth()/2, canvas.getHeight()/2),
    z
  );
  canvas.requestRenderAll();
}
