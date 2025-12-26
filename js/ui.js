// js/ui.js
import {
  initCanvas,
  addText, addRect, addImageFromFile, removeSelected,
  undo, redo,
  addPage, duplicatePage, deletePage, nextPage, prevPage, goToPage, getPageInfo,
  getZoom, setZoom, resetZoom, fitToScreen,
  applyPreset, applySize,
  downloadFlipbookHTML, buildFlipbookHTML,
  saveCurrentPage
} from "./core.js";

function $(id){ return document.getElementById(id); }

window.addEventListener("DOMContentLoaded", () => {
  initCanvas();
  bindLeftPanels();
  bindToolbar();
  bindPagesUI();
  bindZoomUI();
  bindSizeUI();
  bindExportUI();
  refreshUI();
});

// -------- Left sidebar panels (open/close) --------
function bindLeftPanels(){
  document.querySelectorAll(".sidebar button[data-view]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const view = btn.dataset.view;
      document.querySelectorAll(".panel-container").forEach(p=>{
        p.classList.toggle("open", p.dataset.view === view ? !p.classList.contains("open") : false);
        if(p.dataset.view !== view) p.classList.remove("open");
      });
    });
  });
}

// -------- Toolbar / quick actions --------
function bindToolbar(){
  $("addTextBtn")?.addEventListener("click", ()=> addText());
  $("addRectBtn")?.addEventListener("click", ()=> addRect());
  $("deleteObjBtn")?.addEventListener("click", ()=> removeSelected());
  $("undoBtn")?.addEventListener("click", ()=> undo());
  $("redoBtn")?.addEventListener("click", ()=> redo());

  // image import (both sidebar and hidden input)
  const imgInput = $("imageInput");
  imgInput?.addEventListener("change", (e)=>{
    const f = e.target.files?.[0];
    if(f) addImageFromFile(f);
    e.target.value = "";
  });
  $("pickImageBtn")?.addEventListener("click", ()=> imgInput?.click());
}

// -------- Pages --------
function bindPagesUI(){
  $("addPageBtn")?.addEventListener("click", ()=>{ addPage(); refreshUI(); });
  $("dupPageBtn")?.addEventListener("click", ()=>{ duplicatePage(); refreshUI(); });
  $("delPageBtn")?.addEventListener("click", ()=>{
    const ok = deletePage();
    if(!ok) alert("Πρέπει να υπάρχει τουλάχιστον 1 σελίδα.");
    refreshUI();
  });
  $("prevPageBtn")?.addEventListener("click", ()=>{ prevPage(); refreshUI(); });
  $("nextPageBtn")?.addEventListener("click", ()=>{ nextPage(); refreshUI(); });
}

// -------- Zoom --------
function bindZoomUI(){
  const inc = ()=>{ setZoom(getZoom() + 0.1); refreshZoomLabel(); };
  const dec = ()=>{ setZoom(getZoom() - 0.1); refreshZoomLabel(); };

  $("zoomInBtn")?.addEventListener("click", inc);
  $("zoomOutBtn")?.addEventListener("click", dec);
  $("zoomResetBtn")?.addEventListener("click", ()=>{ resetZoom(); fitToScreen(); refreshZoomLabel(); });
  $("zoomFitBtn")?.addEventListener("click", ()=>{ fitToScreen(); refreshZoomLabel(); });
}

// -------- Sizes --------
function bindSizeUI(){
  document.querySelectorAll("[data-size-preset]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      applyPreset(btn.dataset.sizePreset);
      refreshZoomLabel();
    });
  });

  $("applyCustomSizeBtn")?.addEventListener("click", ()=>{
    const w = Number($("customW")?.value || 1240);
    const h = Number($("customH")?.value || 1754);
    applySize(w, h, /*keepObjects*/ true);
    refreshZoomLabel();
  });
}

// -------- Export / Preview --------
function bindExportUI(){
  // right export drawer
  $("toggleExport")?.addEventListener("click", ()=>{
    $("exportPanel")?.classList.toggle("open");
  });

  // preview
  $("previewFlipbookBtn")?.addEventListener("click", ()=>{
    saveCurrentPage();
    const orientation = $("flipOrientation")?.value || "horizontal";
    const title = $("flipTitle")?.value || "My Flipbook";
    const html = buildFlipbookHTML({ title, orientation });
    openPreview(html);
  });

  // export html
  $("exportFlipbookBtn")?.addEventListener("click", ()=>{
    const orientation = $("flipOrientation")?.value || "horizontal";
    const title = $("flipTitle")?.value || "My Flipbook";
    downloadFlipbookHTML({ title, orientation });
    alert("✅ Έγινε export σε HTML. Αν το ανεβάσεις σε GitHub Pages / Hosting, το link θα είναι shareable σαν flipbook.");
  });
}

function openPreview(html){
  const modal = $("flipPreviewModal");
  const frame = $("flipPreviewFrame");
  if(!modal || !frame) return;

  frame.srcdoc = html;
  modal.classList.add("open");
  $("closeFlipPreview")?.addEventListener("click", ()=> modal.classList.remove("open"), { once:true });
}

// -------- UI refresh helpers --------
function refreshUI(){
  refreshZoomLabel();
  refreshPageInfo();
  refreshThumbs();
}

function refreshZoomLabel(){
  const z = Math.round(getZoom()*100);
  if($("zoomValue")) $("zoomValue").textContent = z + "%";
}

function refreshPageInfo(){
  const info = getPageInfo();
  if($("pageInfo")) $("pageInfo").textContent = `${info.current + 1} / ${info.total}`;
}

function refreshThumbs(){
  const strip = $("thumbStrip");
  if(!strip) return;

  // Ask core for cached thumbs
  import("./core.js").then(mod=>{
    const thumbs = mod.getThumbnails?.() || [];
    const info = mod.getPageInfo?.() || {current:0,total:thumbs.length};

    strip.innerHTML = "";
    thumbs.forEach((src, i)=>{
      const d = document.createElement("div");
      d.className = "thumb" + (i === info.current ? " active" : "");
      const im = document.createElement("img");
      im.src = src || "";
      im.alt = "page " + (i+1);
      d.appendChild(im);
      d.addEventListener("click", ()=>{
        goToPage(i);
        refreshUI();
      });
      strip.appendChild(d);
    });
  });
}
import { exportFlipbook } from "./core.js";

document.getElementById("exportFlipbookBtn")?.addEventListener("click", () => {
  exportFlipbook();
});
