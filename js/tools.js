// js/tools.js
// ---------------------------------------------
// IMAGE FILTERS SYSTEM
// ---------------------------------------------

// ---------- tools.js fixes (insert at top) ----------
'use strict';

/*
 * Safe declarations & helpers to avoid ReferenceError at runtime.
 * These are conservative fixes — δεν αλλάζουν λογική, απλώς αποτρέπουν crashes.
 */

// ensure fabricCanvas declared
if (typeof fabricCanvas === 'undefined') {
  var fabricCanvas = null; // χρησιμοποιούμε var εδώ για να αποφύγουμε block-scope conflicts
}

// helper to safely get or init the fabric canvas
function getFabricCanvas() {
  if (fabricCanvas) return fabricCanvas;
  var el = document.querySelector('canvas#photobook-canvas') || document.querySelector('canvas');
  if (!el) {
    console.warn('getFabricCanvas: no canvas element found (id=#photobook-canvas assumed).');
    return null;
  }
  if (typeof fabric === 'undefined' || !fabric.Canvas) {
    console.warn('fabric.js not loaded. Install/initialize fabric.js before using editor features.');
    return null;
  }
  fabricCanvas = new fabric.Canvas(el);
  return fabricCanvas;
}

// Safe DOM getter + listener helper (used across files)
function __ensureEl(idOrEl) {
  if (!idOrEl) return null;
  var el = (typeof idOrEl === 'string') ? document.getElementById(idOrEl) : idOrEl;
  if (!el) console.warn('Element not found:', idOrEl);
  return el;
}
function __safeOn(idOrEl, evt, handler) {
  var el = __ensureEl(idOrEl);
  if (!el) return function(){}; // noop; prevents runtime error
  el.addEventListener(evt, handler);
  return function(){ el.removeEventListener(evt, handler); };
}

// pdfjs runtime check
if (typeof pdfjsLib === 'undefined') {
  // don't throw — only warn; PDF features will gracefully degrade
  console.warn('pdfjsLib not found. PDF import/export features will be disabled until pdf.js is loaded.');
}
// ---------- end of tools.js fixes ----------
// ΠΡΟΣΟΧΗ: προτιμώ αυτό
const canvas = getFabricCanvas();
if (canvas) {
  canvas.add(...);
}


export async function loadStickersFromList() {
  const container = document.getElementById("stickerGrid");
  if (!container) return;

  container.innerHTML = "Φόρτωση...";

  try {
    const res = await fetch("./assets/stickers/emojis/list.json");
    const emojis = await res.json();

    container.innerHTML = "";

    emojis.forEach(emoji => {
      const img = document.createElement("img");
      img.className = "sticker-thumb";
      img.src = getTwemojiPngUrl(emoji);
      img.title = emoji;

      img.onclick = () => addStickerToCanvas(img.src);

      container.appendChild(img);
    });
  } catch (err) {
    container.innerHTML = "Σφάλμα φόρτωσης stickers";
    console.error(err);
  }
}

export function addStickerToCanvas(url) {
  if (!fabricCanvas) {
    alert("Ο καμβάς δεν είναι έτοιμος!");
    return;
  }

  fabric.Image.fromURL(url, img => {
    img.set({
      left: fabricCanvas.width / 2 - 80,
      top: fabricCanvas.height / 2 - 80,
      scaleX: 0.7,
      scaleY: 0.7
    });

    fabricCanvas.add(img);
    fabricCanvas.setActiveObject(img);
    fabricCanvas.renderAll();
  }, { crossOrigin: "anonymous" });
}



function emojiToCodePoints(emoji) {
  const codepoints = [];
  for (const char of Array.from(emoji)) {
    codepoints.push(char.codePointAt(0).toString(16));
  }
  return codepoints.join('-');
}

function getTwemojiPngUrl(emoji, size = 72) {
  const cp = emojiToCodePoints(emoji);
  return `https://twemoji.maxcdn.com/v/latest/${size}x${size}/${cp}.png`;
}


import { fabricCanvas } from "./core.js";

// ---------------------------------------------
// APPLY FILTER TO SELECTED IMAGE
// ---------------------------------------------
export function applyFilter(type, value = 0) {
  const obj = fabricCanvas.getActiveObject();
  if (!obj || obj.type !== "image") {
    alert("Επίλεξε πρώτα μια εικόνα.");
    return;
  }

  switch (type) {
    case "brightness":
      obj.filters[0] = new fabric.Image.filters.Brightness({ brightness: value });
      break;

    case "contrast":
      obj.filters[1] = new fabric.Image.filters.Contrast({ contrast: value });
      break;

    case "saturation":
      obj.filters[2] = new fabric.Image.filters.Saturation({ saturation: value });
      break;

    case "blur":
      obj.filters[3] = new fabric.Image.filters.Blur({ blur: value });
      break;

    case "grayscale":
      obj.filters[4] = new fabric.Image.filters.Grayscale();
      break;

   case "vintage":
  obj.filters[5] = new fabric.Image.filters.Sepia();
  break;


    case "remove":
      obj.filters = [];
      break;
  }

  obj.applyFilters();
  fabricCanvas.requestRenderAll();
}

// ---------------------------------------------
// REAL CROP TOOL SYSTEM
// ---------------------------------------------

let cropping = false;
let cropRect = null;
let cropTarget = null;

export function startCrop() {
  const obj = fabricCanvas.getActiveObject();
  if (!obj || obj.type !== "image") {
    alert("Επίλεξε πρώτα μια εικόνα.");
    return;
  }

  cropping = true;
  cropTarget = obj;

  // Disable object movement while cropping
  cropTarget.selectable = false;

  // Create crop rectangle
  cropRect = new fabric.Rect({
    left: obj.left + 40,
    top: obj.top + 40,
    width: obj.width * obj.scaleX - 80,
    height: obj.height * obj.scaleY - 80,
    fill: "rgba(0,0,0,0.2)",
    stroke: "yellow",
    strokeWidth: 2,
    hasControls: true,
    hasRotatingPoint: false,
    lockRotation: true
  });

  fabricCanvas.add(cropRect);
  fabricCanvas.setActiveObject(cropRect);
  fabricCanvas.requestRenderAll();

  showCropButtons(true);
}


// ---------------------------------------------
// APPLY CROP
// ---------------------------------------------
export function applyCrop() {
  if (!cropping || !cropRect || !cropTarget) return;

  const left = cropRect.left - cropTarget.left;
  const top = cropRect.top - cropTarget.top;
  const width = cropRect.width * cropRect.scaleX;
  const height = cropRect.height * cropRect.scaleY;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;

  const ctx = tempCanvas.getContext("2d");

  // Create an image to crop
  const img = new Image();
  img.src = cropTarget._originalElement.src;

  img.onload = () => {
    ctx.drawImage(
      img,
      left,
      top,
      width,
      height,
      0,
      0,
      width,
      height
    );

    const croppedData = tempCanvas.toDataURL("image/png");

    fabric.Image.fromURL(croppedData, (croppedImg) => {
      croppedImg.left = cropRect.left;
      croppedImg.top = cropRect.top;
      croppedImg.scaleX = 1;
      croppedImg.scaleY = 1;

      fabricCanvas.remove(cropTarget);
      fabricCanvas.remove(cropRect);

      fabricCanvas.add(croppedImg);
      fabricCanvas.setActiveObject(croppedImg);

      resetCropState();
      fabricCanvas.requestRenderAll();
    });
  };
}


// ---------------------------------------------
// CANCEL CROP
// ---------------------------------------------
export function cancelCrop() {
  if (!cropping) return;

  fabricCanvas.remove(cropRect);
  resetCropState();
  fabricCanvas.requestRenderAll();
}


// ---------------------------------------------
// INTERNAL RESET
// ---------------------------------------------
function resetCropState() {
  cropping = false;
  cropRect = null;
  cropTarget = null;
  showCropButtons(false);
}

function showCropButtons(show) {
  const ok = document.getElementById("cropOK");
  const cancel = document.getElementById("cropCancel");
  if (!ok || !cancel) return;

  ok.style.display = show ? "inline-block" : "none";
  cancel.style.display = show ? "inline-block" : "none";
}

// ---------------------------------------------
// STICKERS SYSTEM
// ---------------------------------------------

// assumes fabricCanvas is global / exported from core.js
export async function loadStickersFromList() {
  const grid = document.getElementById("stickerGrid");
  if (!grid) return;
  grid.innerHTML = 'Φόρτωση…';

  try {
    const res = await fetch('./assets/stickers/emojis/list.json');
    const emojis = await res.json();

    grid.innerHTML = '';
    emojis.forEach(emoji => {
      const img = document.createElement('img');
      img.alt = emoji;
      img.src = getTwemojiPngUrl(emoji, 72); // 72px thumbnails
      img.className = 'sticker-thumb';
      img.onclick = () => addStickerToCanvas(img.src);
      grid.appendChild(img);
    });
  } catch (err) {
    console.error('Sticker list load error', err);
    grid.innerHTML = 'Σφάλμα φόρτωσης stickers';
  }
}

export function addStickerToCanvas(url) {
  if (!fabricCanvas) {
    alert('Ο καμβάς δεν είναι έτοιμος');
    return;
  }

  fabric.Image.fromURL(url, img => {
    img.set({
      left: fabricCanvas.width / 2 - 100,
      top: fabricCanvas.height / 2 - 100,
      scaleX: 0.8,
      scaleY: 0.8,
      selectable: true,
      hasControls: true
    });
    fabricCanvas.add(img);
    fabricCanvas.setActiveObject(img);
    fabricCanvas.requestRenderAll();

    // αποθήκευση history (αν έχεις initHistory)
    // saveHistoryState();  // εάν η saveHistoryState είναι public
  }, { crossOrigin: 'Anonymous' });
}


// ---------------------------------------------
// TEMPLATES SYSTEM
// ---------------------------------------------

let templatesCache = {};

export function loadTemplates(category) {
  const grid = document.getElementById("templateGrid");
  grid.innerHTML = "Φόρτωση…";

  if (templatesCache[category]) {
    showTemplates(templatesCache[category], category);
    return;
  }

  fetch(`./assets/templates/${category}/list.json`)
    .then(r => r.json())
    .then(files => {
      templatesCache[category] = files;
      showTemplates(files, category);
    })
    .catch(err => {
      console.error("Template loading error:", err);
      grid.innerHTML = "Σφάλμα.";
    });
}

function showTemplates(files, category) {
  const grid = document.getElementById("templateGrid");
  grid.innerHTML = "";

  files.forEach(file => {
    const box = document.createElement("div");
    box.className = "template-thumb";

    const img = document.createElement("img");
    img.src = `./assets/templates/${category}/${file.replace(".json", ".jpg")}`;

    box.appendChild(img);

    box.onclick = () => applyTemplate(category, file);
    grid.appendChild(box);
  });
}

export function applyTemplate(category, templateJson) {
  fetch(`./assets/templates/${category}/${templateJson}`)
    .then(res => res.json())
    .then(data => {
      // καθαρίζουμε τον καμβά
      fabricCanvas.clear();

      // φορτώνουμε το JSON
      fabricCanvas.loadFromJSON(data, () => {
        // κάνουμε αυτόματα fit στο canvas
        fabricCanvas.getObjects().forEach((obj) => {
          obj.scaleX *= canvasScaleFactor();
          obj.scaleY *= canvasScaleFactor();
          obj.left *= canvasScaleFactor();
          obj.top *= canvasScaleFactor();
          obj.setCoords();
        });

        fabricCanvas.renderAll();
      });
    })
    .catch(err => {
      console.error("Template apply error:", err);
    });
}

function canvasScaleFactor() {
  return fabricCanvas.width / 1000; // assuming template base width = 1000
}


// ---------------------------------------------
// PDF IMPORT SYSTEM
// ---------------------------------------------

export function importPDF(file) {
  const reader = new FileReader();

  reader.onload = async function () {
    const typedArray = new Uint8Array(this.result);

    try {
      const pdf = await pdfjsLib.getDocument(typedArray).promise;
      console.log("PDF loaded, pages:", pdf.numPages);

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        // viewport scale
        const viewport = page.getViewport({ scale: 2 });

        // canvas
        const c = document.createElement("canvas");
        c.width = viewport.width;
        c.height = viewport.height;

        const ctx = c.getContext("2d");

        // render
        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;

        // convert to image
        const imgData = c.toDataURL("image/png");

        fabric.Image.fromURL(imgData, (img) => {
          img.scaleToWidth(fabricCanvas.width);

          fabricCanvas.add(img);
          fabricCanvas.setActiveObject(img);
          fabricCanvas.renderAll();
        });
      }
    } catch (err) {
      console.error("PDF import error:", err);
      alert("Σφάλμα στην εισαγωγή PDF.");
    }
  };

  reader.readAsArrayBuffer(file);
}

// Μετατρέπει emoji string σε codepoint hex (υποστηρίζει multi-codepoint emoji)
function emojiToCodePoints(emoji) {
  const codePoints = [];
  for (const char of Array.from(emoji)) {
    codePoints.push(char.codePointAt(0).toString(16));
  }
  // Για πολυ-κώδικες συνένωση με '-' (όπως έχει το twemoji για σύνθετα emoji)
  return codePoints.join('-');
}

function getTwemojiPngUrl(emoji, size = 72) {
  const cp = emojiToCodePoints(emoji);
  // ex: https://twemoji.maxcdn.com/v/latest/72x72/1f600.png
  return `https://twemoji.maxcdn.com/v/latest/${size}x${size}/${cp}.png`;
}


