/* ============================================================
   PHOTObook Studio — VIEWER MODULE
   Online Flipbook Viewer (Firestore + Storage)
   ============================================================ */

import { db } from "../firebase-init.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const titleEl = document.getElementById("title");
const pagesContainer = document.getElementById("flipbook-pages");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");

let pages = [];
let current = 0;

/* ------------------------------------------------------------
   Read ID from URL
   ------------------------------------------------------------ */
const params = new URLSearchParams(location.search);
const id = params.get("id");

if (!id) {
  titleEl.textContent = "Σφάλμα: Δεν βρέθηκε ID.";
} else {
  loadPhotobook(id);
}

/* ============================================================
   LOAD FROM FIRESTORE
   ============================================================ */

async function loadPhotobook(id) {
  try {
    const refDoc = doc(db, "photobooks", id);
    const snap = await getDoc(refDoc);

    if (!snap.exists()) {
      titleEl.textContent = "Το photobook δεν υπάρχει.";
      return;
    }

    const data = snap.data();
    pages = data.pages || [];

    titleEl.textContent = data.title || "Photobook";

    renderPages();
  } catch (err) {
    console.error(err);
    titleEl.textContent = "Σφάλμα φόρτωσης.";
  }
}

/* ============================================================
   RENDER PAGES
   ============================================================ */

function renderPages() {
  pagesContainer.innerHTML = "";

  pages.forEach((url, i) => {
    const div = document.createElement("div");
    div.classList.add("page");
    if (i === 0) div.classList.add("active");

    div.innerHTML = `<img src="${url}" alt="page ${i+1}">`;

    pagesContainer.appendChild(div);
  });
}

/* ============================================================
   PAGE SWITCHING
   ============================================================ */

function showPage(i) {
  const all = document.querySelectorAll(".page");
  if (!all.length) return;

  if (i < 0 || i >= all.length) return;

  all[current].classList.remove("active");
  current = i;
  all[current].classList.add("active");
}

prevBtn.onclick = () => showPage(current - 1);
nextBtn.onclick = () => showPage(current + 1);

/* ============================================================
   KEYBOARD ARROWS
   ============================================================ */

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") showPage(current - 1);
  if (e.key === "ArrowRight") showPage(current + 1);
});

/* ============================================================
   FULLSCREEN
   ============================================================ */

fullscreenBtn.onclick = () => {
  const elem = document.body;

  if (!document.fullscreenElement) {
    elem.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
};
