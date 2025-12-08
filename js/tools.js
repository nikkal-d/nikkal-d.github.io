// js/tools.js
// ---------------------------------------------
// IMAGE FILTERS SYSTEM
// ---------------------------------------------

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

let stickersCache = {};

export function loadStickers(category) {
  const grid = document.getElementById("stickerGrid");
  grid.innerHTML = "Φόρτωση...";

  // cache
  if (stickersCache[category]) {
    showStickers(stickersCache[category]);
    return;
  }

  fetch(`./assets/stickers/${category}/list.json`)
    .then(res => res.json())
    .then(files => {
      stickersCache[category] = files;
      showStickers(files);
    })
    .catch(err => {
      console.error("Sticker loading error:", err);
      grid.innerHTML = "Σφάλμα.";
    });
}

function showStickers(files) {
  const grid = document.getElementById("stickerGrid");
  grid.innerHTML = "";

  const cat = document.getElementById("stickerCategory").value;

  files.forEach(file => {
    const img = document.createElement("img");
    img.src = `./assets/stickers/${cat}/${file}`;
    img.onclick = () => addSticker(img.src);
    grid.appendChild(img);
  });
}


function showStickers(files) {
  const grid = document.getElementById("stickerGrid");
  grid.innerHTML = "";

  files.forEach(file => {
    const img = document.createElement("img");
    img.src = `./assets/stickers/${file}`;
    img.onclick = () => addSticker(img.src);
    grid.appendChild(img);
  });
}

export function addSticker(url) {
  fabric.Image.fromURL(url, (img) => {
    img.scaleToWidth(200);
    img.set({
      left: fabricCanvas.width / 2 - 100,
      top: fabricCanvas.height / 2 - 100,
      selectable: true
    });

    fabricCanvas.add(img);
    fabricCanvas.setActiveObject(img);
    fabricCanvas.requestRenderAll();
  });
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


