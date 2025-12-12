// js/tools.js
// ---------------------------------------------
// Photobook Studio — Tools
// Filters • Crop • Stickers • Templates • PDF Import • AI Images
// ---------------------------------------------

import { fabricCanvas, saveCurrentPage } from "./core.js";

/* ============================================================
   INIT (τρέχει μόνο σε σελίδες με editor UI)
   ============================================================ */

window.addEventListener("DOMContentLoaded", () => {
  initAIImageSearch();
});

/* ============================================================
   STICKERS — EMOJIS από list.json + Twemoji
   ============================================================ */

export async function loadStickersFromList() {
  const grid = document.getElementById("stickerGrid");
  if (!grid) return;

  grid.innerHTML = "Φόρτωση…";

  try {
    const res = await fetch("./assets/stickers/emojis/list.json");
    const emojis = await res.json();

    grid.innerHTML = "";
    emojis.forEach((emoji) => {
      const img = document.createElement("img");
      img.className = "sticker-thumb";
      img.alt = emoji;
      img.src = getTwemojiPngUrl(emoji, 72);
      img.onclick = () => addStickerToCanvas(img.src);
      grid.appendChild(img);
    });
  } catch (err) {
    console.error("Sticker list load error:", err);
    grid.innerHTML = "Σφάλμα φόρτωσης stickers";
  }
}

// γενικό loader για κατηγορίες (προς το παρόν μόνο emojis)
export function loadStickers(category) {
  const grid = document.getElementById("stickerGrid");
  if (!grid) return;

  if (category === "emojis") {
    loadStickersFromList();
  } else {
    grid.innerHTML = "Άλλα stickers θα προστεθούν σύντομα 🙂";
  }
}

export function addStickerToCanvas(url) {
  if (!fabricCanvas) {
    alert("Ο καμβάς δεν είναι έτοιμος!");
    return;
  }

  if (typeof fabric === "undefined" || !fabric.Image) {
    console.error("fabric.js δεν φορτώθηκε σωστά.");
    return;
  }

  fabric.Image.fromURL(
    url,
    (img) => {
      img.set({
        left: fabricCanvas.width / 2 - 80,
        top: fabricCanvas.height / 2 - 80,
        scaleX: 0.7,
        scaleY: 0.7
      });

      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.renderAll();
      saveCurrentPage();
    },
    { crossOrigin: "anonymous" }
  );
}

// Twemoji helpers
function emojiToCodePoints(emoji) {
  const codePoints = [];
  for (const char of Array.from(emoji)) {
    codePoints.push(char.codePointAt(0).toString(16));
  }
  return codePoints.join("-");
}

function getTwemojiPngUrl(emoji, size = 72) {
  const cp = emojiToCodePoints(emoji);
  return `https://twemoji.maxcdn.com/v/latest/${size}x${size}/${cp}.png`;
}

/* ============================================================
   IMAGE FILTERS
   ============================================================ */

export function applyFilter(type, value = 0) {
  if (!fabricCanvas) return;

  const obj = fabricCanvas.getActiveObject();
  if (!obj || obj.type !== "image") {
    alert("Επίλεξε πρώτα μια εικόνα.");
    return;
  }

  if (typeof fabric === "undefined" || !fabric.Image || !fabric.Image.filters) {
    console.error("fabric.js filters module δεν είναι διαθέσιμο.");
    return;
  }

  if (!obj.filters) obj.filters = [];

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
  saveCurrentPage();
}

/* ============================================================
   CROP TOOL
   ============================================================ */

let cropping = false;
let cropRect = null;
let cropTarget = null;

export function startCrop() {
  if (!fabricCanvas) return;

  const obj = fabricCanvas.getActiveObject();
  if (!obj || obj.type !== "image") {
    alert("Επίλεξε πρώτα μια εικόνα.");
    return;
  }

  cropping = true;
  cropTarget = obj;
  cropTarget.selectable = false;

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

export function applyCrop() {
  if (!cropping || !cropRect || !cropTarget || !fabricCanvas) return;

  const left = cropRect.left - cropTarget.left;
  const top = cropRect.top - cropTarget.top;
  const width = cropRect.width * cropRect.scaleX;
  const height = cropRect.height * cropRect.scaleY;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;

  const ctx = tempCanvas.getContext("2d");

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = cropTarget._originalElement?.src || cropTarget.src;

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
      saveCurrentPage();
    });
  };
}

export function cancelCrop() {
  if (!cropping || !fabricCanvas) return;

  fabricCanvas.remove(cropRect);
  resetCropState();
  fabricCanvas.requestRenderAll();
}

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

/* ============================================================
   TEMPLATES SYSTEM (placeholder)
   ============================================================ */

let templatesCache = {};

export function loadTemplates(category) {
  const grid = document.getElementById("templateGrid");
  if (!grid) return;

  grid.innerHTML = "Φόρτωση…";

  if (templatesCache[category]) {
    showTemplates(templatesCache[category], category);
    return;
  }

  fetch(`./assets/templates/${category}/list.json`)
    .then((r) => r.json())
    .then((files) => {
      templatesCache[category] = files;
      showTemplates(files, category);
    })
    .catch((err) => {
      console.error("Template loading error:", err);
      grid.innerHTML = "Σφάλμα.";
    });
}

function showTemplates(files, category) {
  const grid = document.getElementById("templateGrid");
  if (!grid) return;

  grid.innerHTML = "";

  files.forEach((file) => {
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
  if (!fabricCanvas) return;

  fetch(`./assets/templates/${category}/${templateJson}`)
    .then((res) => res.json())
    .then((data) => {
      fabricCanvas.clear();

      fabricCanvas.loadFromJSON(data, () => {
        const factor = canvasScaleFactor();
        fabricCanvas.getObjects().forEach((obj) => {
          obj.scaleX *= factor;
          obj.scaleY *= factor;
          obj.left *= factor;
          obj.top *= factor;
          obj.setCoords();
        });

        fabricCanvas.renderAll();
        saveCurrentPage();
      });
    })
    .catch((err) => {
      console.error("Template apply error:", err);
    });
}

function canvasScaleFactor() {
  if (!fabricCanvas) return 1;
  return fabricCanvas.width / 1000; // υποθέτουμε template width 1000
}

/* ============================================================
   PDF IMPORT SYSTEM
   ============================================================ */

export function importPDF(file) {
  if (typeof pdfjsLib === "undefined") {
    alert("Το PDF module (pdf.js) δεν φορτώθηκε.");
    return;
  }
  if (!fabricCanvas) return;

  const reader = new FileReader();

  reader.onload = async function () {
    const typedArray = new Uint8Array(this.result);

    try {
      const pdf = await pdfjsLib.getDocument(typedArray).promise;
      console.log("PDF loaded, pages:", pdf.numPages);

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        const viewport = page.getViewport({ scale: 2 });

        const c = document.createElement("canvas");
        c.width = viewport.width;
        c.height = viewport.height;

        const ctx = c.getContext("2d");

        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;

        const imgData = c.toDataURL("image/png");

        fabric.Image.fromURL(imgData, (img) => {
          img.scaleToWidth(fabricCanvas.width);

          fabricCanvas.add(img);
          fabricCanvas.setActiveObject(img);
          fabricCanvas.renderAll();
          saveCurrentPage();
        });
      }
    } catch (err) {
      console.error("PDF import error:", err);
      alert("Σφάλμα στην εισαγωγή PDF.");
    }
  };

  reader.readAsArrayBuffer(file);
}

/* ============================================================
   AI IMAGES (Unsplash source API – χωρίς API key)
   ============================================================ */

function initAIImageSearch() {
  const input = document.getElementById("aiImageSearch");
  const btn = document.getElementById("aiImageSearchBtn");
  const results = document.getElementById("aiImageResults");

  // Αν δεν υπάρχουν αυτά τα στοιχεία στη σελίδα, απλά δεν ενεργοποιείται το feature
  if (!input || !btn || !results) return;

  const doSearch = () => {
    const q = input.value.trim() || "abstract";
    loadAIImages(q, results);
  };

  btn.addEventListener("click", doSearch);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doSearch();
    }
  });

  // αρχικό demo search
  loadAIImages("flowers", results);
}

function loadAIImages(query, container) {
  container.innerHTML = `Αναζήτηση για "<strong>${query}</strong>"…`;

  // Χρησιμοποιούμε Unsplash Source χωρίς API key
  // Θα φέρουμε 6 τυχαίες εικόνες που ταιριάζουν στο query
  const count = 6;
  container.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const img = document.createElement("img");
    img.className = "ai-image-thumb";
    const url = `https://source.unsplash.com/800x600/?${encodeURIComponent(
      query
    )}&sig=${i}`;

    img.src = url;
    img.alt = query;
    img.title = "Πάτα για να προστεθεί στη σελίδα";

    img.onclick = () => addAIImageToCanvas(url);

    container.appendChild(img);
  }
}

function addAIImageToCanvas(url) {
  if (!fabricCanvas) {
    alert("Ο καμβάς δεν είναι έτοιμος.");
    return;
  }
  if (typeof fabric === "undefined" || !fabric.Image) {
    console.error("fabric.js δεν είναι διαθέσιμο.");
    return;
  }

  fabric.Image.fromURL(
    url,
    (img) => {
      // προσαρμογή στο μέγεθος καμβά
      const maxWidth = fabricCanvas.width * 0.9;
      img.scaleToWidth(maxWidth);

      img.left = (fabricCanvas.width - img.getScaledWidth()) / 2;
      img.top = (fabricCanvas.height - img.getScaledHeight()) / 2;

      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.renderAll();
      saveCurrentPage();
    },
    { crossOrigin: "anonymous" }
  );
}

export function bringForward() {
  const obj = fabricCanvas.getActiveObject();
  if (obj) fabricCanvas.bringForward(obj);
}

export function sendBackward() {
  const obj = fabricCanvas.getActiveObject();
  if (obj) fabricCanvas.sendBackwards(obj);
}

export function bringToFront() {
  const obj = fabricCanvas.getActiveObject();
  if (obj) fabricCanvas.bringToFront(obj);
}

export function sendToBack() {
  const obj = fabricCanvas.getActiveObject();
  if (obj) fabricCanvas.sendToBack(obj);
}

