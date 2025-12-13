// js/ui.js
// ---------------------------------------------
// UI CONTROLLER
// ---------------------------------------------
import { setZoom, resetZoom, getZoom } from "./core.js";

import { login, logout, onAuthChange } from "./auth.js";

// -----------------------------
// LEFT SIDEBAR (PANELS)
// -----------------------------

document.querySelectorAll(".sidebar button").forEach(btn => {
  btn.addEventListener("click", () => {
    const panelName = btn.dataset.panel;
    toggleLeftPanel(panelName);
  });
});

function toggleLeftPanel(panelName) {
  const containers = document.querySelectorAll(".panel-container");

  containers.forEach(c => {
    if (c.id === `panel-${panelName}`) {
      c.classList.toggle("open");
    } else {
      c.classList.remove("open");
    }
  });
}

// -----------------------------
// RIGHT EXPORT PANEL
// -----------------------------

const exportPanel = document.getElementById("exportPanel");
const toggleExportBtn = document.getElementById("toggleExport");

if (toggleExportBtn && exportPanel) {
  toggleExportBtn.addEventListener("click", () => {
    exportPanel.classList.toggle("open");
  });
}

// -----------------------------
// AUTH UI
// -----------------------------

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const userInfo = document.getElementById("userInfo");

  // προσωρινό demo login
  loginBtn?.addEventListener("click", async () => {
    try {
      await login("demo@test.com", "123456");
    } catch (e) {
      alert("Login error (demo account)");
      console.error(e);
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    await logout();
  });

  onAuthChange(user => {
    if (!loginBtn || !logoutBtn || !userInfo) return;

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
