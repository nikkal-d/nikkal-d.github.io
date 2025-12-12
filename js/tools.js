// js/tools.js
// ============================================================
// Tools: PDF import (image + editable text), layers
// ============================================================

import { fabricCanvas, addPage, saveCurrentPage } from "./core.js";

/* ============================================================
   LAYER ORDER
   ============================================================ */

export function bringForward() {
  const obj = fabricCanvas?.getActiveObject();
  if (obj) fabricCanvas.bringForward(obj);
}

export function sendBackward() {
  const obj = fabricCanvas?.getActiveObject();
  if (obj) fabricCanvas.sendBackwards(obj);
}

/* ============================================================
   PDF IMPORT (IMAGE + EDITABLE TEXT)
   ============================================================ */

export async function importPDF(file) {
  const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;

  for (let p = 1; p <= pdf.numPages; p++) {
    if (p > 1) addPage();

    const page = await pdf.getPage(p);
    await renderPdfImage(page);
    await renderPdfText(page);

    saveCurrentPage();
  }
}

async function renderPdfImage(page) {
  const viewport = page.getViewport({ scale: 2 });

  const tmp = document.createElement("canvas");
  const ctx = tmp.getContext("2d");
  tmp.width = viewport.width;
  tmp.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport }).promise;

  return new Promise(res => {
    fabric.Image.fromURL(tmp.toDataURL(), img => {
      fabricCanvas.clear();

      const scale = Math.min(
        fabricCanvas.width / img.width,
        fabricCanvas.height / img.height
      );

      img.set({
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
        scaleX: scale,
        scaleY: scale
      });

      fabricCanvas.add(img);
      fabricCanvas.sendToBack(img);
      fabricCanvas.requestRenderAll();
      res();
    });
  });
}

async function renderPdfText(page) {
  const textContent = await page.getTextContent();
  const viewport = page.getViewport({ scale: 2 });

  textContent.items.forEach(item => {
    if (!item.str.trim()) return;

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
      // ⛔ ΔΕΝ υπάρχει textBaseline εδώ
    });

    fabricCanvas.add(txt);
  });

  fabricCanvas.requestRenderAll();
}
