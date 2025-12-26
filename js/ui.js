// ui.js
import {
  addText, addRect, addCircle, addLine,
  addImageFromFile,
  bringForward, sendBackward, bringToFront, sendToBack, deleteSelection,
  applyZoom, resetZoom, fitToScreen, getZoom,
  setSizePreset,
  addPage, duplicatePage, deletePage, nextPage, prevPage,
  loadDraft, clearDraft
} from "./core.js";

const $ = (id)=>document.getElementById(id);

function setZoomLabel(){
  const el = $("zoomValue");
  if (!el) return;
  el.textContent = Math.round(getZoom()*100) + "%";
}

$("imageInput")?.addEventListener("change",(e)=>{
  const f = e.target.files?.[0];
  if (f) addImageFromFile(f);
  e.target.value="";
});

$("addTextBtn")?.addEventListener("click", ()=>addText());
$("addRectBtn")?.addEventListener("click", ()=>addRect());
$("addCircleBtn")?.addEventListener("click", ()=>addCircle());
$("addLineBtn")?.addEventListener("click", ()=>addLine());

$("bringForwardBtn")?.addEventListener("click", ()=>bringForward());
$("sendBackwardBtn")?.addEventListener("click", ()=>sendBackward());
$("bringToFrontBtn")?.addEventListener("click", ()=>bringToFront());
$("sendToBackBtn")?.addEventListener("click", ()=>sendToBack());
$("deleteObjBtn")?.addEventListener("click", ()=>deleteSelection());

$("zoomInBtn")?.addEventListener("click", ()=>{ applyZoom(getZoom()+0.1); setZoomLabel(); });
$("zoomOutBtn")?.addEventListener("click", ()=>{ applyZoom(getZoom()-0.1); setZoomLabel(); });
$("zoomResetBtn")?.addEventListener("click", ()=>{ resetZoom(); setZoomLabel(); });
$("fitBtn")?.addEventListener("click", ()=>{ fitToScreen(); setZoomLabel(); });

window.addEventListener("app:zoom", setZoomLabel);
window.addEventListener("DOMContentLoaded", setZoomLabel);

document.querySelectorAll("[data-size-preset]").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    setSizePreset(btn.dataset.sizePreset);
    setZoomLabel();
  });
});

$("addPageBtn")?.addEventListener("click", ()=>addPage());
$("duplicatePageBtn")?.addEventListener("click", ()=>duplicatePage());
$("deletePageBtn")?.addEventListener("click", ()=>deletePage());
$("nextPageBtn")?.addEventListener("click", ()=>nextPage());
$("prevPageBtn")?.addEventListener("click", ()=>prevPage());

$("loadDraftBtn")?.addEventListener("click", ()=>loadDraft());
$("clearDraftBtn")?.addEventListener("click", ()=>{ clearDraft(); location.reload(); });

$("themeToggleBtn")?.addEventListener("click", ()=>{
  document.body.classList.toggle("theme-dark");
});

const floatBar = $("floatToolbar");
function showFloatBar(obj){
  if (!floatBar) return;
  if (!obj) { floatBar.classList.remove("show"); return; }
  floatBar.classList.add("show");
}
window.addEventListener("app:selection",(e)=>showFloatBar(e.detail));

$("floatDeleteBtn")?.addEventListener("click", ()=>deleteSelection());
$("floatFrontBtn")?.addEventListener("click", ()=>bringToFront());
$("floatBackBtn")?.addEventListener("click", ()=>sendToBack());
