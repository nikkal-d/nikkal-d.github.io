// js/ui.js
// Wires UI controls to core functions (safe bindings)

import {
  initCanvas,
  addText,
  addImageFromFile,
  addPdfFromFile,
  addRect,
  addCircle,
  addLine,
  addTriangle,
  addEllipse,
  setZoom,
  zoomIn,
  zoomOut,
  zoomReset,
  fitToScreen,
  setCanvasSize,
  addPage,
  duplicatePage,
  deletePage,
  prevPage,
  nextPage,
  exportPNG,
  exportJPG,
  exportPDF,
  exportFlipbook,
  previewFlipbook,
  closeFlipbookPreview,
  exportLink,
  cropSelected,
  removeBgSelected,
  setCanvasBackground,
  setActiveFill,
  setActiveStroke,
  setActiveOpacity,
  setTextProps,
  bringForward,
  sendBackwards,
  deleteSelected,
  updateLayersUI,
  clearDraft,
} from "./core.js";

const $ = (id) => document.getElementById(id);
const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };

// ---------- init ----------
document.addEventListener("DOMContentLoaded", async () => {
  await initCanvas({ preset: $("pageSizeSelect")?.value || "A4P" });

  // Pages
  on("addPageBtn", "click", () => addPage());
  on("dupPageBtn", "click", () => duplicatePage());
  on("delPageBtn", "click", () => deletePage());
  on("prevPageBtn", "click", () => prevPage());
  on("nextPageBtn", "click", () => nextPage());

  // Zoom / stage
  on("zoomInBtn", "click", () => zoomIn());
  on("zoomOutBtn", "click", () => zoomOut());
  on("zoomResetBtn", "click", () => zoomReset());
  on("zoomFitBtn", "click", () => fitToScreen());
  on("fitBtn", "click", () => fitToScreen());

  // Page size (canvas dimensions)
  on("pageSizeSelect", "change", (e) => {
    const preset = e.target.value;
    setCanvasSize(preset, true);
  });

  // Text
  on("addTextBtn", "click", () => {
    const font = $("fontSelect")?.value || "Arial";
    const size = Number($("fontSizeInput")?.value || 48);
    const fill = $("textColorInput")?.value || "#111111";
    addText({ fontFamily: font, fontSize: size, fill });
  });

  on("fontSelect", "change", (e) => setTextProps({ fontFamily: e.target.value }));
  on("fontSizeInput", "input", (e) => setTextProps({ fontSize: Number(e.target.value || 48) }));
  on("textColorInput", "input", (e) => setTextProps({ fill: e.target.value }));

  on("boldBtn", "click", () => toggleTextProp("fontWeight", "bold", "normal"));
  on("italicBtn", "click", () => toggleTextProp("fontStyle", "italic", "normal"));
  on("underlineBtn", "click", () => toggleTextProp("underline", true, false));

  on("alignLeftBtn", "click", () => setTextProps({ textAlign: "left" }));
  on("alignCenterBtn", "click", () => setTextProps({ textAlign: "center" }));
  on("alignRightBtn", "click", () => setTextProps({ textAlign: "right" }));

  // Images
  on("imageInput", "change", async (e) => {
    const file = e.target.files?.[0];
    if (file) await addImageFromFile(file);
    e.target.value = "";
  });

  // PDF upload (adds first/selected page as image)
  on("pdfInput", "change", async (e) => {
    const file = e.target.files?.[0];
    if (file) await addPdfFromFile(file);
    e.target.value = "";
  });

  on("cropBtn", "click", () => cropSelected());
  on("removeBgBtn", "click", () => removeBgSelected());

  // Colors
  on("canvasBgColor", "input", (e) => setCanvasBackground(e.target.value));
  on("objFillColor", "input", (e) => setActiveFill(e.target.value));
  on("objStrokeColor", "input", (e) => setActiveStroke(e.target.value, Number($("objStrokeWidth")?.value || 4)));
  on("objStrokeWidth", "input", (e) => setActiveStroke($("objStrokeColor")?.value || "#000000", Number(e.target.value || 4)));
  on("objOpacity", "input", (e) => setActiveOpacity(Number(e.target.value || 1)));

  document.querySelectorAll("[data-bg]").forEach(btn => {
    btn.addEventListener("click", () => setCanvasBackground(btn.dataset.bg));
  });

  // Shapes
  on("addRectBtn", "click", () => addRect());
  on("addCircleBtn", "click", () => addCircle());
  on("addLineBtn", "click", () => addLine());
  on("addTriBtn", "click", () => addTriangle());
  on("addEllBtn", "click", () => addEllipse());

  // Layers
  on("bringFwdBtn", "click", () => bringForward());
  on("sendBackBtn", "click", () => sendBackwards());
  on("deleteObjBtn", "click", () => deleteSelected());

  // Export
 on("exportPngBtn", "click", async () => {
  const multiplier = prompt("Εισάγετε κλίμακα ποιότητας (1 = Κανονική, 2 = Υψηλή, 3 = Πολύ Υψηλή):", "2");
  if (multiplier) exportPNG(parseFloat(multiplier));
});
 on("exportJpgBtn", "click", async () => {
  const multiplier = prompt("Εισάγετε κλίμακα ποιότητας (1 = Κανονική, 2 = Υψηλή, 3 = Πολύ Υψηλή):", "2");
  if (multiplier) exportJPG(parseFloat(multiplier));
});
  on("exportPdfBtn", "click", () => exportPDF());
 on("exportFlipbookBtn", "click", () => {
    previewFlipbook(); // Αυτό πλέον κάνει το "Export" με το PDF μέσα
});
  on("previewFlipBtn", "click", async () => {
    const dir = $("flipDirSelect")?.value || "horizontal";
    await previewFlipbook({ direction: dir });
  });
  on("closeFlipPreview", "click", () => closeFlipbookPreview());
  on("exportLinkBtn", "click", () => exportLink());
  on("clearDraftBtn", "click", () => clearDraft());

  // Keep layers refreshed when something changes (core already listens, but this helps on UI load)
  updateLayersUI();
});

// ---------- helpers ----------
function toggleTextProp(key, onVal, offVal) {
  // Read selection style via fabric active object if possible
  // We don't import getActiveObject to keep ui small; we just set the property toggling.
  // Toggle by reading current style from DOM inputs if present; fallback to off->on.
  // (Core will ignore if selection isn't text)
  const guess = (onVal === true) ? false : offVal;
  setTextProps({ [key]: guess });
  // second pass: if it was off, set on (best-effort)
  setTimeout(() => setTextProps({ [key]: onVal }), 0);
}

export function openFlipbookPreview(images) {
    const win = window.open("", "_blank");
    
    const html = `
<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>Flipbook Final</title>
    <style>
        body { 
            margin:0; background:#1a1a1a; 
            display:flex; flex-direction:column; align-items:center; 
            height:100vh; overflow:hidden; font-family:sans-serif; 
        }
        .toolbar { 
            width:100%; background:#000; padding:15px; 
            display:flex; justify-content:center; gap:15px; z-index:1000;
        }
        button { 
            padding:12px 25px; cursor:pointer; border:none; border-radius:5px; 
            font-weight:bold; color:white; background:#444; font-size:14px;
        }
        .btn-download { background:#27ae60 !important; }
        .btn-pdf { background:#2980b9 !important; }

        .viewport { 
            flex:1; width:100%; display:flex; justify-content:center; 
            align-items:center; perspective:2500px; padding-bottom:50px;
        }
        
        /* ΚΛΕΙΔΩΜΑ ΔΙΑΣΤΑΣΕΩΝ 80x56 */
        .book { 
            position:relative; 
            width: 80vh !important; 
            height: 56vh !important; 
            transform-style:preserve-3d; transition:transform 0.6s ease;
        }
        
        .leaf { 
            position:absolute; width:100%; height:100%; 
            transform-origin:left; transition:0.8s; transform-style:preserve-3d; 
        }
        .page { 
            position:absolute; width:100%; height:100%; 
            backface-visibility:hidden; background:white; 
            box-shadow:0 0 20px rgba(0,0,0,0.5);
            display:flex; align-items:center; justify-content:center;
            overflow:hidden; /* Δεν αφήνει την εικόνα να βγει έξω */
        }
        .back { transform:rotateY(180deg); }
        
        /* ΕΔΩ ΕΙΝΑΙ Η ΔΙΟΡΘΩΣΗ ΓΙΑ ΤΗΝ ΕΙΚΟΝΑ */
        img { 
            width: 100% !important; 
            height: 100% !important; 
            display: block;
            object-fit: fill; /* Αναγκάζει την εικόνα να "κουμπώσει" στις διαστάσεις 80x56 */
        }
        
        .flipped { transform:rotateY(-180deg); }
    </style>
</head>
<body>
    <div class="toolbar">
        <button onclick="p()">❮ Πίσω</button>
        <button onclick="n()">Επόμενο ❯</button>
        <button class="btn-download" onclick="saveHTML()">💾 Αποθήκευση Flipbook</button>
        <button class="btn-pdf" onclick="window.opener.exportPDF()">📄 Λήψη PDF</button>
    </div>

    <div class="viewport">
        <div class="book" id="book">
            ${images.map((img, i) => i % 2 === 0 ? `
            <div class="leaf">
                <div class="page front"><img src="${img}"></div>
                <div class="page back">${images[i+1] ? `<img src="${images[i+1]}">` : '<div style="background:#fff;width:100%;height:100%"></div>'}</div>
            </div>` : '').join('')}
        </div>
    </div>

    <script>
        let cur=0; 
        const leafs=document.querySelectorAll('.leaf');
        const book=document.getElementById('book');

        function n(){ 
            if(cur < leafs.length){ 
                leafs[cur].style.zIndex = 100 + cur;
                leafs[cur].classList.add('flipped'); 
                cur++; update(); 
            } 
        }
        function p(){ 
            if(cur > 0){ 
                cur--; 
                leafs[cur].classList.remove('flipped'); 
                setTimeout(() => { leafs[cur].style.zIndex = 100 - cur; }, 300);
                update(); 
            } 
        }
        function update(){ 
            book.style.transform = cur > 0 ? "translateX(50%)" : "translateX(0)"; 
        }
        function saveHTML() {
            const blob = new Blob([document.documentElement.outerHTML], {type:'text/html'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'Photobook_Final.html';
            a.click();
        }
    </script>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
}

