// js/ui.js
// ============================================================
// UI / UX Phase 1 (Canva-like)
// - Real Language Toggle (EL/EN button)
// - Tooltips (custom)
// - Floating Inspector with tabs: Style / Text / Arrange
// - Better controls: fill/stroke/width/radius/align/opacity/rotate
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
  sendToBack,
  bringForward as layerBringForward,
  sendBackward as layerSendBackward
} from "./tools.js";

import { exportDo } from "./export.js";
import { openPreview, closePreview, prev as pvPrev, next as pvNext } from "./flipbook-preview.js";

/* --------------------------------------------------
  I18N
-------------------------------------------------- */
const I18N = {
  el: {
    import: "Εισαγωγή",
    text: "Κείμενο",
    stickers: "Stickers",
    shapes: "Σχήματα",
    effects: "Εφέ",
    layers: "Επίπεδα",
    export: "Εξαγωγή",
    inspector: "Ιδιότητες",
    tabStyle: "Στυλ",
    tabText: "Κείμενο",
    tabArrange: "Τακτοποίηση",
    fill: "Γέμισμα",
    stroke: "Περίγραμμα",
    strokeW: "Πάχος",
    radius: "Γωνίες",
    opacity: "Διαφάνεια",
    rotate: "Περιστροφή",
    align: "Στοίχιση",
    left: "Αριστερά",
    center: "Κέντρο",
    right: "Δεξιά",
    font: "Γραμματοσειρά",
    size: "Μέγεθος",
    bold: "Bold",
    italic: "Italic",
    underline: "Underline",
    outline: "Outline",
    shadow: "Shadow",
    delete: "Διαγραφή",
    noSelection: "Επίλεξε ένα αντικείμενο",
    tipZoom: "Zoom (Ctrl+Wheel)",
    tipPan: "Pan (Space+Drag)",
    tipLang: "Αλλαγή γλώσσας",
    tipTheme: "Θέμα",
    tipUndo: "Undo (Ctrl+Z)",
    tipRedo: "Redo (Ctrl+Shift+Z)",
    tipPreview: "Προεπισκόπηση Flipbook",
    tipExport: "Άνοιγμα Export"
  },
  en: {
    import: "Import",
    text: "Text",
    stickers: "Stickers",
    shapes: "Shapes",
    effects: "Effects",
    layers: "Layers",
    export: "Export",
    inspector: "Inspector",
    tabStyle: "Style",
    tabText: "Text",
    tabArrange: "Arrange",
    fill: "Fill",
    stroke: "Stroke",
    strokeW: "Width",
    radius: "Radius",
    opacity: "Opacity",
    rotate: "Rotate",
    align: "Align",
    left: "Left",
    center: "Center",
    right: "Right",
    font: "Font",
    size: "Size",
    bold: "Bold",
    italic: "Italic",
    underline: "Underline",
    outline: "Outline",
    shadow: "Shadow",
    delete: "Delete",
    noSelection: "Select an object",
    tipZoom: "Zoom (Ctrl+Wheel)",
    tipPan: "Pan (Space+Drag)",
    tipLang: "Language",
    tipTheme: "Theme",
    tipUndo: "Undo (Ctrl+Z)",
    tipRedo: "Redo (Ctrl+Shift+Z)",
    tipPreview: "Flipbook Preview",
    tipExport: "Open Export"
  }
};

let lang = "el";
const tr = (k) => (I18N[lang] && I18N[lang][k]) ? I18N[lang][k] : k;

/* --------------------------------------------------
  TOOLTIP (custom)
-------------------------------------------------- */
let tipEl = null;
function ensureTooltip() {
  if (tipEl) return;
  tipEl = document.createElement("div");
  tipEl.id = "tooltip";
  tipEl.style.cssText = `
    position:fixed; z-index:99999; pointer-events:none;
    background:rgba(0,0,0,.86); color:#fff; font-size:12px;
    padding:6px 8px; border-radius:10px; transform:translate(-50%,-120%);
    display:none; max-width:260px; line-height:1.25;
  `;
  document.body.appendChild(tipEl);
}
function bindTip(el, textFn) {
  ensureTooltip();
  if (!el) return;
  el.addEventListener("mouseenter", () => { tipEl.style.display = "block"; tipEl.textContent = textFn(); });
  el.addEventListener("mousemove", (e) => { tipEl.style.left = e.clientX + "px"; tipEl.style.top = e.clientY + "px"; });
  el.addEventListener("mouseleave", () => { tipEl.style.display = "none"; });
}

/* --------------------------------------------------
  INSPECTOR
-------------------------------------------------- */
let insp = null;
let inspTab = "style";

function ensureInspector() {
  if (insp) return;

  insp = document.createElement("div");
  insp.id = "floatingInspector";
  insp.style.cssText = `
    position:fixed; right:20px; top:86px; width:320px;
    background:var(--panel); border:1px solid var(--border);
    border-radius:16px; padding:12px; z-index:6000;
    box-shadow:0 18px 45px rgba(0,0,0,.35);
    display:none;
  `;

  insp.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <div style="font-weight:800" id="inspTitle">${tr("inspector")}</div>
      <button id="inspClose" class="pill" style="padding:6px 10px;">✕</button>
    </div>

    <div style="display:flex;gap:8px;margin-top:10px;">
      <button class="pill" id="tabStyle">${tr("tabStyle")}</button>
      <button class="pill" id="tabText">${tr("tabText")}</button>
      <button class="pill" id="tabArrange">${tr("tabArrange")}</button>
    </div>

    <div id="inspEmpty" style="margin-top:12px;color:var(--muted);font-size:13px;display:none;">
      ${tr("noSelection")}
    </div>

    <div id="inspBody" style="margin-top:12px;display:grid;gap:12px;"></div>

    <button id="inspDelete" class="btn danger" style="margin-top:12px;">${tr("delete")}</button>
  `;

  document.body.appendChild(insp);

  insp.querySelector("#inspClose").onclick = () => (insp.style.display = "none");
  insp.querySelector("#inspDelete").onclick = () => deleteSelected();

  insp.querySelector("#tabStyle").onclick = () => { inspTab = "style"; renderInspector(); };
  insp.querySelector("#tabText").onclick = () => { inspTab = "text"; renderInspector(); };
  insp.querySelector("#tabArrange").onclick = () => { inspTab = "arrange"; renderInspector(); };

  // make inspector visible for selection changes
  fabricCanvas.on("selection:created", () => { insp.style.display = "block"; renderInspector(); });
  fabricCanvas.on("selection:updated", () => { insp.style.display = "block"; renderInspector(); });
  fabricCanvas.on("selection:cleared", () => { renderInspector(true); });

  // update on modifications
  fabricCanvas.on("object:modified", () => renderInspector());
}

function renderInspector(cleared = false) {
  ensureInspector();

  const title = insp.querySelector("#inspTitle");
  title.textContent = tr("inspector");

  // tab labels
  insp.querySelector("#tabStyle").textContent = tr("tabStyle");
  insp.querySelector("#tabText").textContent = tr("tabText");
  insp.querySelector("#tabArrange").textContent = tr("tabArrange");
  insp.querySelector("#inspDelete").textContent = tr("delete");

  const body = insp.querySelector("#inspBody");
  const empty = insp.querySelector("#inspEmpty");
  body.innerHTML = "";

  const obj = fabricCanvas.getActiveObject();

  if (cleared || !obj) {
    empty.style.display = "block";
    body.style.display = "none";
    return;
  }

  empty.style.display = "none";
  body.style.display = "grid";

  // highlight active tab
  ["tabStyle","tabText","tabArrange"].forEach(id => {
    const b = insp.querySelector("#"+id);
    b.style.background = (id === "tab" + cap(inspTab)) ? "var(--acc)" : "transparent";
    b.style.borderColor = "var(--border)";
    b.style.color = (id === "tab" + cap(inspTab)) ? "#fff" : "var(--text)";
  });

  if (inspTab === "style") {
    body.appendChild(rowColor(tr("fill"), getFill(obj), (v)=> { setFill(obj,v); }));
    body.appendChild(rowColor(tr("stroke"), getStroke(obj), (v)=> { setStroke(obj,v); }));
    body.appendChild(rowRange(tr("strokeW"), 0, 30, getStrokeW(obj), 1, (v)=> { setStrokeW(obj,v); }));
    if (obj.type === "rect") {
      body.appendChild(rowRange(tr("radius"), 0, 120, getRadius(obj), 1, (v)=> { setRadius(obj,v); }));
    }
    body.appendChild(rowRange(tr("opacity"), 0, 1, obj.opacity ?? 1, 0.05, (v)=> { obj.set("opacity", Number(v)); commit(); }));
    body.appendChild(rowRange(tr("rotate"), -180, 180, obj.angle ?? 0, 1, (v)=> { obj.set("angle", Number(v)); commit(); }));
  }

  if (inspTab === "text") {
    if (obj.type !== "i-text" && obj.type !== "textbox" && obj.type !== "text") {
      body.appendChild(info("—"));
      return;
    }

    body.appendChild(rowSelect(tr("font"), [
      "Arial","Georgia","Times New Roman","Verdana","Courier New","Trebuchet MS"
    ], obj.fontFamily || "Arial", (v)=> { obj.set("fontFamily", v); commit(); }));

    body.appendChild(rowRange(tr("size"), 8, 200, obj.fontSize || 40, 1, (v)=> { obj.set("fontSize", Number(v)); commit(); }));

    body.appendChild(rowButtons([
      { label: tr("bold"), on: ()=> toggle(obj,"fontWeight","bold","normal") },
      { label: tr("italic"), on: ()=> toggle(obj,"fontStyle","italic","normal") },
      { label: tr("underline"), on: ()=> { obj.set("underline", !obj.underline); commit(); } }
    ]));

    // Outline (stroke for text)
    body.appendChild(rowRange(tr("outline"), 0, 12, obj.strokeWidth || 0, 1, (v)=> {
      obj.set("strokeWidth", Number(v));
      obj.set("stroke", obj.stroke || "#000000");
      commit();
    }));

    // Shadow toggle
    body.appendChild(rowToggle(tr("shadow"), !!obj.shadow, (on)=> {
      if (on) {
        obj.set("shadow", new fabric.Shadow({ color:"rgba(0,0,0,0.35)", blur:18, offsetX:8, offsetY:8 }));
      } else {
        obj.set("shadow", null);
      }
      commit();
    }));
  }

  if (inspTab === "arrange") {
    body.appendChild(rowButtons([
      { label:"⏫", on: ()=> { bringToFront(); commit(); } },
      { label:"⬆", on: ()=> { bringForward(); commit(); } },
      { label:"⬇", on: ()=> { sendBackward(); commit(); } },
      { label:"⏬", on: ()=> { sendToBack(); commit(); } }
    ]));

    body.appendChild(rowButtons([
      { label: tr("left"), on: ()=> align(obj,"left") },
      { label: tr("center"), on: ()=> align(obj,"center") },
      { label: tr("right"), on: ()=> align(obj,"right") }
    ]));
  }

  function commit() {
    fabricCanvas.requestRenderAll();
    saveCurrentPage();
    refreshThumbnails();
  }
}

/* --------------------------------------------------
  Helpers for inspector controls
-------------------------------------------------- */
function cap(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

function info(text){
  const d=document.createElement("div");
  d.style.cssText="color:var(--muted);font-size:13px;padding:6px 4px;";
  d.textContent=text;
  return d;
}

function rowLabel(title){
  const d=document.createElement("div");
  d.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:10px;";
  const a=document.createElement("div");
  a.textContent=title;
  a.style.cssText="font-size:13px;color:var(--muted)";
  d.appendChild(a);
  return d;
}

function rowColor(title, value, onChange){
  const wrap=document.createElement("div");
  wrap.appendChild(rowLabel(title));
  const inp=document.createElement("input");
  inp.type="color";
  inp.value=toHex(value || "#000000");
  inp.style.cssText="width:100%;height:40px;border-radius:10px;border:1px solid var(--border);background:transparent;padding:0;";
  inp.oninput=(e)=> onChange(e.target.value);
  wrap.appendChild(inp);
  return wrap;
}

function rowRange(title, min, max, value, step, onChange){
  const wrap=document.createElement("div");
  const top=rowLabel(title);
  const val=document.createElement("div");
  val.style.cssText="font-size:12px;color:var(--text)";
  val.textContent=String(value);
  top.appendChild(val);
  wrap.appendChild(top);

  const inp=document.createElement("input");
  inp.type="range";
  inp.min=min; inp.max=max; inp.step=step; inp.value=value ?? 0;
  inp.oninput=(e)=> { val.textContent=e.target.value; onChange(e.target.value); };
  wrap.appendChild(inp);
  return wrap;
}

function rowToggle(title, checked, onChange){
  const wrap=document.createElement("div");
  wrap.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:10px;";
  const a=document.createElement("div");
  a.style.cssText="font-size:13px;color:var(--muted)";
  a.textContent=title;
  const inp=document.createElement("input");
  inp.type="checkbox";
  inp.checked=!!checked;
  inp.onchange=(e)=> onChange(e.target.checked);
  wrap.appendChild(a);
  wrap.appendChild(inp);
  return wrap;
}

function rowSelect(title, options, value, onChange){
  const wrap=document.createElement("div");
  wrap.appendChild(rowLabel(title));
  const sel=document.createElement("select");
  sel.style.cssText="width:100%;padding:10px 10px;border-radius:10px;border:1px solid var(--border);background:var(--btn);color:var(--text)";
  options.forEach(o=>{
    const op=document.createElement("option");
    op.value=o; op.textContent=o;
    sel.appendChild(op);
  });
  sel.value=value;
  sel.onchange=(e)=> onChange(e.target.value);
  wrap.appendChild(sel);
  return wrap;
}

function rowButtons(btns){
  const wrap=document.createElement("div");
  wrap.style.cssText="display:flex;gap:8px;flex-wrap:wrap;";
  btns.forEach(b=>{
    const x=document.createElement("button");
    x.className="pill";
    x.textContent=b.label;
    x.style.cssText="padding:8px 10px;border:1px solid var(--border);border-radius:12px;background:transparent;color:var(--text);cursor:pointer";
    x.onmouseenter=()=> (x.style.background="var(--btn)");
    x.onmouseleave=()=> (x.style.background="transparent");
    x.onclick=b.on;
    wrap.appendChild(x);
  });
  return wrap;
}

function toHex(color){
  // if already hex
  if (typeof color === "string" && color.startsWith("#")) return color;
  // fallback
  return "#000000";
}

// Fill / Stroke helpers
function getFill(obj){ return obj.fill || "#000000"; }
function setFill(obj,v){ obj.set("fill", v); commit(); }
function getStroke(obj){ return obj.stroke || "#000000"; }
function setStroke(obj,v){ obj.set("stroke", v); commit(); }
function getStrokeW(obj){ return Number(obj.strokeWidth || 0); }
function setStrokeW(obj,v){ obj.set("strokeWidth", Number(v)); commit(); }
function getRadius(obj){ return Number(obj.rx || 0); }
function setRadius(obj,v){ obj.set({ rx:Number(v), ry:Number(v) }); commit(); }

function toggle(obj, prop, onVal, offVal){
  obj.set(prop, obj.get(prop) === onVal ? offVal : onVal);
  commit();
}

function align(obj, mode){
  const cw = fabricCanvas.getWidth();
  if (mode === "left") obj.set("left", 30);
  if (mode === "center") obj.set("left", (cw - obj.getScaledWidth())/2);
  if (mode === "right") obj.set("left", cw - obj.getScaledWidth() - 30);
  commit();
}

function commit(){
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  refreshThumbnails();
}

/* --------------------------------------------------
  MAIN INIT
-------------------------------------------------- */
window.addEventListener("DOMContentLoaded", () => {
  // build inspector
  ensureInspector();
  renderInspector(true);

  // zoom label
  const zoomLbl = document.getElementById("zoomLabel");
  const updZoom = () => zoomLbl.textContent = `${Math.round(getZoom() * 100)}%`;

  document.getElementById("zoomInBtn")?.addEventListener("click", () => { setZoom(getZoom() * 1.1); updZoom(); });
  document.getElementById("zoomOutBtn")?.addEventListener("click", () => { setZoom(getZoom() / 1.1); updZoom(); });
  document.getElementById("zoomResetBtn")?.addEventListener("click", () => { resetZoom(); fitToScreen(); updZoom(); });
  document.getElementById("zoomFitBtn")?.addEventListener("click", () => { fitToScreen(); updZoom(); });

  // tooltips
  bindTip(document.getElementById("undoBtn"), () => tr("tipUndo"));
  bindTip(document.getElementById("redoBtn"), () => tr("tipRedo"));
  bindTip(document.getElementById("zoomInBtn"), () => tr("tipZoom"));
  bindTip(document.getElementById("zoomOutBtn"), () => tr("tipZoom"));
  bindTip(document.getElementById("zoomFitBtn"), () => tr("tipZoom"));
  bindTip(document.getElementById("zoomResetBtn"), () => tr("tipZoom"));
  bindTip(document.getElementById("previewFlipbookBtn"), () => tr("tipPreview"));
  bindTip(document.getElementById("exportFab"), () => tr("tipExport"));

  // language toggle button (inject next to theme toggle)
  const actions = document.querySelector(".top-actions");
  if (actions && !document.getElementById("langToggleBtn")) {
    const b = document.createElement("button");
    b.id = "langToggleBtn";
    b.className = "tb";
    b.textContent = lang.toUpperCase();
    actions.appendChild(b);

    bindTip(b, () => tr("tipLang"));
    b.onclick = () => {
      lang = lang === "el" ? "en" : "el";
      b.textContent = lang.toUpperCase();
      renderInspector();
      // update tooltip texts automatically on hover (textFn reads current lang)
    };
  }

  // size presets
  document.getElementById("sizePreset")?.addEventListener("change", (e) => {
    if (e.target.value === "CUSTOM") {
      const w = prompt("Width (px)", "1400");
      const h = prompt("Height (px)", "1400");
      if (w && h) setCanvasCustom(w, h);
    } else {
      setCanvasSizePreset(e.target.value);
    }
    updZoom();
    saveCurrentPage();
    refreshThumbnails();
  });

  // pages
  document.getElementById("prevPageBtn")?.addEventListener("click", () => { prevPage(); });
  document.getElementById("nextPageBtn")?.addEventListener("click", () => { nextPage(); });
  document.getElementById("addPageBtn")?.addEventListener("click", () => { addPage(); updatePageInfo(); refreshThumbnails(); });
  document.getElementById("dupPageBtn")?.addEventListener("click", () => { duplicatePage(); });
  document.getElementById("deletePageBtn")?.addEventListener("click", () => { deletePage(); });

  // undo/redo
  document.getElementById("undoBtn")?.addEventListener("click", undo);
  document.getElementById("redoBtn")?.addEventListener("click", redo);

  document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (e.ctrlKey && k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
    if (e.ctrlKey && (k === "y" || (k === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
  });

  // import
  const imageInput = document.getElementById("imageInput");
  const pdfInput = document.getElementById("pdfInput");
  document.getElementById("btnUploadImage")?.addEventListener("click", () => imageInput.click());
  document.getElementById("btnUploadPDF")?.addEventListener("click", () => pdfInput.click());

  imageInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) importImage(file);
    e.target.value = "";
  });

  pdfInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (file) await importPDF(file);
    e.target.value = "";
  });

  // text
  document.getElementById("addHeadingBtn")?.addEventListener("click", () => addHeading());
  document.getElementById("addBodyBtn")?.addEventListener("click", () => addBody());
  document.getElementById("addCustomTextBtn")?.addEventListener("click", () => {
    const v = prompt("Text:", "Custom text");
    addCustomText(v);
  });

  // shapes
  document.getElementById("addRectBtn")?.addEventListener("click", addRect);
  document.getElementById("addCircleBtn")?.addEventListener("click", addCircle);
  document.getElementById("addLineBtn")?.addEventListener("click", addLine);

  // effects basic controls
  document.getElementById("opacityRange")?.addEventListener("input", (e) => setOpacity(e.target.value));
  document.getElementById("shadowToggle")?.addEventListener("change", (e) => toggleShadow(e.target.checked));
  document.getElementById("deleteObjBtn")?.addEventListener("click", deleteSelected);

  // layer order buttons
  document.getElementById("bringForwardBtn")?.addEventListener("click", layerBringForward);
  document.getElementById("sendBackwardBtn")?.addEventListener("click", layerSendBackward);
  document.getElementById("bringToFrontBtn")?.addEventListener("click", bringToFront);
  document.getElementById("sendToBackBtn")?.addEventListener("click", sendToBack);

  // preview
  document.getElementById("previewFlipbookBtn")?.addEventListener("click", () => openPreview());
  document.getElementById("closePreviewBtn")?.addEventListener("click", closePreview);
  document.getElementById("pvPrev")?.addEventListener("click", pvPrev);
  document.getElementById("pvNext")?.addEventListener("click", pvNext);

  // export drawer
  const exportFab = document.getElementById("exportFab");
  const exportDrawer = document.getElementById("exportDrawer");
  document.getElementById("exportCloseBtn")?.addEventListener("click", () => exportDrawer.classList.remove("open"));
  exportFab?.addEventListener("click", () => exportDrawer.classList.add("open"));

  document.getElementById("doExportBtn")?.addEventListener("click", async () => {
    const format = document.getElementById("exportFormat").value;
    const range = document.getElementById("exportRange").value;
    const quality = Number(document.getElementById("exportQuality").value);
    await exportDo({ format, range, quality });
  });

  // keep inspector updated on selection/modifications
  fabricCanvas.on("object:added", () => { saveCurrentPage(); refreshThumbnails(); renderInspector(); });
  fabricCanvas.on("object:removed", () => { saveCurrentPage(); refreshThumbnails(); renderInspector(); });
  fabricCanvas.on("object:modified", () => { saveCurrentPage(); refreshThumbnails(); renderInspector(); });

  updZoom();
});

/* --------------------------------------------------
  Notes:
  - Stickers panel stays as-is (from your tools.js + list.json)
  - Next step we will add: palettes, gradients, real filters UI
-------------------------------------------------- */
