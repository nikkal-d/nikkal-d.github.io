// js/sidebar.js
// Handles left tool rail + left panel views + right export panel (safe: no null crashes)

const $ = (id) => document.getElementById(id);

const leftPanel = $("leftPanel");
const rightPanel = $("rightPanel");
const panelTitle = $("panelTitle");

const closeLeft = $("closeLeftPanelBtn");
const closeRight = $("closeRightPanelBtn");
const openExportBtn = $("openExportBtn");
const toggleExportBtn = $("toggleExportBtn");

const themeToggleBtn = $("themeToggleBtn");
const langToggleBtn = $("langToggleBtn");

function setActiveRailButton(btn){
  document.querySelectorAll(".leftRail .railbtn").forEach(b => b.classList.remove("active"));
  btn?.classList.add("active");
}

function showLeftView(viewName, title){
  if (!leftPanel) return;
  leftPanel.classList.remove("closed");
  if (panelTitle) panelTitle.textContent = title || "Panel";

  // supports both .panelView and .panel-view naming
  leftPanel.querySelectorAll("[data-view]").forEach(v => {
    v.hidden = (v.dataset.view !== viewName);
  });
}

function closeLeftPanel(){
  if (!leftPanel) return;
  leftPanel.classList.add("closed");
  document.querySelectorAll(".leftRail .railbtn").forEach(b => b.classList.remove("active"));
}

function toggleRightPanel(){
  if (!rightPanel) return;
  rightPanel.classList.toggle("open");
}
function closeRightPanel(){
  if (!rightPanel) return;
  rightPanel.classList.remove("open");
}

// Left rail clicks
document.querySelectorAll(".leftRail .railbtn").forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.panel || btn.dataset.view;
    if (!view) return;

    // toggle same view closes
    const currentVisible = leftPanel?.querySelector("[data-view]:not([hidden])");
    const isSame = currentVisible && currentVisible.dataset.view === view;
    if (isSame && leftPanel && !leftPanel.classList.contains("closed")) {
      closeLeftPanel();
      return;
    }

    setActiveRailButton(btn);

    const titles = {
      pages: "Pages",
      text: "Text",
      images: "Images",
      colors: "Colors",
      shapes: "Shapes",
      layers: "Layers",
    };
    showLeftView(view, titles[view] || "Panel");
  });
});

closeLeft?.addEventListener("click", closeLeftPanel);

openExportBtn?.addEventListener("click", toggleRightPanel);
toggleExportBtn?.addEventListener("click", toggleRightPanel);
closeRight?.addEventListener("click", closeRightPanel);

// Theme toggle
themeToggleBtn?.addEventListener("click", () => {
  const body = document.body;
  body.classList.toggle("theme-light");
  body.classList.toggle("theme-dark");
  themeToggleBtn.textContent = body.classList.contains("theme-light") ? "🌙" : "☀️";
});

// Lang toggle (UI only)
langToggleBtn?.addEventListener("click", () => {
  const cur = (langToggleBtn.textContent || "").trim().toUpperCase();
  langToggleBtn.textContent = (cur === "EL") ? "EN" : "EL";
});

// default open pages
document.addEventListener("DOMContentLoaded", () => {
  const firstBtn = document.querySelector(".leftRail .railbtn[data-panel='pages']");
  if (firstBtn) {
    setActiveRailButton(firstBtn);
    showLeftView("pages", "Pages");
  }
});
