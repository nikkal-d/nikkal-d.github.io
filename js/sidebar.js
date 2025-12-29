// js/sidebar.js
// Left rail -> left panel views, Right rail -> export panel, Theme/Lang toggles.
// Safe (won't crash if elements missing).

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
  btn.classList.add("active");
}

function openLeftPanel(viewName, title){
  if (!leftPanel) return;
  leftPanel.classList.remove("closed");
  if (panelTitle) panelTitle.textContent = title;

  document.querySelectorAll(".leftPanel .panelView").forEach(v => {
    v.hidden = (v.dataset.view !== viewName);
  });
}

function closeLeftPanel(){
  if (!leftPanel) return;
  leftPanel.classList.add("closed");
  document.querySelectorAll(".leftRail .railbtn").forEach(b => b.classList.remove("active"));
}

function openRightPanel(){
  if (!rightPanel) return;
  rightPanel.classList.add("open");
}
function closeRightPanel(){
  if (!rightPanel) return;
  rightPanel.classList.remove("open");
}

document.querySelectorAll(".leftRail .railbtn").forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.panel;
    if (!view) return;

    // toggle behavior
    if (leftPanel && !leftPanel.classList.contains("closed")) {
      const currentVisible = document.querySelector('.leftPanel .panelView:not([hidden])');
      const isSame = currentVisible && currentVisible.dataset.view === view;
      if (isSame) {
        closeLeftPanel();
        return;
      }
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

    openLeftPanel(view, titles[view] || "Panel");
  });
});

closeLeft?.addEventListener("click", closeLeftPanel);

// Right export open/close
openExportBtn?.addEventListener("click", () => {
  if (!rightPanel) return;
  rightPanel.classList.toggle("open");
});
toggleExportBtn?.addEventListener("click", () => {
  if (!rightPanel) return;
  rightPanel.classList.toggle("open");
});
closeRight?.addEventListener("click", closeRightPanel);

// Theme toggle (UI only)
themeToggleBtn?.addEventListener("click", () => {
  document.body.classList.toggle("theme-light");
  document.body.classList.toggle("theme-dark");
  themeToggleBtn.textContent = document.body.classList.contains("theme-light") ? "🌙" : "☀️";
});

// Lang toggle (UI only)
langToggleBtn?.addEventListener("click", () => {
  const isEL = (langToggleBtn.textContent || "").trim().toUpperCase() === "EL";
  langToggleBtn.textContent = isEL ? "EN" : "EL";
});

// Default state: open Pages
const firstBtn = document.querySelector(".leftRail .railbtn[data-panel='pages']");
if (firstBtn) {
  setActiveRailButton(firstBtn);
  openLeftPanel("pages", "Pages");
}
