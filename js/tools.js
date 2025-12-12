// js/tools.js
// ============================================================
// Tools: images, pdf, text, shapes, colors, filters, layers
// ============================================================

import { fabricCanvas, saveCurrentPage, refreshThumbnails } from "./core.js";

/* --------------------------------------------------
  HELPERS
-------------------------------------------------- */
function commit() {
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  refreshThumbnails();
}

function center(obj) {
  obj.center();
  obj.setCoords();
}

/* --------------------------------------------------
  IMAGE IMPORT
-------------------------------------------------- */
export function importImage(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    fabric.Image.fromURL(reader.result, img => {
      img.set({
        left: fabricCanvas.getWidth() / 2,
        top: fabricCanvas.getHeight() / 2,
        originX: "center",
        originY: "center",
        selectable: true
      });
      img.scaleToWidth(fabricCanvas.getWidth() * 0.5);
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      commit();
    }, { crossOrigin: "anonymous" });
  };
  reader.readAsDataURL(file);
}

/* --------------------------------------------------
  PDF IMPORT (pages -> images)
-------------------------------------------------- */
export async function importPDF(file) {
  if (!file) return alert("PDF not supported yet without pdf.js");

  // Placeholder: treat pdf as image for now
  alert("PDF import είναι σε βάση – text/OCR έρχεται σε επόμενο βήμα.");
}

/* --------------------------------------------------
  TEXT
-------------------------------------------------- */
export function addHeading() {
  addText("Heading", 64, "bold");
}

export function addBody() {
  addText("Body text", 32, "normal");
}

export function addCustomText(text = "Text") {
  addText(text, 28, "normal");
}

function addText(text, size, weight) {
  const t = new fabric.IText(text, {
    fontFamily: "Arial",
    fontSize: size,
    fontWeight: weight,
    fill: "#000000",
    left: fabricCanvas.getWidth() / 2,
    top: fabricCanvas.getHeight() / 2,
    originX: "center",
    originY: "center"
  });
  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  commit();
}

/* --------------------------------------------------
  SHAPES
-------------------------------------------------- */
export function addRect() {
  const r = new fabric.Rect({
    width: 300,
    height: 200,
    rx: 20,
    ry: 20,
    fill: "#4f46e5",
    left: fabricCanvas.getWidth() / 2,
    top: fabricCanvas.getHeight() / 2,
    originX: "center",
    originY: "center"
  });
  fabricCanvas.add(r);
  fabricCanvas.setActiveObject(r);
  commit();
}

export function addCircle() {
  const c = new fabric.Circle({
    radius: 120,
    fill: "#22c55e",
    left: fabricCanvas.getWidth() / 2,
    top: fabricCanvas.getHeight() / 2,
    originX: "center",
    originY: "center"
  });
  fabricCanvas.add(c);
  fabricCanvas.setActiveObject(c);
  commit();
}

export function addLine() {
  const l = new fabric.Line([0, 0, 300, 0], {
    stroke: "#000000",
    strokeWidth: 6,
    left: fabricCanvas.getWidth() / 2 - 150,
    top: fabricCanvas.getHeight() / 2
  });
  fabricCanvas.add(l);
  fabricCanvas.setActiveObject(l);
  commit();
}

/* --------------------------------------------------
  COLORS / OPACITY / SHADOW
-------------------------------------------------- */
export function setOpacity(val) {
  const obj = fabricCanvas.getActiveObject();
  if (!obj) return;
  obj.set("opacity", Number(val));
  commit();
}

export function toggleShadow(enabled) {
  const obj = fabricCanvas.getActiveObject();
  if (!obj) return;
  if (enabled) {
    obj.set("shadow", new fabric.Shadow({
      color: "rgba(0,0,0,0.35)",
      blur: 20,
      offsetX: 10,
      offsetY: 10
    }));
  } else {
    obj.set("shadow", null);
  }
  commit();
}

/* --------------------------------------------------
  FILTERS (IMAGES ONLY)
-------------------------------------------------- */
export function applyFilter(type, value = 0.5) {
  const obj = fabricCanvas.getActiveObject();
  if (!obj || obj.type !== "image") return;

  let filter = null;

  if (type === "brightness") {
    filter = new fabric.Image.filters.Brightness({ brightness: value });
  }
  if (type === "contrast") {
    filter = new fabric.Image.filters.Contrast({ contrast: value });
  }
  if (type === "blur") {
    filter = new fabric.Image.filters.Blur({ blur: value });
  }

  if (!filter) return;

  obj.filters = [filter];
  obj.applyFilters();
  commit();
}

/* --------------------------------------------------
  LAYERS / ORDER
-------------------------------------------------- */
export function bringForward() {
  const o = fabricCanvas.getActiveObject();
  if (o) {
    fabricCanvas.bringForward(o);
    commit();
  }
}

export function sendBackward() {
  const o = fabricCanvas.getActiveObject();
  if (o) {
    fabricCanvas.sendBackwards(o);
    commit();
  }
}

export function bringToFront() {
  const o = fabricCanvas.getActiveObject();
  if (o) {
    fabricCanvas.bringToFront(o);
    commit();
  }
}

export function sendToBack() {
  const o = fabricCanvas.getActiveObject();
  if (o) {
    fabricCanvas.sendToBack(o);
    commit();
  }
}

/* --------------------------------------------------
  DELETE
-------------------------------------------------- */
export function deleteSelected() {
  const o = fabricCanvas.getActiveObject();
  if (!o) return;
  fabricCanvas.remove(o);
  commit();
}

/* --------------------------------------------------
  FUTURE HOOKS (AI)
-------------------------------------------------- */
export async function removeBackground() {
  alert("AI background removal θα ενεργοποιηθεί σε επόμενο στάδιο.");
}
