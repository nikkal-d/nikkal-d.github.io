// js/ui.js
// ============================================================
// UI bindings for Photobook Studio (NO legacy calls)
// ============================================================

import { fabricCanvas, undo, redo } from "./core.js";

/* ============================================================
   UNDO / REDO
   ============================================================ */

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("undoBtn")?.addEventListener("click", undo);
  document.getElementById("redoBtn")?.addEventListener("click", redo);

  document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
    }
    if (
      e.ctrlKey &&
      (e.key.toLowerCase() === "y" ||
        (e.shiftKey && e.key.toLowerCase() === "z"))
    ) {
      e.preventDefault();
      redo();
    }
  });
});

/* ============================================================
   LAYERS PANEL
   ============================================================ */

function updateLayersPanel() {
  const box = document.getElementById("layersList");
  if (!box || !fabricCanvas) return;

  box.innerHTML = "";

  const objects = fabricCanvas.getObjects().slice().reverse();

  if (!objects.length) {
    box.textContent = "Κανένα αντικείμενο";
    return;
  }

  objects.forEach(obj => {
    const item = document.createElement("div");
    item.textContent = obj.type;
    item.style.padding = "6px";
    item.style.cursor = "pointer";
    item.style.borderBottom = "1px solid #444";

    item.onclick = () => {
      fabricCanvas.setActiveObject(obj);
      fabricCanvas.requestRenderAll();
    };

    box.appendChild(item);
  });
}

/* ============================================================
   BIND LAYER EVENTS
   ============================================================ */

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (!fabricCanvas) return;

    fabricCanvas.on("object:added", updateLayersPanel);
    fabricCanvas.on("object:removed", updateLayersPanel);
    fabricCanvas.on("object:modified", updateLayersPanel);
    fabricCanvas.on("selection:created", updateLayersPanel);
    fabricCanvas.on("selection:updated", updateLayersPanel);

    updateLayersPanel();
  }, 500);
});
