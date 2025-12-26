// core.js
console.log("🟢 core.js loaded");

export let canvas = null;

export function initCanvas() {
  if (!window.fabric) {
    console.error("❌ Fabric not loaded");
    return;
  }

  canvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  // ΣΤΑΘΕΡΟ ΜΕΓΕΘΟΣ ΣΕΛΙΔΑΣ
  canvas.setWidth(1240);
  canvas.setHeight(1754);
  canvas.setBackgroundColor("#ffffff", canvas.renderAll.bind(canvas));

  fitCanvasToScreen();

  console.log("✅ Canvas initialized");
}

export function fitCanvasToScreen() {
  const host = document.getElementById("canvasHost");
  if (!host || !canvas) return;

  const scale = Math.min(
    host.clientWidth / canvas.getWidth(),
    host.clientHeight / canvas.getHeight()
  );

  canvas.setZoom(scale);
  canvas.viewportTransform[4] = (host.clientWidth - canvas.getWidth() * scale) / 2;
  canvas.viewportTransform[5] = (host.clientHeight - canvas.getHeight() * scale) / 2;
  canvas.requestRenderAll();
}

export function addText() {
  if (!canvas) return;

  const center = canvas.getCenter();

  const text = new fabric.Textbox("Text", {
    left: center.left,
    top: center.top,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111"
  });

  canvas.add(text);
  canvas.setActiveObject(text);
  canvas.requestRenderAll();

  console.log("🟢 Text added");
}

export function addImageFromFile(file) {
  if (!canvas) return;

  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(canvas.getWidth() * 0.5);
      img.set({
        left: canvas.getCenter().left,
        top: canvas.getCenter().top,
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
