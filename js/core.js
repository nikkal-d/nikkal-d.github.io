// js/core.js
export let canvas = null;

window.addEventListener("DOMContentLoaded", () => {
  if (typeof fabric === "undefined") {
    console.error("❌ Fabric not loaded");
    return;
  }

  canvas = new fabric.Canvas("canvas", {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
    selection: true
  });

  canvas.setWidth(1240);
  canvas.setHeight(1754);
  canvas.renderAll();

  console.log("✅ Canvas initialized");
});

export function addText() {
  if (!canvas) {
    console.warn("❌ Canvas not ready");
    return;
  }

  const text = new fabric.Textbox("Text", {
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    originX: "center",
    originY: "center",
    fontSize: 48,
    fill: "#111",
    fontFamily: "Arial"
  });

  canvas.add(text);
  canvas.setActiveObject(text);
  canvas.requestRenderAll();

  console.log("✅ Text added");
}
