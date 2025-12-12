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

import { undo, redo } from "./core.js";

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("undoBtn")?.addEventListener("click", undo);
  document.getElementById("redoBtn")?.addEventListener("click", redo);

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      undo();
    }
    if (e.ctrlKey && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
      e.preventDefault();
      redo();
    }
  });
});
