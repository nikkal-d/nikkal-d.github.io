// core.js
export let canvas = null;

const DRAFT_KEY = "photobook_draft_v2";
let pages = [];
let currentPage = 0;
let zoom = 1;
let _isRestoring = false;
let _saveTimer = null;

function fixFabricBaseline() {
  if (!window.fabric) return;
  const f = window.fabric;
  ["Text","IText","Textbox"].forEach((cls)=>{
    const C = f[cls];
    if (!C || !C.prototype) return;
    try { if (C.prototype.textBaseline === "alphabetical") C.prototype.textBaseline = "alphabetic"; } catch(e){}
  });
}

function sanitizeJSON(json){
  const walk = (node)=>{
    if (!node || typeof node!=="object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    for (const k of Object.keys(node)){
      const v = node[k];
      if (k==="textBaseline" && v==="alphabetical") node[k]="alphabetic";
      walk(v);
    }
  };
  walk(json);
}

export function getViewportCenter(){
  if (!canvas) return {x:0,y:0};
  const vt = canvas.viewportTransform || [1,0,0,1,0,0];
  const inv = fabric.util.invertTransform(vt);
  const cx = canvas.getWidth()/2, cy = canvas.getHeight()/2;
  const pt = fabric.util.transformPoint(new fabric.Point(cx,cy), inv);
  return {x:pt.x,y:pt.y};
}

export function getZoom(){ return zoom; }

export function applyZoom(next){
  if (!canvas) return;
  zoom = Math.max(0.1, Math.min(4, Number(next)||1));
  const center = new fabric.Point(canvas.getWidth()/2, canvas.getHeight()/2);
  canvas.zoomToPoint(center, zoom);
  canvas.requestRenderAll();
}

export function fitToScreen(){
  if (!canvas) return;
  const host = document.getElementById("canvasHost");
  if (!host) return;
  canvas.setViewportTransform([1,0,0,1,0,0]);
  canvas.setZoom(1);
  zoom = 1;

  const pad = 48;
  const availW = Math.max(200, host.clientWidth - pad);
  const availH = Math.max(200, host.clientHeight - pad);

  const s = Math.min(availW / canvas.getWidth(), availH / canvas.getHeight());
  applyZoom(s);

  const vt = canvas.viewportTransform;
  vt[4] = (availW - canvas.getWidth()*s)/2;
  vt[5] = (availH - canvas.getHeight()*s)/2;
  canvas.setViewportTransform(vt);
  canvas.requestRenderAll();
}

export function resetZoom(){
  if (!canvas) return;
  zoom = 1;
  canvas.setViewportTransform([1,0,0,1,0,0]);
  canvas.setZoom(1);
  canvas.requestRenderAll();
  fitToScreen();
}

export function setSizePreset(preset){
  if (!canvas) return;
  const presets = {
    A4P:{w:1240,h:1754},
    A4L:{w:1754,h:1240},
    SQUARE:{w:1400,h:1400},
    STORY:{w:1080,h:1920},
    HD:{w:1920,h:1080}
  };
  const p = presets[preset] || presets.A4P;
  canvas.setWidth(p.w);
  canvas.setHeight(p.h);
  canvas.setBackgroundColor("#ffffff", canvas.requestRenderAll.bind(canvas));
  fitToScreen();
  savePageNow();
}

export function addText(){
  if (!canvas) return;
  const {x,y} = getViewportCenter();
  const t = new fabric.Textbox("Text",{
    left:x, top:y, originX:"center", originY:"center",
    fontSize:44, fill:"#111", fontFamily:"Arial",
    textBaseline:"alphabetic", width:420
  });
  canvas.add(t);
  canvas.setActiveObject(t);
  canvas.requestRenderAll();
  _touch();
}

export function addRect(){
  if (!canvas) return;
  const {x,y} = getViewportCenter();
  const r = new fabric.Rect({left:x,top:y,originX:"center",originY:"center",width:320,height:220,fill:"rgba(0,0,0,.08)",stroke:"#111",strokeWidth:2});
  canvas.add(r); canvas.setActiveObject(r); canvas.requestRenderAll(); _touch();
}
export function addCircle(){
  if (!canvas) return;
  const {x,y} = getViewportCenter();
  const c = new fabric.Circle({left:x,top:y,originX:"center",originY:"center",radius:120,fill:"rgba(0,0,0,.08)",stroke:"#111",strokeWidth:2});
  canvas.add(c); canvas.setActiveObject(c); canvas.requestRenderAll(); _touch();
}
export function addLine(){
  if (!canvas) return;
  const {x,y} = getViewportCenter();
  const ln = new fabric.Line([x-220,y,x+220,y],{stroke:"#111",strokeWidth:4});
  canvas.add(ln); canvas.setActiveObject(ln); canvas.requestRenderAll(); _touch();
}

export function addImageFromFile(file){
  if (!canvas || !file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    fabric.Image.fromURL(reader.result,(img)=>{
      const {x,y} = getViewportCenter();
      img.set({left:x,top:y,originX:"center",originY:"center"});
      const maxW = canvas.getWidth()*0.6, maxH = canvas.getHeight()*0.6;
      const s = Math.min(maxW/img.width, maxH/img.height, 1);
      img.scale(s);
      canvas.add(img); canvas.setActiveObject(img); canvas.requestRenderAll(); _touch();
    },{crossOrigin:"anonymous"});
  };
  reader.readAsDataURL(file);
}

// layers
export function bringForward(){ const o=canvas?.getActiveObject(); if(!o) return; canvas.bringForward(o); canvas.requestRenderAll(); _touch(); }
export function sendBackward(){ const o=canvas?.getActiveObject(); if(!o) return; canvas.sendBackwards(o); canvas.requestRenderAll(); _touch(); }
export function bringToFront(){ const o=canvas?.getActiveObject(); if(!o) return; canvas.bringToFront(o); canvas.requestRenderAll(); _touch(); }
export function sendToBack(){ const o=canvas?.getActiveObject(); if(!o) return; canvas.sendToBack(o); canvas.requestRenderAll(); _touch(); }
export function deleteSelection(){ const o=canvas?.getActiveObject(); if(!o) return; canvas.remove(o); canvas.discardActiveObject(); canvas.requestRenderAll(); _touch(); }

// pages
function emptyPageJSON(){ return {version:fabric.version, objects:[], background:"#ffffff"}; }

export function savePageNow(){
  if (!canvas || !pages[currentPage]) return;
  const json = canvas.toJSON(["textBaseline"]);
  sanitizeJSON(json);
  pages[currentPage].json = json;
}

function loadPage(index){
  if (!canvas) return;
  const pg = pages[index];
  _isRestoring = true;
  canvas.clear();
  canvas.setBackgroundColor("#ffffff", canvas.requestRenderAll.bind(canvas));
  if (pg?.json){
    const clean = structuredClone(pg.json);
    sanitizeJSON(clean);
    canvas.loadFromJSON(clean, ()=>{
      _isRestoring = false;
      canvas.requestRenderAll();
      fitToScreen();
    });
  } else {
    _isRestoring = false;
    canvas.requestRenderAll();
    fitToScreen();
  }
}

function updatePageUI(){
  const el=document.getElementById("pageIndicator");
  if (el) el.textContent = `${currentPage+1} / ${pages.length}`;
}

export function addPage(){
  savePageNow();
  pages.push({json:emptyPageJSON()});
  currentPage = pages.length-1;
  loadPage(currentPage);
  updatePageUI();
  _saveDraftSoon();
}
export function duplicatePage(){
  savePageNow();
  const src = pages[currentPage]?.json || emptyPageJSON();
  pages.splice(currentPage+1,0,{json:structuredClone(src)});
  currentPage++;
  loadPage(currentPage);
  updatePageUI();
  _saveDraftSoon();
}
export function deletePage(){
  if (pages.length<=1) return alert("Πρέπει να υπάρχει τουλάχιστον 1 σελίδα.");
  pages.splice(currentPage,1);
  currentPage = Math.max(0,currentPage-1);
  loadPage(currentPage);
  updatePageUI();
  _saveDraftSoon();
}
export function nextPage(){ if(currentPage>=pages.length-1) return; savePageNow(); currentPage++; loadPage(currentPage); updatePageUI(); }
export function prevPage(){ if(currentPage<=0) return; savePageNow(); currentPage--; loadPage(currentPage); updatePageUI(); }

export function loadDraft(){
  try{
    const raw=localStorage.getItem(DRAFT_KEY);
    if(!raw){
      pages=[{json:emptyPageJSON()}]; currentPage=0; updatePageUI(); return;
    }
    const data=JSON.parse(raw);
    pages = Array.isArray(data.pages)&&data.pages.length? data.pages : [{json:emptyPageJSON()}];
    currentPage = Math.max(0, Math.min(data.currentPage||0, pages.length-1));
    pages.forEach(p=>p?.json && sanitizeJSON(p.json));
    loadPage(currentPage);
    updatePageUI();
  }catch(e){
    console.warn("Draft load failed", e);
    pages=[{json:emptyPageJSON()}]; currentPage=0; updatePageUI();
  }
}
export function clearDraft(){ localStorage.removeItem(DRAFT_KEY); }

function _touch(){
  if(_isRestoring) return;
  _saveDraftSoon();
  window.dispatchEvent(new CustomEvent("app:changed"));
}

function _saveDraftSoon(){
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(()=>{
    try{
      savePageNow();
      const payload = JSON.stringify({pages,currentPage});
      if (payload.length > 4_500_000) { console.warn("Draft too large, skip"); return; }
      localStorage.setItem(DRAFT_KEY, payload);
    }catch(e){
      console.warn("Draft save failed", e);
    }
  }, 800);
}

function bindPanZoom(){
  let panMode=false, isPanning=false, last={x:0,y:0};
  document.addEventListener("keydown",(e)=>{ if(e.code==="Space") panMode=true; });
  document.addEventListener("keyup",(e)=>{ if(e.code==="Space") panMode=false; });
  canvas.on("mouse:down",(opt)=>{ if(!panMode) return; isPanning=true; last={x:opt.e.clientX,y:opt.e.clientY}; });
  canvas.on("mouse:move",(opt)=>{ if(!isPanning) return; const e=opt.e; const vpt=canvas.viewportTransform; vpt[4]+=e.clientX-last.x; vpt[5]+=e.clientY-last.y; canvas.setViewportTransform(vpt); last={x:e.clientX,y:e.clientY}; });
  canvas.on("mouse:up",()=>{ isPanning=false; });
  canvas.on("mouse:wheel",(opt)=>{
    const e=opt.e;
    if(!e.ctrlKey) return;
    e.preventDefault(); e.stopPropagation();
    const factor = e.deltaY>0 ? 0.95 : 1.05;
    zoom = Math.max(0.1, Math.min(4, zoom*factor));
    const pt = new fabric.Point(e.offsetX, e.offsetY);
    canvas.zoomToPoint(pt, zoom);
    canvas.requestRenderAll();
    window.dispatchEvent(new CustomEvent("app:zoom"));
  });
}

function init(){
  if(!window.fabric){ console.error("Fabric not loaded"); return; }
  fixFabricBaseline();

  const el=document.getElementById("canvas");
  if(!el) return;

  canvas = new fabric.Canvas("canvas",{preserveObjectStacking:true, selection:true});
  canvas.setBackgroundColor("#ffffff", canvas.requestRenderAll.bind(canvas));

  setSizePreset("A4P");

  pages=[{json:emptyPageJSON()}];
  currentPage=0;
  loadDraft();

  bindPanZoom();

  const notify = ()=>window.dispatchEvent(new CustomEvent("app:selection",{detail:canvas.getActiveObject()||null}));
  canvas.on("selection:created", notify);
  canvas.on("selection:updated", notify);
  canvas.on("selection:cleared", notify);

  ["object:added","object:modified","object:removed"].forEach(ev=>canvas.on(ev, ()=>_touch()));

  window.addEventListener("resize", ()=>fitToScreen());

  window.App = window.App || {};
  window.App.canvas = canvas;

  console.log("✅ Canvas initialized");
}

window.addEventListener("DOMContentLoaded", init);
