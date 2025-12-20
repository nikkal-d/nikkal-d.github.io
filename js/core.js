export let canvas;
let zoom = 1;
let pages = [{}];
let currentPage = 0;

window.addEventListener("DOMContentLoaded", () => {
  canvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true
  });

  // A4 PORTRAIT
  canvas.setWidth(1240);
  canvas.setHeight(1754);
  canvas.setBackgroundColor("#ffffff", canvas.renderAll.bind(canvas));

  fitToScreen();

  console.log("✅ Canvas initialized");
});

export function addText() {
  const t = new fabric.Textbox("Text", {
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111"
  });
  canvas.add(t);
  canvas.setActiveObject(t);
}

export function addImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.scaleToWidth(canvas.getWidth() * 0.5);
      img.set({
        left: canvas.getWidth() / 2,
        top: canvas.getHeight() / 2,
        originX: "center",
        originY: "center"
      });
      canvas.add(img);
      canvas.setActiveObject(img);
    });
  };
  reader.readAsDataURL(file);
}

export function zoomIn() {
  setZoom(zoom + 0.1);
}

export function zoomOut() {
  setZoom(zoom - 0.1);
}

export function resetZoom() {
  zoom = 1;
  canvas.setViewportTransform([1,0,0,1,0,0]);
  fitToScreen();
}

function setZoom(val) {
  zoom = Math.min(3, Math.max(0.2, val));
  const center = new fabric.Point(
    canvas.getWidth() / 2,
    canvas.getHeight() / 2
  );
  canvas.zoomToPoint(center, zoom);
}

function fitToScreen() {
  const host = document.getElementById("canvasHost");
  const scale = Math.min(
    host.clientWidth / canvas.getWidth(),
    host.clientHeight / canvas.getHeight()
  );
  zoom = scale;
  canvas.zoomToPoint(
    new fabric.Point(canvas.getWidth()/2, canvas.getHeight()/2),
    zoom
  );
}
