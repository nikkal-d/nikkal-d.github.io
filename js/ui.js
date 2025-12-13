// ================= UI STATE =================
const UIState = {
  leftPanel: null,
  rightPanelOpen: false,
  language: "el",
  user: null
};

// ================= HELPERS =================
function qs(sel) {
  return document.querySelector(sel);
}
function qsa(sel) {
  return document.querySelectorAll(sel);
}

// ================= LEFT SIDEBAR =================
const leftPanelsWrap = qs("#leftPanels");
const leftPanels = qsa(".panel");

qsa(".sidebar button").forEach(btn => {
  btn.addEventListener("click", () => {
    const panel = btn.dataset.panel;
    toggleLeftPanel(panel);
  });
});

function toggleLeftPanel(panelName) {
  if (UIState.leftPanel === panelName) {
    // close
    UIState.leftPanel = null;
    leftPanelsWrap.classList.remove("open");
    leftPanels.forEach(p => p.classList.remove("active"));
    return;
  }

  UIState.leftPanel = panelName;
  leftPanelsWrap.classList.add("open");
  leftPanels.forEach(p => {
    p.classList.toggle("active", p.dataset.panel === panelName);
  });
}

// ================= RIGHT EXPORT PANEL =================
const exportPanel = qs(".export-panel");

const exportToggleBtn = qs("#toggleExport"); // κουμπί που θα υπάρχει στο topbar
if (exportToggleBtn) {
  exportToggleBtn.addEventListener("click", () => {
    UIState.rightPanelOpen = !UIState.rightPanelOpen;
    exportPanel.classList.toggle("open", UIState.rightPanelOpen);
  });
}

// ================= LANGUAGE =================
const i18n = {
  el: {
    images: "Εικόνες",
    pdf: "PDF",
    text: "Κείμενο",
    shapes: "Σχήματα",
    layers: "Επίπεδα",
    export: "Εξαγωγή",
    login: "Σύνδεση",
    logout: "Αποσύνδεση"
  },
  en: {
    images: "Images",
    pdf: "PDF",
    text: "Text",
    shapes: "Shapes",
    layers: "Layers",
    export: "Export",
    login: "Login",
    logout: "Logout"
  }
};

function applyLanguage(lang) {
  UIState.language = lang;
  qsa("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (i18n[lang][key]) {
      el.textContent = i18n[lang][key];
    }
  });
}

// toggle language button (αν υπάρχει)
const langBtn = qs("#toggleLang");
if (langBtn) {
  langBtn.addEventListener("click", () => {
    applyLanguage(UIState.language === "el" ? "en" : "el");
  });
}

// ================= LOGIN (AUTH HOOK) =================
import { login, register, logout, onAuthChange } from "./auth.js";

import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const loginBtn = qs("#btnLogin");
const provider = new GoogleAuthProvider();

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    if (UIState.user) {
      await signOut(auth);
    } else {
      await signInWithPopup(auth, provider);
    }
  });
}

onAuthStateChanged(auth, user => {
  UIState.user = user;
  if (loginBtn) {
    loginBtn.textContent = user
      ? i18n[UIState.language].logout
      : i18n[UIState.language].login;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const userInfo = document.getElementById("userInfo");

  loginBtn?.addEventListener("click", async () => {
    // προσωρινό demo
    await login("demo@test.com", "123456");
  });

  logoutBtn?.addEventListener("click", async () => {
    await logout();
  });

  onAuthChange(user => {
    if (user) {
      userInfo.textContent = user.displayName || user.email;
      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-flex";
    } else {
      userInfo.textContent = "";
      loginBtn.style.display = "inline-flex";
      logoutBtn.style.display = "none";
    }
  });
});
