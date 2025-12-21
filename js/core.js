export let canvas;

window.addEventListener("DOMContentLoaded", () => {
  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#fff",
    preserveObjectStacking: true,
  });

  // Default μέγεθος σελίδας
  canvas.setWidth(1240);
  canvas.setHeight(1754);

  fitToScreen();

  console.log("✅ Canvas initialized");
});

export function fitToScreen() {
  const host = document.getElementById("canvasHost");
  if (!host) return;

  const scale = Math.min(
    (host.clientWidth - 40) / canvas.getWidth(),
    (host.clientHeight - 40) / canvas.getHeight()
  );

  canvas.setViewportTransform([scale, 0, 0, scale, 0, 0]);
  canvas.requestRenderAll();
}

export function addText() {
  const center = canvas.getCenter();

  const t = new fabric.Textbox("Text", {
    left: center.left,
    top: center.top,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",
  });

  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.requestRenderAll();

  console.log("✅ Text added");
}
