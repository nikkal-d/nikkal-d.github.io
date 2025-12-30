// js/sidebar.js
// Left rail -> left panel views + right export panel toggle + theme/lang toggles.
// Safe: no null crashes.

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

function showLeftView(viewName){
  document.querySelectorAll(".leftPanel .panelView").forEach(v => {
    v.hidden = (v.dataset.view !== viewName);
  });
}

function openLeftPanel(viewName, title){
  if (!leftPanel) return;
  leftPanel.classList.remove("closed");
  if (panelTitle) panelTitle.textContent = title || "Panel";
  showLeftView(viewName);
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

// Left rail behavior: clicking same tab closes, clicking other opens and switches
document.querySelectorAll(".leftRail .railbtn").forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.panel;
    if (!view) return;

    const titles = {
      pages: "Pages",
      text: "Text",
      images: "Images",
      colors: "Colors",
      shapes: "Shapes",
      layers: "Layers",
    };

    const isOpen = leftPanel && !leftPanel.classList.contains("closed");
    const currentVisible = document.querySelector(".leftPanel .panelView:not([hidden])");
    const isSame = isOpen && currentVisible && currentVisible.dataset.view === view;

    if (isSame) {
      closeLeftPanel();
      return;
    }

    setActiveRailButton(btn);
    openLeftPanel(view, titles[view] || "Panel");
  });
});

closeLeft?.addEventListener("click", closeLeftPanel);

openExportBtn?.addEventListener("click", toggleRightPanel);
toggleExportBtn?.addEventListener("click", toggleRightPanel);
closeRight?.addEventListener("click", closeRightPanel);

// Theme toggle
themeToggleBtn?.addEventListener("click", () => {
  const isLight = document.body.classList.contains("theme-light");
  document.body.classList.toggle("theme-light", !isLight);
  document.body.classList.toggle("theme-dark", isLight);
  themeToggleBtn.textContent = isLight ? "☀️" : "🌙";
});

// Language toggle (UI label only for now)
langToggleBtn?.addEventListener("click", () => {
  const now = (langToggleBtn.textContent || "EL").trim().toUpperCase();
  langToggleBtn.textContent = (now === "EL") ? "EN" : "EL";
});

// default: open Pages view
document.addEventListener("DOMContentLoaded", () => {
  const firstBtn = document.querySelector(".leftRail .railbtn[data-panel='pages']");
  if (firstBtn) {
    setActiveRailButton(firstBtn);
    openLeftPanel("pages", "Pages");
  }
});
