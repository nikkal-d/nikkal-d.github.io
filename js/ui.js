// js/ui.js
// ============================================================
// UI / UX Phase 1
// Floating Inspector + Colors + Fonts + Tooltips + Language
// ============================================================

import {
  fabricCanvas,
  undo,
  redo,
  setZoom,
  getZoom,
  resetZoom,
  fitToScreen,
  setCanvasSizePreset,
  setCanvasCustom,
  addPage,
  duplicatePage,
  deletePage,
  nextPage,
  prevPage,
  saveCurrentPage,
  refreshThumbnails,
  updatePageInfo
} from "./core.js";

import {
  importImage,
  importPDF,
  addHeading,
  addBody,
  addCustomText,
  addRect,
  addCircle,
  addLine,
  setOpacity,
  toggleShadow,
  deleteSelected,
  bringForward,
  sendBackward,
  bringToFront,
  sendToBack
} from "./tools.js";

import { exportDo } from "./export.js";
import { openPreview, closePreview, prev as pvPrev, next as pvNext } from "./flipbook-preview.js";

/* --------------------------------------------------
  LANGUAGE
-------------------------------------------------- */
const LANG = {
  el: {
    inspector: "Ιδιότητες",
    fill: "Γέμισμα",
    stroke: "Περίγραμμα",
    opacity: "Διαφάνεια",
    font: "Γραμματοσειρά",
    size: "Μέγεθος",
    delete: "Διαγραφή",
    export: "Εξαγωγή"
  },
  en: {
    inspector: "Inspector",
    fill: "Fill",
    stroke: "Stroke",
    opacity: "Opacity",
    font: "Font",
    size: "Size",
    delete: "Delete",
    export: "Export"
  }
};

let currentLang = "el";
function t(k) {
  return LANG[currentLang][k] || k;
}

/* --------------------------------------------------
  INIT
-------------------------------------------------- */
window.addEventListener("DOMContentLoaded", () => {

  /* ---------- THEME ---------- */
  document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
    const root = document.documentElement;
    root.toggleAttribute("data-theme", "light");
  });

  /* ---------- LANGUAGE ---------- */
  document.getElementById("themeToggleBtn")?.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    currentLang = currentLang === "el" ? "en" : "el";
    updateInspectorLabels();
  });

  /* ---------- UNDO / REDO ---------- */
  document.getElementById("undoBtn")?.addEventListener("click", undo);
  document.getElementById("redoBtn")?.addEventListener("click", redo);

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); }
    if (e.ctrlKey && e.key === "y") { e.preventDefault(); redo(); }
  });

  /* ---------- ZOOM ---------- */
  const zoomLbl = document.getElementById("zoomLabel");
  const updZoom = () => zoomLbl.textContent = `${Math.round(getZoom()*100)}%`;

  document.getElementById("zoomInBtn")?.addEventListener("click", () => { setZoom(getZoom()*1.1); updZoom(); });
  document.getElementById("zoomOutBtn")?.addEventListener("click", () => { setZoom(getZoom()/1.1); updZoom(); });
  document.getElementById("zoomResetBtn")?.addEventListener("click", () => { resetZoom(); fitToScreen(); updZoom(); });
  document.getElementById("zoomFitBtn")?.addEventListener("click", () => { fitToScreen(); updZoom(); });

  /* ---------- CANVAS SIZE ---------- */
  document.getElementById("sizePreset")?.addEventListener("change", (e) => {
    if (e.target.value === "CUSTOM") {
      const w = prompt("Width px", "1400");
      const h = prompt("Height px", "1400");
      if (w && h) setCanvasCustom(w, h);
    } else {
      setCanvasSizePreset(e.target.value);
    }
    updZoom();
  });

  /* ---------- PAGES ---------- */
  document.getElementById("addPageBtn")?.addEventListener("click", () => { addPage(); updatePageInfo(); });
  document.getElementById("dupPageBtn")?.addEventListener("click", () => duplicatePage());
  document.getElementById("deletePageBtn")?.addEventListener("click", () => deletePage());
  document.getElementById("prevPageBtn")?.addEventListener("click", () => prevPage());
  document.getElementById("nextPageBtn")?.addEventListener("click", () => nextPage());

  /* ---------- IMPORT ---------- */
  document.getElementById("btnUploadImage")?.addEventListener("click", () =>
    document.getElementById("imageInput").click()
  );
  document.getElementById("imageInput")?.addEventListener("change", e => {
    importImage(e.target.files[0]);
    e.target.value = "";
  });

  document.getElementById("btnUploadPDF")?.addEventListener("click", () =>
    document.getElementById("pdfInput").click()
  );
  document.getElementById("pdfInput")?.addEventListener("change", e => {
    importPDF(e.target.files[0]);
    e.target.value = "";
  });

  /* ---------- TOOLS ---------- */
  document.getElementById("addHeadingBtn")?.addEventListener("click", addHeading);
  document.getElementById("addBodyBtn")?.addEventListener("click", addBody);
  document.getElementById("addCustomTextBtn")?.addEventListener("click", () => {
    const v = prompt("Text");
    addCustomText(v);
  });

  document.getElementById("addRectBtn")?.addEventListener("click", addRect);
  document.getElementById("addCircleBtn")?.addEventListener("click", addCircle);
  document.getElementById("addLineBtn")?.addEventListener("click", addLine);

  /* ---------- EXPORT ---------- */
  document.getElementById("exportFab")?.addEventListener("click", () =>
    document.getElementById("exportDrawer").classList.add("open")
  );
  document.getElementById("exportCloseBtn")?.addEventListener("click", () =>
    document.getElementById("exportDrawer").classList.remove("open")
  );

  document.getElementById("doExportBtn")?.addEventListener("click", () => {
    exportDo({
      format: document.getElementById("exportFormat").value,
      range: document.getElementById("exportRange").value,
      quality: Number(document.getElementById("exportQuality").value)
    });
  });

  /* ---------- FLIPBOOK PREVIEW ---------- */
  document.getElementById("previewFlipbookBtn")?.addEventListener("click", openPreview);
  document.getElementById("closePreviewBtn")?.addEventListener("click", closePreview);
  document.getElementById("pvPrev")?.addEventListener("click", pvPrev);
  document.getElementById("pvNext")?.addEventListener("click", pvNext);

  /* ---------- INSPECTOR ---------- */
  initInspector();

  updZoom();
});

/* --------------------------------------------------
  FLOATING INSPECTOR
-------------------------------------------------- */
function initInspector() {
  const box = document.createElement("div");
  box.id = "floatingInspector";
  box.style.cssText = `
    position:fixed;
    right:24px;
    top:96px;
    width:260px;
    background:var(--panel);
    border:1px solid var(--border);
    border-radius:14px;
    padding:12px;
    display:none;
    z-index:5000;
  `;

  box.innerHTML = `
    <h4 id="inspTitle">${t("inspector")}</h4>

    <label>${t("fill")}
      <input type="color" id="inspFill"/>
    </label>

    <label>${t("stroke")}
      <input type="color" id="inspStroke"/>
    </label>

    <label>${t("opacity")}
      <input type="range" id="inspOpacity" min="0" max="1" step="0.05"/>
    </label>

    <label>${t("size")}
      <input type="number" id="inspFontSize" min="8" max="200"/>
    </label>

    <div style="display:flex;gap:6px">
      <button id="boldBtn">B</button>
      <button id="italicBtn">I</button>
      <button id="underlineBtn">U</button>
    </div>

    <button id="deleteBtn" style="margin-top:10px;color:red">${t("delete")}</button>
  `;

  document.body.appendChild(box);

  fabricCanvas.on("selection:created", showInspector);
  fabricCanvas.on("selection:updated", showInspector);
  fabricCanvas.on("selection:cleared", () => box.style.display = "none");

  function showInspector() {
    const obj = fabricCanvas.getActiveObject();
    if (!obj) return;

    box.style.display = "block";

    document.getElementById("inspFill").oninput = e => {
      obj.set("fill", e.target.value);
      fabricCanvas.renderAll();
    };

    document.getElementById("inspStroke").oninput = e => {
      obj.set("stroke", e.target.value);
      fabricCanvas.renderAll();
    };

    document.getElementById("inspOpacity").oninput = e => {
      obj.set("opacity", e.target.value);
      fabricCanvas.renderAll();
    };

    if (obj.fontSize) {
      document.getElementById("inspFontSize").value = obj.fontSize;
      document.getElementById("inspFontSize").oninput = e => {
        obj.set("fontSize", Number(e.target.value));
        fabricCanvas.renderAll();
      };
    }

    document.getElementById("boldBtn").onclick = () => {
      obj.set("fontWeight", obj.fontWeight === "bold" ? "normal" : "bold");
      fabricCanvas.renderAll();
    };

    document.getElementById("italicBtn").onclick = () => {
      obj.set("fontStyle", obj.fontStyle === "italic" ? "normal" : "italic");
      fabricCanvas.renderAll();
    };

    document.getElementById("underlineBtn").onclick = () => {
      obj.set("underline", !obj.underline);
      fabricCanvas.renderAll();
    };

    document.getElementById("deleteBtn").onclick = deleteSelected;
  }
}

function updateInspectorLabels() {
  const tEl = document.getElementById("inspTitle");
  if (tEl) tEl.textContent = t("inspector");
}
