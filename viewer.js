/* ============================================================
   PHOTObook Viewer — Public / Private / Share
   ============================================================ */

import {
  auth,
  db,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "./firebase-init.js";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ---------- DOM ---------- */
const viewerUserLabel = document.getElementById("viewer-user-label");
const loginBtn = document.getElementById("viewer-login-btn");
const logoutBtn = document.getElementById("viewer-logout-btn");
const themeToggleBtn = document.getElementById("themeToggleBtn");

const loginModal = document.getElementById("loginModal");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const loginCloseBtn = document.getElementById("loginCloseBtn");

const viewerContainer = document.getElementById("viewerContainer");
const flipbookEl = document.getElementById("flipbook");
const pageIndicator = document.getElementById("pageIndicator");

const privateMessage = document.getElementById("privateMessage");
const notFoundMessage = document.getElementById("notFoundMessage");

const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const downloadFlipbookBtn = document.getElementById("downloadFlipbookBtn");

/* ---------- STATE ---------- */
let MODE = "id";     // "id" or "share"
let DOC_ID = null;
let SHARE_ID = null;
let BOOK_DATA = null;
let PAGES = [];
let CURRENT_INDEX = 0;

/* ============================================================
   THEME
   ============================================================ */
function applyTheme(theme) {
  document.body.classList.remove("light", "dark");
  document.body.classList.add(theme);
  localStorage.setItem("viewer-theme", theme);
  themeToggleBtn.textContent = theme === "dark" ? "🌙" : "☀️";
}

const savedTheme = localStorage.getItem("viewer-theme");
if (savedTheme) {
  applyTheme(savedTheme);
} else {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(prefersDark ? "dark" : "light");
}

themeToggleBtn.onclick = () => {
  const newTheme = document.body.classList.contains("dark") ? "light" : "dark";
  applyTheme(newTheme);
};

/* ============================================================
   URL PARAMS
   ============================================================ */
const params = new URLSearchParams(location.search);

if (params.has("id")) {
  MODE = "id";
  DOC_ID = params.get("id");
} else if (params.has("share")) {
  MODE = "share";
  SHARE_ID = params.get("share");
} else {
  notFoundMessage.style.display = "block";
}

/* ============================================================
   LOGIN MODAL
   ============================================================ */
function openLoginModal() {
  loginModal.style.display = "flex";
}
function closeLoginModal() {
  loginModal.style.display = "none";
}

loginBtn.onclick = () => openLoginModal();
loginCloseBtn.onclick = () => closeLoginModal();

logoutBtn.onclick = async () => {
  await signOut(auth);
  location.reload();
};

loginSubmitBtn.onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
    closeLoginModal();
  } catch (err) {
    alert("Σφάλμα σύνδεσης: " + err.message);
  }
};

/* ============================================================
   AUTH + LOAD BOOK
   ============================================================ */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    viewerUserLabel.textContent = user.email;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    viewerUserLabel.textContent = "Guest";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }

  await loadPhotobook(user);
});

async function loadPhotobook(user) {
  try {
    let snap;

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
      DOC_ID = snap.id;
    }

    if (MODE === "id") {
      snap = await getDoc(doc(db, "photobooks", DOC_ID));
      if (!snap.exists()) {
        notFoundMessage.style.display = "block";
        return;
      }
    }

    BOOK_DATA = snap.data();
    const isPublic = BOOK_DATA.isPublic;
    const ownerId = BOOK_DATA.userId;

    // share mode → πάντα επιτρέπουμε
    if (MODE === "share") {
      initViewer();
      return;
    }

    // public book → επιτρέπεται σε όλους
    if (isPublic) {
      initViewer();
      return;
    }

    // private → μόνο owner
    if (user && user.uid === ownerId) {
      initViewer();
      return;
    }

    // αλλιώς → ιδιωτικό
    privateMessage.style.display = "block";

  } catch (err) {
    console.error(err);
    notFoundMessage.style.display = "block";
  }
}

/* ============================================================
   VIEWER INIT
   ============================================================ */
function initViewer() {
  notFoundMessage.style.display = "none";
  privateMessage.style.display = "none";

  PAGES = BOOK_DATA.pages || [];
  if (!PAGES.length) {
    notFoundMessage.style.display = "block";
    return;
  }

  viewerContainer.style.display = "block";
  renderPage(0);

  prevPageBtn.onclick = () => changePage(-1);
  nextPageBtn.onclick = () => changePage(1);

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") changePage(-1);
    if (e.key === "ArrowRight") changePage(1);
  });

  downloadFlipbookBtn.onclick = downloadOfflineFlipbook;
}

/* ============================================================
   PAGE RENDERING
   ============================================================ */
function renderPage(index) {
  if (index < 0 || index >= PAGES.length) return;
  CURRENT_INDEX = index;

  flipbookEl.innerHTML = `<img src="${PAGES[index]}">`;
  pageIndicator.textContent = `Σελίδα ${index + 1} από ${PAGES.length}`;
}

function changePage(delta) {
  const nextIndex = CURRENT_INDEX + delta;
  if (nextIndex < 0 || nextIndex >= PAGES.length) return;
  renderPage(nextIndex);
}

/* ============================================================
   DOWNLOAD OFFLINE FLIPBOOK (.html)
   ============================================================ */
function downloadOfflineFlipbook() {
  const base64Pages = [...PAGES];

  const html = `
<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="UTF-8">
<title>My Photobook</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body {
  margin:0;
  background:#0f172a;
  color:#e5e7eb;
  font-family:system-ui,sans-serif;
  display:flex;
  flex-direction:column;
  align-items:center;
  padding-top:30px;
}
#page {
  max-width:900px;
  max-height:600px;
  box-shadow:0 0 24px rgba(0,0,0,0.6);
  border-radius:16px;
  overflow:hidden;
}
#page img {
  width:100%;
  height:100%;
  object-fit:contain;
}
.controls {
  margin-top:12px;
  display:flex;
  gap:8px;
}
button {
  padding:8px 16px;
  border-radius:999px;
  border:none;
  cursor:pointer;
  background:#1f2937;
  color:#e5e7eb;
}
button:hover { background:#374151; }
#indicator {
  margin-top:8px;
  opacity:0.8;
}
</style>
</head>
<body>
<h2>Photobook (Offline)</h2>
<div id="page"></div>
<div id="indicator"></div>
<div class="controls">
  <button onclick="prevPage()">⬅ Προηγούμενη</button>
  <button onclick="nextPage()">Επόμενη ➡</button>
</div>
<script>
const pages = ${JSON.stringify(base64Pages)};
let index = 0;
function render(){
  const box = document.getElementById("page");
  const ind = document.getElementById("indicator");
  box.innerHTML = '<img src="'+pages[index]+'">';
  ind.textContent = "Σελίδα " + (index+1) + " από " + pages.length;
}
function prevPage(){ if(index>0){index--;render();} }
function nextPage(){ if(index<pages.length-1){index++;render();} }
document.addEventListener("keydown", e=>{
  if(e.key==="ArrowLeft") prevPage();
  if(e.key==="ArrowRight") nextPage();
});
window.onload = render;
</script>
</body>
</html>
`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "photobook-offline.html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}
