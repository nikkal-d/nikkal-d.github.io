// js/tools.js
// ============================================================
// Tools: import image/pdf, text, shapes, stickers, effects, layers
// ============================================================

import {
  fabricCanvas,
  saveCurrentPage,
  refreshThumbnails,
  fitToScreen
} from "./core.js";

export function importImage(file) {
  if (!fabricCanvas || !file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    fabric.Image.fromURL(e.target.result, (img) => {
      const maxW = fabricCanvas.getWidth() * 0.7;
      const maxH = fabricCanvas.getHeight() * 0.7;
      const s = Math.min(maxW / img.width, maxH / img.height, 1);

      img.set({
        originX: "center",
        originY: "center",
        left: fabricCanvas.getWidth() / 2,
        top: fabricCanvas.getHeight() / 2,
        scaleX: s,
        scaleY: s
      });

      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
      saveCurrentPage();
      refreshThumbnails();
    });
  };
  reader.readAsDataURL(file);
}

export async function importPDF(file) {
  if (!fabricCanvas || !file) return;

  const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;

  // import only current page canvas for now (user can add pages and re-import)
  // but we will place page 1 on current canvas; advanced multi-page stays in core pages workflow
  const page = await pdf.getPage(1);

  await renderPdfImage(page);
  await renderPdfText(page);

  saveCurrentPage();
  refreshThumbnails();
}

async function renderPdfImage(page) {
  const viewport = page.getViewport({ scale: 2 });

  const tmp = document.createElement("canvas");
  const ctx = tmp.getContext("2d");
  tmp.width = viewport.width;
  tmp.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport }).promise;

  return new Promise((resolve) => {
    fabric.Image.fromURL(tmp.toDataURL(), (img) => {
      const scale = Math.min(
        fabricCanvas.getWidth() / img.width,
        fabricCanvas.getHeight() / img.height
      );

      img.set({
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
        scaleX: scale,
        scaleY: scale
      });

      // set as background by sending to back
      fabricCanvas.add(img);
      fabricCanvas.sendToBack(img);
      fabricCanvas.requestRenderAll();
      resolve();
    });
  });
}

async function renderPdfText(page) {
  const textContent = await page.getTextContent();
  const viewport = page.getViewport({ scale: 2 });

  textContent.items.forEach(item => {
    if (!item.str || !item.str.trim()) return;

    const t = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const x = t[4];
    const y = t[5];
    const size = Math.max(item.height, 10);

    const txt = new fabric.IText(item.str, {
      left: x,
      top: y - size,
      fontSize: size,
      fill: "#000",
      fontFamily: "Arial",
      originX: "left",
      originY: "top",
      selectable: true,
      editable: true
    });

    fabricCanvas.add(txt);
  });

  fabricCanvas.requestRenderAll();
}

// -------- Text --------
export function addHeading() {
  addText("Heading", 64);
}
export function addBody() {
  addText("Body text", 36);
}
export function addCustomText(value) {
  addText(value || "Text", 40);
}
function addText(value, size) {
  const t = new fabric.IText(value, {
    left: fabricCanvas.getWidth() * 0.12,
    top: fabricCanvas.getHeight() * 0.12,
    fontSize: size,
    fill: "#111",
    fontFamily: "Arial",
  });
  fabricCanvas.add(t);
  fabricCanvas.setActiveObject(t);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  refreshThumbnails();
}

// -------- Shapes --------
export function addRect() {
  const r = new fabric.Rect({
    left: 140, top: 140, width: 420, height: 260,
    fill: "rgba(79,124,255,0.20)",
    stroke: "rgba(79,124,255,0.95)",
    strokeWidth: 4,
    rx: 18, ry: 18
  });
  fabricCanvas.add(r);
  fabricCanvas.setActiveObject(r);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  refreshThumbnails();
}

export function addCircle() {
  const c = new fabric.Circle({
    left: 220, top: 220, radius: 160,
    fill: "rgba(79,124,255,0.18)",
    stroke: "rgba(79,124,255,0.95)",
    strokeWidth: 4
  });
  fabricCanvas.add(c);
  fabricCanvas.setActiveObject(c);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  refreshThumbnails();
}

export function addLine() {
  const l = new fabric.Line([80, 80, 520, 80], {
    left: 220, top: 220,
    stroke: "rgba(79,124,255,0.95)",
    strokeWidth: 6
  });
  fabricCanvas.add(l);
  fabricCanvas.setActiveObject(l);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  refreshThumbnails();
}

// -------- Effects --------
export function setOpacity(val) {
  const obj = fabricCanvas.getActiveObject();
  if (!obj) return;
  obj.set("opacity", Number(val));
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  refreshThumbnails();
}

export function toggleShadow(isOn) {
  const obj = fabricCanvas.getActiveObject();
  if (!obj) return;

  if (isOn) {
    obj.set("shadow", new fabric.Shadow({
      color: "rgba(0,0,0,0.35)",
      blur: 18,
      offsetX: 10,
      offsetY: 10
    }));
  } else {
    obj.set("shadow", null);
  }
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  refreshThumbnails();
}

export function deleteSelected() {
  const obj = fabricCanvas.getActiveObject();
  if (!obj) return;
  fabricCanvas.remove(obj);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  refreshThumbnails();
}

// -------- Layers order --------
export function bringForward() {
  const obj = fabricCanvas.getActiveObject();
  if (!obj) return;
  fabricCanvas.bringForward(obj);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  refreshThumbnails();
}
export function sendBackward() {
  const obj = fabricCanvas.getActiveObject();
  if (!obj) return;
  fabricCanvas.sendBackwards(obj);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  refreshThumbnails();
}
export function bringToFront() {
  const obj = fabricCanvas.getActiveObject();
  if (!obj) return;
  fabricCanvas.bringToFront(obj);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  refreshThumbnails();
}
export function sendToBack() {
  const obj = fabricCanvas.getActiveObject();
  if (!obj) return;
  fabricCanvas.sendToBack(obj);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  refreshThumbnails();
}

// -------- Stickers --------
export async function loadStickers() {
  const res = await fetch("./assets/stickers/list.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load stickers list.json");
  const data = await res.json();
  return data?.stickers || [];
}

export function addSticker(sticker) {
  if (!sticker) return;

  if (sticker.type === "emoji") {
    const t = new fabric.IText(sticker.value, {
      left: fabricCanvas.getWidth() / 2,
      top: fabricCanvas.getHeight() / 2,
      originX: "center",
      originY: "center",
      fontSize: 120
    });
    fabricCanvas.add(t);
    fabricCanvas.setActiveObject(t);
    fabricCanvas.requestRenderAll();
    saveCurrentPage();
    refreshThumbnails();
    return;
  }

  if (sticker.type === "image" && sticker.src) {
    fabric.Image.fromURL(sticker.src, img => {
      const maxW = fabricCanvas.getWidth() * 0.35;
      const s = Math.min(maxW / img.width, 1);

      img.set({
        originX: "center",
        originY: "center",
        left: fabricCanvas.getWidth() / 2,
        top: fabricCanvas.getHeight() / 2,
        scaleX: s,
        scaleY: s
      });

      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
      saveCurrentPage();
      refreshThumbnails();
    });
  }
}

// -------- AI hook --------
export function removeBackground() {
  const obj = fabricCanvas.getActiveObject();
  if (!obj || obj.type !== "image") return alert("Επίλεξε πρώτα μία εικόνα.");
  alert("Background removal (AI) θα μπει στο επόμενο βήμα (API).");
}

// convenience
export function fitCanvas() {
  fitToScreen();
}
