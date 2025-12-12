// js/tools.js
// ============================================================
// Photobook Studio — Tools
// Image import, PDF import (image + editable text),
// layer ordering, background removal hook
// ============================================================

import { fabricCanvas, addPage, saveCurrentPage } from "./core.js";

/* ============================================================
   LAYERS ORDER
   ============================================================ */

export function bringForward() {
  const obj = fabricCanvas?.getActiveObject();
  if (!obj) return;

  fabricCanvas.bringForward(obj);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}

export function sendBackward() {
  const obj = fabricCanvas?.getActiveObject();
  if (!obj) return;

  fabricCanvas.sendBackwards(obj);
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}

/* ============================================================
   BACKGROUND REMOVAL (HOOK – AI NEXT STAGE)
   ============================================================ */

export function removeBackground() {
  const obj = fabricCanvas?.getActiveObject();

  if (!obj || obj.type !== "image") {
    alert("Επίλεξε πρώτα μία εικόνα.");
    return;
  }

  alert(
    "Background removal:\n\n" +
    "Ο editor είναι έτοιμος.\n" +
    "Στο επόμενο στάδιο θα συνδεθεί AI API (1-click)."
  );
}

/* ============================================================
   IMAGE IMPORT
   ============================================================ */

export function importImage(file) {
  if (!fabricCanvas || !file) return;

  const reader = new FileReader();
  reader.onload = e => {
    fabric.Image.fromURL(e.target.result, img => {
      const maxW = fabricCanvas.width * 0.8;
      const maxH = fabricCanvas.height * 0.8;

      const scale = Math.min(
        maxW / img.width,
        maxH / img.height,
        1
      );

      img.set({
        left: fabricCanvas.width / 2,
        top: fabricCanvas.height / 2,
        originX: "center",
        originY: "center",
        scaleX: scale,
        scaleY: scale,
        selectable: true
      });

      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.requestRenderAll();
      saveCurrentPage();
    });
  };
  reader.readAsDataURL(file);
}

/* ============================================================
   PDF IMPORT (IMAGE + EDITABLE TEXT)
   ============================================================ */

export async function importPDF(file) {
  if (!fabricCanvas || !file) return;

  const pdf = await pdfjsLib.getDocument(
    URL.createObjectURL(file)
  ).promise;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    if (pageNum > 1) addPage();

    const page = await pdf.getPage(pageNum);
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

  return new Promise(resolve => {
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
      resolve();
    });
  });
}

async function renderPdfText(page) {
  const textContent = await page.getTextContent();
  const viewport = page.getViewport({ scale: 2 });

  textContent.items.forEach(item => {
    if (!item.str || !item.str.trim()) return;

    const t = pdfjsLib.Util.transform(
      viewport.transform,
      item.transform
    );

    const x = t[4];
    const y = t[5];
    const size = Math.max(item.height, 10);

    const text = new fabric.IText(item.str, {
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

    fabricCanvas.add(text);
  });

  fabricCanvas.requestRenderAll();
}
