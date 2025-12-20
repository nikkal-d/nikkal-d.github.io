export let canvas = null;

window.addEventListener("DOMContentLoaded", () => {
  canvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  canvas.setBackgroundColor("#ffffff", canvas.renderAll.bind(canvas));

  console.log("✅ Canvas initialized");
});

/* 🔥 ΑΥΤΗ ΕΙΝΑΙ Η ΚΡΙΣΙΜΗ ΣΥΝΑΡΤΗΣΗ */
export function centerInView(obj) {
  const vpt = canvas.viewportTransform;
  const zoom = canvas.getZoom();

  const cx = (-vpt[4] + canvas.getWidth() / 2) / zoom;
  const cy = (-vpt[5] + canvas.getHeight() / 2) / zoom;

  obj.set({
    left: cx,
    top: cy,
    originX: "center",
    originY: "center"
  });
}

/* TEXT */
export function addText() {
  const t = new fabric.Textbox("Text", {
    fontSize: 48,
    fill: "#111",
    fontFamily: "Arial"
  });

  centerInView(t);
  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.requestRenderAll();
}

/* IMAGE */
export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(canvas.getWidth() * 0.4);
      centerInView(img);
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    });
  };
  reader.readAsDataURL(file);
}

/* ZOOM */
export function zoom(delta) {
  let z = canvas.getZoom();
  z += delta;
  z = Math.max(0.2, Math.min(4, z));
  canvas.zoomToPoint(
    new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2),
    z
  );
}
