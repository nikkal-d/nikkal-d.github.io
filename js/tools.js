// js/tools.js
// ============================================================
// Tools: PDF import (images + editable text), layers, bg remove
// ============================================================

import { fabricCanvas, addPage, saveCurrentPage } from "./core.js";

/* ============================================================
   LAYERS ORDER
   ============================================================ */

export function bringForward() {
  const obj = fabricCanvas?.getActiveObject();
  if (obj) {
    fabricCanvas.bringForward(obj);
    fabricCanvas.requestRenderAll();
    saveCurrentPage();
  }
}

export function sendBackward() {
  const obj = fabricCanvas?.getActiveObject();
  if (obj) {
    fabricCanvas.sendBackwards(obj);
    fabricCanvas.requestRenderAll();
    saveCurrentPage();
  }
}

/* ============================================================
   BACKGROUND REMOVAL (HOOK – API REQUIRED)
   ============================================================ */

export async function removeBackground() {
  const obj = fabricCanvas?.getActiveObject();
  if (!obj || obj.type !== "image") {
    alert("Επίλεξε πρώτα μία εικόνα.");
    return;
  }

  alert(
    "Background removal:\n\n" +
    "Αυτό το feature χρειάζεται AI API (π.χ. remove.bg / Clipdrop).\n" +
    "Θα το ενεργοποιήσουμε στο επόμενο στάδιο."
  );
}

/* ============================================================
   PDF IMPORT WITH EDITABLE TEXT
   ============================================================ */

export async function importPDF(file) {
  if (!fabricCanvas) return;

  const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(file));
  const pdf = await loadingTask.promise;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    // Δημιουργούμε νέα σελίδα στο photobook
    if (pageNum > 1) addPage();

    await renderPdfPageToCanvas(page);
    await importPdfText(page);

    saveCurrentPage();
  }
}

/* ------------------------------------------------------------
   Render PDF page as IMAGE
   ------------------------------------------------------------ */

async function renderPdfPageToCanvas(page) {
  const viewport = page.getViewport({ scale: 2 });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport }).promise;

  const imgUrl = canvas.toDataURL("image/png");

  return new Promise(resolve => {
    fabric.Image.fromURL(imgUrl, img => {
      // Fit image into fabric canvas
      const scale = Math.min(
        fabricCanvas.width / img.width,
        fabricCanvas.height / img.height
      );

      img.scale(scale);
      img.left = 0;
      img.top = 0;
      img.selectable = false; // background

      fabricCanvas.clear();
      fabricCanvas.add(img);
      fabricCanvas.sendToBack(img);
      fabricCanvas.requestRenderAll();

      resolve();
    });
  });
}

/* ------------------------------------------------------------
   Import PDF TEXT as EDITABLE fabric.IText
   ------------------------------------------------------------ */

async function importPdfText(page) {
  const textContent = await page.getTextContent();
  const viewport = page.getViewport({ scale: 2 });

  textContent.items.forEach(item => {
    const tx = pdfjsLib.Util.transform(
      viewport.transform,
      item.transform
    );

    const x = tx[4];
    const y = tx[5];

    const fontSize = Math.max(item.height, 10);

    const text = new fabric.IText(item.str, {
      left: x,
      top: y - fontSize,
      fontSize: fontSize,
      fill: "#000",
      editable: true,
      selectable: true,
      fontFamily: "Arial",
      originX: "left",
      originY: "top"
    });

    fabricCanvas.add(text);
  });

  fabricCanvas.requestRenderAll();
}
