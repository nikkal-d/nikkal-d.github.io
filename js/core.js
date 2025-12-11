/* ============================================================
   Photobook Studio — CORE MODULE
   Canvas, Pages, Thumbnails, Draft Save/Load, History
   ============================================================ */

import { auth } from "../firebase-init.js";

/* GLOBAL STATE */
export let fabricCanvas = null;
export let pages = [];
export let currentPage = 0;

// history
let undoStack = [];
let redoStack = [];
let isRestoring = false;

// draft autosave
let autosaveTimer = null;

/* ============================================================
   INITIALIZATION
   ============================================================ */

window.addEventListener("DOMContentLoaded", () => {
  // Αν δεν υπάρχει canvas στη σελίδα, δεν κάνουμε τίποτα (π.χ. viewer.html)
  const canvasEl = document.getElementById("canvas");
  if (!canvasEl) {
    return;
  }

  // Αν για κάποιο λόγο δεν φορτώθηκε το fabric.js, μην σκάσεις
  if (typeof fabric === "undefined" || !fabric.Canvas) {
    console.error("fabric.js δεν φορτώθηκε. Ο editor θα είναι ανενεργός σε αυτή τη σελίδα.");
    return;
  }

  initCanvas();
  initPageSystem();
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  initHistory();

  // φόρτωμα draft (guest ή user)
  loadDraft();
});

/* ------------------------------------------------------------ */

function initCanvas() {
  // ΠΡΟΣΟΧΗ: το canvas στο HTML πρέπει να έχει id="canvas"
  fabricCanvas = new fabric.Canvas("canvas", {
    preserveObjectStacking: true,
    selection: true,
    backgroundColor: "#ffffff"
  });
}

/* ------------------------------------------------------------ */

function resizeCanvas() {
  const wrap = document.getElementById("canvas-wrapper");
  if (!wrap || !fabricCanvas) return;

  fabricCanvas.setWidth(wrap.clientWidth);
  fabricCanvas.setHeight(wrap.clientHeight);
  fabricCanvas.requestRenderAll();
}


/* ============================================================
   HISTORY SYSTEM (GLOBAL)
   ============================================================ */

function initHistory() {
  if (!fabricCanvas) return;

  saveHistoryState("init");

  const events = ["object:added", "object:modified", "object:removed"];
  events.forEach(ev => {
    fabricCanvas.on(ev, () => {
      if (!isRestoring) {
        saveHistoryState(ev);
      }
    });
  });
}

function saveHistoryState(source = "manual") {
  if (!fabricCanvas) return;

  const json = fabricCanvas.toJSON();
  undoStack.push(json);
  if (undoStack.length > 80) undoStack.shift();
  // κάθε νέο state μηδενίζει redo
  redoStack = [];

  // κάθε σημαντική αλλαγή → draft autosave
  scheduleAutosave();
}

export function undo() {
  if (!fabricCanvas) return;
  if (undoStack.length < 2) return;

  const current = undoStack.pop();
  redoStack.push(current);

  const prev = undoStack[undoStack.length - 1];

  isRestoring = true;
  fabricCanvas.loadFromJSON(prev, () => {
    fabricCanvas.renderAll();
    isRestoring = false;
  });
}

export function redo() {
  if (!fabricCanvas) return;
  if (!redoStack.length) return;

  const next = redoStack.pop();
  undoStack.push(next);

  isRestoring = true;
  fabricCanvas.loadFromJSON(next, () => {
    fabricCanvas.renderAll();
    isRestoring = false;
  });
}


/* ============================================================
   PAGE SYSTEM
   ============================================================ */

export function initPageSystem() {
  const addBtn = document.getElementById("addPageBtn");
  const delBtn = document.getElementById("deletePageBtn");
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");

  if (addBtn) addBtn.onclick = () => addPage();
  if (delBtn) delBtn.onclick = deletePage;
  if (prevBtn) prevBtn.onclick = () => switchPage(currentPage - 1);
  if (nextBtn) nextBtn.onclick = () => switchPage(currentPage + 1);

  // αρχίζουμε με 1 κενή σελίδα
  addPage(true);
}

/* ------------------------------------------------------------ */

export function addPage(isInitial = false) {
  const pageObj = {
    json: null,
    image: null
  };

  pages.push(pageObj);

  if (!isInitial) currentPage = pages.length - 1;

  saveCurrentPage();
  refreshThumbnails();
  loadPageToCanvas();

  // νέα σελίδα → reset history για αυτή τη σελίδα
  resetHistory();
}

/* ------------------------------------------------------------ */

export function deletePage() {
  if (pages.length <= 1) {
    alert("Πρέπει να υπάρχει τουλάχιστον μία σελίδα.");
    return;
  }

  pages.splice(currentPage, 1);
  currentPage = Math.max(0, currentPage - 1);

  refreshThumbnails();
  loadPageToCanvas();
  resetHistory();
}

/* ------------------------------------------------------------ */

export function switchPage(index) {
  if (index < 0 || index >= pages.length) return;

  saveCurrentPage();
  currentPage = index;

  refreshThumbnails();
  loadPageToCanvas();
  resetHistory();
}

function resetHistory() {
  undoStack = [];
  redoStack = [];
  saveHistoryState("page-switch");
}

/* ============================================================
   SAVE + LOAD PAGE
   ============================================================ */

export function saveCurrentPage() {
  if (!fabricCanvas || !pages[currentPage]) return;

  const json = fabricCanvas.toJSON();
  const image = fabricCanvas.toDataURL({ format: "png", quality: 0.92 });

  pages[currentPage].json = json;
  pages[currentPage].image = image;

  scheduleAutosave();
}

/* ------------------------------------------------------------ */

export function loadPageToCanvas() {
  if (!fabricCanvas) return;

  const p = pages[currentPage];
  if (!p) return;

  if (p.json) {
    fabricCanvas.loadFromJSON(p.json, () => {
      fabricCanvas.renderAll();
    });
  } else {
    fabricCanvas.clear();
    fabricCanvas.renderAll();
  }
}


/* ============================================================
   THUMBNAILS
   ============================================================ */

export function refreshThumbnails() {
  const box = document.getElementById("thumbnails");
  if (!box) return;

  box.innerHTML = "";

  pages.forEach((pg, index) => {
    const div = document.createElement("div");
    div.className = "thumb" + (index === currentPage ? " active" : "");

    const img = document.createElement("img");
    img.src =
      pg.image ||
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";

    div.appendChild(img);
    div.onclick = () => switchPage(index);

    box.appendChild(div);
  });

  const info = document.getElementById("pageInfo");
  if (info) {
    info.textContent = `${currentPage + 1} / ${pages.length}`;
  }
}


/* ============================================================
   DRAFT SAVE / LOAD PER USER
   ============================================================ */

function getDraftKey() {
  const user = auth.currentUser;
  return user ? "draft_" + user.uid : "draft_guest";
}

function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveDraft, 700);
}

export function saveDraft() {
  const key = getDraftKey();

  const draft = {
    pages,
    currentPage
  };

  localStorage.setItem(key, JSON.stringify(draft));
}

/* ------------------------------------------------------------ */

export function loadDraft() {
  const key = getDraftKey();
  const raw = localStorage.getItem(key);

  if (!raw) return;

  try {
    const draft = JSON.parse(raw);
    pages = draft.pages || [];
    currentPage = draft.currentPage || 0;

    // αν για κάποιο λόγο είναι άδειο, φτιάξε σελίδα
    if (!pages.length) {
      addPage(true);
      return;
    }

    refreshThumbnails();
    loadPageToCanvas();
  } catch (err) {
    console.error("Draft load error:", err);
  }
}
