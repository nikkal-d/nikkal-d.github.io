/* ============================================================
   PHOTObOOK VIEWER — PUBLIC / PRIVATE ACCESS SYSTEM
   ============================================================ */

import {
  auth,
  db,
  storage,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "./firebase-init.js";

import {
  doc,
  getDoc,
  query,
  collection,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  ref,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

/* -----------------------------
   DOM ELEMENTS
------------------------------ */
const viewerUserLabel = document.getElementById("viewer-user-label");
const loginBtn = document.getElementById("viewer-login-btn");
const logoutBtn = document.getElementById("viewer-logout-btn");

const loginModal = document.getElementById("loginModal");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");

const viewerContainer = document.getElementById("viewerContainer");
const flipbookEl = document.getElementById("flipbook");

const privateMessage = document.getElementById("privateMessage");
const notFoundMessage = document.getElementById("notFoundMessage");

const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");

/* -----------------------------
   STATE
------------------------------ */

let MODE = "id";        // "id" = owner mode, "share" = public mode
let DOC_ID = null;      // Firestore doc id
let SHARE_ID = null;    // share link id
let BOOK_DATA = null;   // Firestore book data
let PAGES = [];         // array of image URLs
let CURRENT_INDEX = 0;  // flipbook pointer

/* -----------------------------
   PARSE URL PARAMETERS
------------------------------ */
const params = new URLSearchParams(location.search);

if (params.has("id")) {
  MODE = "id";
  DOC_ID = params.get("id");
} 
else if (params.has("share")) {
  MODE = "share";
  SHARE_ID = params.get("share");
} 
else {
  notFoundMessage.style.display = "block";
}

/* -----------------------------
   LOGIN MODAL HANDLERS
------------------------------ */

export function openLoginModal() {
  loginModal.style.display = "flex";
}

export function closeLoginModal() {
  loginModal.style.display = "none";
}

/* -----------------------------
   LOGIN BUTTON
------------------------------ */
loginBtn.onclick = () => openLoginModal();

logoutBtn.onclick = async () => {
  await signOut(auth);
  location.reload();
};

loginSubmitBtn.onclick = async () => {
  try {
    await signInWithEmailAndPassword(
      auth,
      loginEmail.value,
      loginPassword.value
    );
    closeLoginModal();
  } catch (err) {
    alert("Σφάλμα σύνδεσης: " + err.message);
  }
};
/* ============================================================
   FIRESTORE LOAD + ACCESS VALIDATION
   ============================================================ */

onAuthStateChanged(auth, async (user) => {
  if (user) {
    viewerUserLabel.textContent = user.email;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    viewerUserLabel.textContent = "Guest";
    logoutBtn.style.display = "none";
    loginBtn.style.display = "inline-block";
  }

  // Τώρα που ξέρουμε αν είναι συνδεδεμένος, συνεχίζουμε
  loadPhotobook(user);
});


async function loadPhotobook(user) {
  try {
    let snap;

    /* ----------------------------------------
       1) SHARE MODE  —  viewer.html?share=xxxx
       ---------------------------------------- */
    if (MODE === "share") {
      const q = query(
        collection(db, "photobooks"),
        where("shareId", "==", SHARE_ID)
      );

      const results = await getDocs(q);

      if (results.empty) {
        notFoundMessage.style.display = "block";
        return;
      }

      snap = results.docs[0];
      DOC_ID = snap.id; // save docId internally
    }

    /* ----------------------------------------
       2) OWNER MODE  —  viewer.html?id=xxxx
       ---------------------------------------- */
    if (MODE === "id") {
      snap = await getDoc(doc(db, "photobooks", DOC_ID));

      if (!snap.exists()) {
        notFoundMessage.style.display = "block";
        return;
      }
    }

    BOOK_DATA = snap.data();

    /* ----------------------------------------
       ACCESS CONTROL
       ---------------------------------------- */

    const isPublic = BOOK_DATA.isPublic;
    const ownerId = BOOK_DATA.userId;

    // share mode bypasses everything
    if (MODE === "share") {
      initViewer();
      return;
    }

    // If the photobook is public → always allow
    if (isPublic) {
      initViewer();
      return;
    }

    // If private: only owner may enter
    if (user && user.uid === ownerId) {
      initViewer();
      return;
    }

    // Otherwise: DENY
    privateMessage.style.display = "block";

  } catch (err) {
    console.error(err);
    notFoundMessage.style.display = "block";
  }
}

/* ============================================================
   INITIALIZE VIEWER AFTER ACCESS APPROVAL
   ============================================================ */

async function initViewer() {
  // hide messages
  notFoundMessage.style.display = "none";
  privateMessage.style.display = "none";

  viewerContainer.style.display = "block";

  // load pages
  PAGES = BOOK_DATA.pages || [];

  if (!PAGES.length) {
    notFoundMessage.style.display = "block";
    return;
  }

  initFlipbook();

  // Button events
prevPageBtn.onclick = () => $("#flipbook").turn("previous");
nextPageBtn.onclick = () => $("#flipbook").turn("next");

}

/* ============================================================
   RENDER SPECIFIC PAGE
   ============================================================ */

function renderPage(index) {
  if (index < 0 || index >= PAGES.length) return;

  CURRENT_INDEX = index;

  flipbookEl.innerHTML = `
    <img src="${PAGES[index]}" 
         style="max-width:90%; border-radius:12px; box-shadow:0 0 20px rgba(0,0,0,0.4);">
    <div style="margin-top:10px; opacity:0.7;">
      Σελίδα ${index + 1} από ${PAGES.length}
    </div>
  `;
}

/* ============================================================
   TURN.JS FLIPBOOK INITIALIZATION
   ============================================================ */

function initFlipbook() {
  flipbookEl.innerHTML = "";

  // Add all pages
  PAGES.forEach(url => {
    const page = document.createElement("div");
    page.className = "flip-page";
    page.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`;
    flipbookEl.appendChild(page);
  });

  // Initialize turn.js
  $("#flipbook").turn({
    width: 900,
    height: 600,
    autoCenter: true,
    elevation: 50,
    gradients: true,
    duration: 800
  });
}


/* ============================================================
   CHANGE PAGE
   ============================================================ */
function changePage(direction) {
  const newIndex = CURRENT_INDEX + direction;

  if (newIndex < 0 || newIndex >= PAGES.length) return;

  renderPage(newIndex);
}

/* ============================================================
   PRELOAD IMAGES (optional performance trick)
   ============================================================ */
function preloadImages() {
  PAGES.forEach(url => {
    const img = new Image();
    img.src = url;
  });
}

