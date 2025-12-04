/* ============================================================
   PHOTObook Studio — TOOLS MODULE
   Text Tools • Image Tools • Filters • Stickers • Templates
   ============================================================ */

import { fabricCanvas, saveCurrentPage } from "./core.js";

/* ============================================================
   TEXT TOOLS
   ============================================================ */

function getActiveText() {
  const obj = fabricCanvas.getActiveObject();
  if (!obj) return null;
  if (obj.type === "i-text" || obj.type === "textbox" || obj.isTextObject) {
    return obj;
  }
  return null;
}

function initTextTools() {
  document.getElementById("addTextBtn").onclick = () => {
    const text = new fabric.IText("Κείμενο", {
      left: 100,
      top: 100,
      fontSize: Number(document.getElementById("textSize").value) || 40,
      fill: document.getElementById("textColor").value,
      fontFamily: document.getElementById("textFont").value,
    });
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    saveCurrentPage();
  };

  document.getElementById("addCurvedTextBtn").onclick = () => {
    const text = new fabric.Text("Κυρτό Κείμενο", {
      left: 100,
      top: 100,
      fontFamily: "Poppins",
      fontSize: 40,
    });
    text.isTextObject = true;
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    saveCurrentPage();
  };

  document.getElementById("textBoldBtn").onclick = () => {
    const t = getActiveText();
    if (!t) return;
    t.fontWeight = t.fontWeight === "bold" ? "normal" : "bold";
    fabricCanvas.requestRenderAll();
    saveCurrentPage();
  };

  document.getElementById("textItalicBtn").onclick = () => {
    const t = getActiveText();
    if (!t) return;
    t.fontStyle = t.fontStyle === "italic" ? "normal" : "italic";
    fabricCanvas.requestRenderAll();
    saveCurrentPage();
  };

  document.getElementById("textUnderlineBtn").onclick = () => {
    const t = getActiveText();
    if (!t) return;
    t.underline = !t.underline;
    fabricCanvas.requestRenderAll();
    saveCurrentPage();
  };

  document.getElementById("gradientTextBtn").onclick = () => {
    const t = getActiveText();
    if (!t) return;

    t.set("fill", new fabric.Gradient({
      type: "linear",
      gradientUnits: "percentage",
      coords: { x1: 0, y1: 0, x2: 1, y2: 0 },
      colorStops: [
        { offset: 0, color: "#ff6b6b" },
        { offset: 1, color: "#4f46e5" }
      ]
    }));

    fabricCanvas.requestRenderAll();
    saveCurrentPage();
  };

  document.getElementById("highlightTextBtn").onclick = () => {
    const t = getActiveText();
    if (!t) return;

    t.set("textBackgroundColor", "yellow");
    fabricCanvas.requestRenderAll();
    saveCurrentPage();
  };

  document.getElementById("clearShadowTextBtn").onclick = () => {
    const t = getActiveText();
    if (!t) return;
    t.set("shadow", null);
    fabricCanvas.requestRenderAll();
    saveCurrentPage();
  };

  document.getElementById("shadowTextBtn").onclick = () => {
    const t = getActiveText();
    if (!t) return;
    t.set("shadow", "2px 2px 4px rgba(0,0,0,0.4)");
    fabricCanvas.requestRenderAll();
    saveCurrentPage();
  };

  document.getElementById("deleteTextBtn").onclick = () => {
    const t = getActiveText();
    if (!t) return;
    fabricCanvas.remove(t);
    fabricCanvas.requestRenderAll();
    saveCurrentPage();
  };
}


/* ============================================================
   IMAGE UPLOAD
   ============================================================ */

function initImageUpload() {
  const btn = document.getElementById("uploadImageBtn");
  const input = document.getElementById("imageInput");

  btn.onclick = () => input.click();

  input.onchange = () => {
    [...input.files].forEach(file => {
      const reader = new FileReader();
      reader.onload = () => addImageToCanvas(reader.result);
      reader.readAsDataURL(file);
    });
  };
}

function addImageToCanvas(url) {
  fabric.Image.fromURL(url, (img) => {
    img.scaleToWidth(300);
    img.set({ left: 100, top: 100 });
    fabricCanvas.add(img);
    fabricCanvas.setActiveObject(img);
    fabricCanvas.requestRenderAll();
    saveCurrentPage();
  });
}


/* ============================================================
   PDF IMPORT
   ============================================================ */

function initPdfUpload() {
  const btn = document.getElementById("uploadPdfBtn");
  const input = document.getElementById("pdfInput");

  btn.onclick = () => input.click();

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    const pdfjs = window["pdfjsLib"];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;

      addPdfPageAsImage(canvas.toDataURL("image/png"));
    }
  };
}

function addPdfPageAsImage(imgData) {
  fabric.Image.fromURL(imgData, (img) => {
    img.scaleToWidth(400);
    img.set({ left: 50, top: 50 });

    fabricCanvas.add(img);
    fabricCanvas.requestRenderAll();
    saveCurrentPage();
  });
}


/* ============================================================
   FILTERS (BRIGHTNESS • CONTRAST • SATURATION • BLUR)
   ============================================================ */

function initFilters() {
  const brightness = document.getElementById("imgBrightness");
  const contrast = document.getElementById("imgContrast");
  const saturation = document.getElementById("imgSaturation");
  const blur = document.getElementById("imgBlur");

  brightness.oninput = () => applyFilter("brightness", Number(brightness.value));
  contrast.oninput = () => applyFilter("contrast", Number(contrast.value));
  saturation.oninput = () => applyFilter("saturation", Number(saturation.value));
  blur.oninput = () => applyFilter("blur", Number(blur.value));

  document.getElementById("imgSepiaBtn").onclick = () => simpleFilter("sepia");
  document.getElementById("imgBwBtn").onclick = () => simpleFilter("grayscale");
  document.getElementById("imgSharpenBtn").onclick = () => simpleFilter("sharpen");
  document.getElementById("imgAutoEnhanceBtn").onclick = () => simpleFilter("polaroid");

  document.getElementById("imgResetBtn").onclick = resetFilters;
}

function getActiveImage() {
  const o = fabricCanvas.getActiveObject();
  if (!o || o.type !== "image") return null;
  return o;
}

function applyFilter(type, value) {
  const img = getActiveImage();
  if (!img) return;

  if (!img.filters) img.filters = [];

  let existing = img.filters.find(f => f.type === type);

  if (!existing) {
    existing = new fabric.Image.filters[type.charAt(0).toUpperCase() + type.slice(1)]({
      [type]: value
    });
    img.filters.push(existing);
  } else {
    existing[type] = value;
  }

  img.applyFilters();
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}

function simpleFilter(name) {
  const img = getActiveImage();
  if (!img) return;

  img.filters.push(new fabric.Image.filters[name.charAt(0).toUpperCase() + name.slice(1)]());
  img.applyFilters();
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}

function resetFilters() {
  const img = getActiveImage();
  if (!img) return;
  img.filters = [];
  img.applyFilters();
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}


/* ============================================================
   STICKERS
   ============================================================ */

function initStickers() {
  const box = document.getElementById("stickers-box");
  const category = document.getElementById("sticker-category");

  const stickerSets = {
    emoji: [
      "😎", "😂", "😍", "🔥", "👌", "✨"
    ],
    shapes: [
      "⬛", "⬜", "🔺", "🔵", "⭐"
    ],
    doodles: [
      "🌙", "☁", "🌸", "⚡"
    ],
    frames: [
      "🖼️", "🔲", "⬒"
    ]
  };

  function loadStickers() {
    box.innerHTML = "";
    const list = stickerSets[category.value] || [];
    list.forEach(st => {
      const div = document.createElement("div");
      div.className = "sticker-item";
      div.textContent = st;

      div.onclick = () => addSticker(st);
      box.appendChild(div);
    });
  }

  category.onchange = loadStickers;
  loadStickers();
}

function addSticker(st) {
  const text = new fabric.Text(st, {
    fontSize: 80,
    left: 100,
    top: 100
  });
  fabricCanvas.add(text);
  fabricCanvas.setActiveObject(text);
  saveCurrentPage();
}


/* ============================================================
   TEMPLATES
   ============================================================ */

function initTemplates() {
  document.getElementById("tplMinimalBtn").onclick = () => applyTemplate("minimal");
  document.getElementById("tplMagazineBtn").onclick = () => applyTemplate("magazine");
  document.getElementById("tplScrapbookBtn").onclick = () => applyTemplate("scrapbook");
  document.getElementById("tplGrid2Btn").onclick = () => applyTemplate("grid2");
  document.getElementById("tplGrid4Btn").onclick = () => applyTemplate("grid4");
  document.getElementById("tplFullBleedBtn").onclick = () => applyTemplate("fullbleed");
}

function applyTemplate(tpl) {
  fabricCanvas.clear();

  switch (tpl) {

    case "minimal":
      fabricCanvas.add(new fabric.Text("Minimal Template", {
        left: 100, top: 100, fontSize: 40
      }));
      break;

    case "magazine":
      fabricCanvas.add(new fabric.Rect({
        left: 0, top: 0, width: fabricCanvas.width, height: 200,
        fill: "#4f46e5"
      }));
      fabricCanvas.add(new fabric.Text("Magazine Title", {
        left: 20, top: 20, fill: "white", fontSize: 50
      }));
      break;

    case "scrapbook":
      fabricCanvas.add(new fabric.Circle({
        left: 150, top: 150, radius: 120, fill: "#fff7cc"
      }));
      fabricCanvas.add(new fabric.Text("Scrapbook", {
        left: 180, top: 270, fontSize: 30
      }));
      break;

    case "grid2":
      addGrid(2);
      break;

    case "grid4":
      addGrid(4);
      break;

    case "fullbleed":
      fabricCanvas.add(new fabric.Rect({
        left: 0, top: 0,
        width: fabricCanvas.width,
        height: fabricCanvas.height,
        fill: "#dddddd"
      }));
      break;
  }

  fabricCanvas.requestRenderAll();
  saveCurrentPage();
}

function addGrid(num) {
  const cols = num === 4 ? 2 : 1;
  const rows = num / cols;
  const w = fabricCanvas.width / cols;
  const h = fabricCanvas.height / rows;

  for (let i = 0; i < num; i++) {
    fabricCanvas.add(new fabric.Rect({
      left: (i % cols) * w,
      top: Math.floor(i / cols) * h,
      width: w - 10,
      height: h - 10,
      stroke: "#4f46e5",
      strokeWidth: 2,
      fill: "transparent"
    }));
  }
}


/* ============================================================
   INITIALIZE ALL TOOL SYSTEMS
   ============================================================ */

window.addEventListener("DOMContentLoaded", () => {
  initTextTools();
  initImageUpload();
  initPdfUpload();
  initFilters();
  initStickers();
  initTemplates();
});
