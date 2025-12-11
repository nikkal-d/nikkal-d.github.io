/* ============================================================
   PHOTObook Studio — UI MODULE
   Theme • Tabs • Keyboard Shortcuts • Undo/Redo
   ============================================================ */

import { fabricCanvas, saveCurrentPage } from "./core.js";

/* ------------------------------------------------------------
   INIT ALL UI HANDLERS
   ------------------------------------------------------------ */
window.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initTabs();
  initKeyboardShortcuts();
  initUndoRedo();
});

/* ============================================================
   THEME TOGGLE
   ============================================================ */

function initThemeToggle() {
  const btn = document.getElementById("themeToggleBtn");
  let current = localStorage.getItem("theme") || "dark";

  document.documentElement.setAttribute("data-theme", current);

  if (!btn) {
    // αν δεν υπάρχει κουμπί, απλά μην κάνεις τίποτα άλλο
    return;
  }

  btn.textContent = current === "dark" ? "☾" : "☀";

  btn.onclick = () => {
    current = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", current);
    btn.textContent = current === "dark" ? "☾" : "☀";
    localStorage.setItem("theme", current);
  };
}

/* ============================================================
   TABS SYSTEM
   ============================================================ */

function initTabs() {
  const btns = document.querySelectorAll(".tab-btns button");
  const tabs = document.querySelectorAll(".tab");

  // αν δεν υπάρχουν tabs, απλά μην κάνεις τίποτα
  if (!btns.length || !tabs.length) return;

  btns.forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-tab");

      tabs.forEach(t => t.classList.remove("active"));
      btns.forEach(b => b.classList.remove("active"));

      btn.classList.add("active");
      const tabEl = document.getElementById("tab-" + id);
      if (tabEl) tabEl.classList.add("active");
    };
  });

  // start with first tab open (αν υπάρχει)
  if (btns[0]) btns[0].click();
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */

function initKeyboardShortcuts() {
  if (!fabricCanvas) return;

  document.addEventListener("keydown", (e) => {
    const obj = fabricCanvas.getActiveObject();

    // DELETE
    if (e.key === "Delete" && obj) {
      fabricCanvas.remove(obj);
      fabricCanvas.requestRenderAll();
      saveCurrentPage();
    }

    // COPY
    if (e.ctrlKey && e.key === "c" && obj) {
      fabricCanvas._clipboard = obj.clone();
    }

    // PASTE
    if (e.ctrlKey && e.key === "v" && fabricCanvas._clipboard) {
      fabricCanvas._clipboard.clone((clone) => {
        clone.left += 20;
        clone.top += 20;
        fabricCanvas.add(clone);
        fabricCanvas.setActiveObject(clone);
        fabricCanvas.requestRenderAll();
        saveCurrentPage();
      });
    }

    // MOVE OBJECT
    if (obj) {
      const step = 5;

      switch (e.key) {
        case "ArrowUp":
          obj.top -= step;
          break;
        case "ArrowDown":
          obj.top += step;
          break;
        case "ArrowLeft":
          obj.left -= step;
          break;
        case "ArrowRight":
          obj.left += step;
          break;
        default:
          return;
      }

      obj.setCoords();
      fabricCanvas.requestRenderAll();
      saveCurrentPage();
    }
  });
}

/* ============================================================
   UNDO / REDO (απλό, ανεξάρτητο από core.js history)
   ============================================================ */

let undoStack = [];
let redoStack = [];

function initUndoRedo() {
  if (!fabricCanvas) return;

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "z") doUndo();
    if (e.ctrlKey && e.key === "y") doRedo();
  });

  fabricCanvas.on("object:added", saveState);
  fabricCanvas.on("object:modified", saveState);
  fabricCanvas.on("object:removed", saveState);

  saveState(); // initial
}

function saveState() {
  if (!fabricCanvas) return;
  const json = fabricCanvas.toJSON();
  undoStack.push(json);

  if (undoStack.length > 40) undoStack.shift();
  redoStack = [];
}

function doUndo() {
  if (!fabricCanvas) return;
  if (undoStack.length < 2) return;

  const current = undoStack.pop();
  redoStack.push(current);

  const prev = undoStack[undoStack.length - 1];

  fabricCanvas.loadFromJSON(prev, () => {
    fabricCanvas.renderAll();
  });
}

function doRedo() {
  if (!fabricCanvas) return;
  if (!redoStack.length) return;

  const next = redoStack.pop();
  undoStack.push(next);

  fabricCanvas.loadFromJSON(next, () => {
    fabricCanvas.renderAll();
  });
}
