// js/core.js
// =====================================================
// CORE CANVAS API – STABLE & COMPATIBLE
// Works with ui.js / tools.js imports
// Fixes Fabric baseline issues safely (no redefine crash)
// =====================================================

export let fabricCanvas = null;

let zoom = 1;

// -----------------------------------------------------
// SAFE FABRIC PATCH (no "Cannot redefine property")
// -----------------------------------------------------
(function safeFixFabricBaseline() {
  if (typeof window === "undefined") return;
  const f = window.fabric;
  if (!f) return;

  const safePatch = (proto) => {
    if (!proto) return;
    // mark guard to avoid running twice
    if (proto.__pbsBaselineFixed) return;

    try {
      const desc = Object.getOwnPropertyDescriptor(proto, "textBaseline");
      // If non-configurable, we cannot redefine. Just mark and exit.
      if (desc && desc.configurable === false) {
        proto.__pbsBaselineFixed = true;
        return;
      }

      // Define a safe default value (Fabric may still override internally)
      Object.defineProperty(proto, "textBaseline", {
        value: "top",
        writable: true,
        configurable: true,
        enumerable: true
      });

      proto.__pbsBaselineFixed = true;
    } catch (e) {
      // If something is locked, ignore (do NOT crash the app)
      try { proto.__pbsBaselineFixed = true; } catch {}
    }
  };

  safePatch(f.Textbox?.prototype);
  safePatch(f.IText?.prototype);
})();

// -----------------------------------------------------
// INIT
// -----------------------------------------------------
export function initCanvas(id = "canvas") {
  if (fabricCanvas) return fabricCanvas;

  if (typeof fabric === "undefined") {
    console.error("Fabric not loaded. Make sure fabric.min.js loads BEFORE core.js");
    return null;
  }

  fabricCanvas = new fabric.Canvas(id, {
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
    selection: true
  });

  // Ensure zoom starts clean
  zoom = 1;
  fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  fabricCanvas.requestRenderAll();

  return fabricCanvas;
}

// -----------------------------------------------------
// HELPERS
// -----------------------------------------------------
function ensureCanvas() {
  if (!fabricCanvas) {
    console.warn("Canvas not initialized. Call initCanvas() first.");
    return false;
  }
  return true;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// -----------------------------------------------------
// TEXT
// -----------------------------------------------------
export function addText(text = "Text") {
  if (!ensureCanvas()) return;

  const t = new fabric.Textbox(String(text), {
    left: 160,
    top: 160,
    fontSize: 40,
    fill: "#111",
    fontFamily: "Arial",
    // prevent baseline warning
    textBaseline: "top"
  });

  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  fabricCanvas.requestRenderAll();
}

// -----------------------------------------------------
// IMAGE
// -----------------------------------------------------
export function addImageFromFile(file) {
  if (!ensureCanvas() || !file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    fabric.Image.fromURL(e.target.result, (img) => {
      // reasonable default size
      const targetW = Math.min(420, fabricCanvas.getWidth() * 0.45);
      img.scaleToWidth(targetW);

      img.set({
        left: 160,
        top: 160
      });

      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
    }, { crossOrigin: "anonymous" });
  };
  reader.readAsDataURL(file);
}

// -----------------------------------------------------
// EMOJI
// -----------------------------------------------------
export function addEmoji(char = "😀") {
  if (!ensureCanvas()) return;

  const e = new fabric.Text(String(char), {
    left: 200,
    top: 200,
    fontSize: 64,
    // prevent baseline warning
    textBaseline: "top"
  });

  fabricCanvas.add(e);
  fabricCanvas.setActiveObject(e);
  fabricCanvas.requestRenderAll();
}

// -----------------------------------------------------
// ZOOM (API expected by ui.js)
// -----------------------------------------------------
export function getZoom() {
  return zoom;
}

// ui.js expects applyZoom(value)
export function applyZoom(value) {
  if (!ensureCanvas()) return;

  const next = clamp(Number(value) || 1, 0.2, 4);
  zoom = next;

  const center = fabricCanvas.getCenter();
  fabricCanvas.zoomToPoint(
    new fabric.Point(center.left, center.top),
    zoom
  );
  fabricCanvas.requestRenderAll();
}

// Some code uses setZoom; keep alias
export function setZoom(value) {
  applyZoom(value);
}

export function resetZoom() {
  if (!ensureCanvas()) return;

  zoom = 1;
  fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  fabricCanvas.requestRenderAll();
}

export function fitToScreen() {
  if (!ensureCanvas()) return;

  const host = document.getElementById("canvasHost");
  if (!host) return;

  const pad = 20;
  const cw = fabricCanvas.getWidth();
  const ch = fabricCanvas.getHeight();

  const scale = Math.min(
    (host.clientWidth - pad) / cw,
    (host.clientHeight - pad) / ch
  );

  applyZoom(scale);
}

// -----------------------------------------------------
// REQUIRED EXPORTS expected by tools.js (stubs for now)
// -----------------------------------------------------
export function refreshThumbnails() {
  // Αν το tools.js σου φτιάχνει thumbnails αλλού, αυτό είναι OK.
  // Το κρατάμε για να ΜΗΝ σπάνε imports.
}

export function saveCurrentPage() {
  // Το κρατάμε για να ΜΗΝ σπάνε imports.
  // Αν έχεις pages σύστημα αλλού, θα το δέσουμε μετά σωστά.
  if (!fabricCanvas) return;
  try { fabricCanvas.requestRenderAll(); } catch {}
}
