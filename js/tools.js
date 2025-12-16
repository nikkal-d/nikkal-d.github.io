// js/tools.js
// ============================================================
// Tools layer (safe, optional).
// This file MUST NOT break the app if an element is missing.
// It adds extra actions: shapes, layers, colors (basic stubs).
// ============================================================

import { fabricCanvas, saveCurrentPage, refreshThumbnails } from "./core.js";

const $ = (id) => document.getElementById(id);

function commit() {
  if (!fabricCanvas) return;
  fabricCanvas.requestRenderAll();
  saveCurrentPage();
  refreshThumbnails();
}

// -------- Shapes (basic) --------
function addRect() {
  if (!fabricCanvas) return;
  const r = new fabric.Rect({ left: 140, top: 140, width: 260, height: 180, fill: "#ff4d4d", rx: 8, ry: 8 });
  fabricCanvas.add(r);
  fabricCanvas.setActiveObject(r);
  commit();
}
function addCircle() {
  if (!fabricCanvas) return;
  const c = new fabric.Circle({ left: 180, top: 180, radius: 90, fill: "#4d7cff" });
  fabricCanvas.add(c);
  fabricCanvas.setActiveObject(c);
  commit();
}

// -------- Layers (basic) --------
function bringForward() {
  const obj = fabricCanvas?.getActiveObject();
  if (!obj) return;
  fabricCanvas.bringForward(obj);
  commit();
}
function sendBackward() {
  const obj = fabricCanvas?.getActiveObject();
  if (!obj) return;
  fabricCanvas.sendBackwards(obj);
  commit();
}
function bringToFront() {
  const obj = fabricCanvas?.getActiveObject();
  if (!obj) return;
  fabricCanvas.bringToFront(obj);
  commit();
}
function sendToBack() {
  const obj = fabricCanvas?.getActiveObject();
  if (!obj) return;
  fabricCanvas.sendToBack(obj);
  commit();
}

// -------- Color (fill) --------
function setFill(color) {
  const obj = fabricCanvas?.getActiveObject();
  if (!obj) return;
  if (obj.set) obj.set("fill", color);
  commit();
}

// Bind buttons if they exist
document.addEventListener("DOMContentLoaded", () => {
  $("addRectBtn")?.addEventListener("click", addRect);
  $("addCircleBtn")?.addEventListener("click", addCircle);

  $("layerUpBtn")?.addEventListener("click", bringForward);
  $("layerDownBtn")?.addEventListener("click", sendBackward);
  $("layerTopBtn")?.addEventListener("click", bringToFront);
  $("layerBottomBtn")?.addEventListener("click", sendToBack);

  $("fillColor")?.addEventListener("input", (e) => setFill(e.target.value));
});


// -------- Quick export (PNG/JSON) --------
function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

function exportPNG() {
  if (!fabricCanvas) return;
  const dataUrl = fabricCanvas.toDataURL({ format: "png", quality: 0.92 });
  fetch(dataUrl).then(r => r.blob()).then(b => downloadBlob(b, "page.png"));
}

function exportJSON() {
  if (!fabricCanvas) return;
  const json = fabricCanvas.toJSON();
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
  downloadBlob(blob, "canvas.json");
}

function importJSONFile(file) {
  if (!fabricCanvas || !file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const json = JSON.parse(String(r.result || "{}"));
      fabricCanvas.loadFromJSON(json, () => {
        fabricCanvas.renderAll();
        commit();
      });
    } catch (e) {
      alert("Άκυρο JSON");
      console.error(e);
    }
  };
  r.readAsText(file);
}

document.addEventListener("DOMContentLoaded", () => {
  $("exportPngBtn")?.addEventListener("click", exportPNG);
  $("exportJsonBtn")?.addEventListener("click", exportJSON);

  $("importJsonBtn")?.addEventListener("click", () => $("importJsonInput")?.click());
  $("importJsonInput")?.addEventListener("change", (e) => {
    const f = e.target?.files?.[0];
    if (f) importJSONFile(f);
    e.target.value = "";
  });
});
