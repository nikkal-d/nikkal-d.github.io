/* =====================
   TEXT HELPERS
===================== */
export function applyTextColor(color) {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.set("fill", color);
  canvas.requestRenderAll();
}

export function applyTextOpacity(val) {
  const obj = canvas.getActiveObject();
  if (!obj) return;
  obj.set("opacity", val);
  canvas.requestRenderAll();
}

export function applyTextStroke(enabled) {
  const obj = canvas.getActiveObject();
  if (!obj) return;

  if (enabled) {
    obj.set({
      stroke: "#000",
      strokeWidth: 2
    });
  } else {
    obj.set({
      stroke: null,
      strokeWidth: 0
    });
  }
  canvas.requestRenderAll();
}

/* =====================
   ANIMATIONS
===================== */
export function animateFade() {
  const obj = canvas.getActiveObject();
  if (!obj) return;

  obj.set("opacity", 0);
  canvas.requestRenderAll();

  obj.animate("opacity", 1, {
    duration: 600,
    easing: fabric.util.ease.easeOutCubic,
    onChange: canvas.requestRenderAll.bind(canvas)
  });
}

export function animateSlide(dir = "left") {
  const obj = canvas.getActiveObject();
  if (!obj) return;

  const start = dir === "left" ? obj.left - 120 : obj.top - 120;
  const prop = dir === "left" ? "left" : "top";

  obj.set(prop, start);
  canvas.requestRenderAll();

  obj.animate(prop, start + 120, {
    duration: 600,
    easing: fabric.util.ease.easeOutCubic,
    onChange: canvas.requestRenderAll.bind(canvas)
  });
}

export function animateScale() {
  const obj = canvas.getActiveObject();
  if (!obj) return;

  obj.set({ scaleX: 0.3, scaleY: 0.3 });
  canvas.requestRenderAll();

  obj.animate("scaleX", 1, {
    duration: 500,
    onChange: canvas.requestRenderAll.bind(canvas)
  });
  obj.animate("scaleY", 1, {
    duration: 500,
    onChange: canvas.requestRenderAll.bind(canvas)
  });
}
