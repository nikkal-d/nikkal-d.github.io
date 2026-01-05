// js/sidebar.js
// Handles: left rail -> left panel views, and right export panel toggle, plus theme/lang UI

const $ = (id)=>document.getElementById(id);

const leftPanel = $("leftPanel");
const rightPanel = $("rightPanel");
const panelTitle = $("panelTitle");

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

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".leftRail .railbtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.panel;
      if (!view) return;

      // toggle same panel
      if (leftPanel && !leftPanel.classList.contains("closed")) {
        const currentVisible = document.querySelector('.leftPanel .panelView:not([hidden])');
        const isSame = currentVisible && currentVisible.dataset.view === view;
        if (isSame) { closeLeftPanel(); return; }
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

  $("closeLeftPanelBtn")?.addEventListener("click", closeLeftPanel);

  const toggleRight = ()=> rightPanel?.classList.toggle("open");
  $("openExportBtn")?.addEventListener("click", toggleRight);
  $("toggleExportBtn")?.addEventListener("click", toggleRight);
  $("closeRightPanelBtn")?.addEventListener("click", ()=> rightPanel?.classList.remove("open"));

  // Theme toggle
  const themeToggleBtn = $("themeToggleBtn");
  themeToggleBtn?.addEventListener("click", () => {
    const isLight = document.body.classList.contains("theme-light");
    document.body.classList.toggle("theme-light", !isLight);
    document.body.classList.toggle("theme-dark", isLight);
    themeToggleBtn.textContent = isLight ? "☀️" : "🌙";
  });

  // Lang toggle (UI label only for now)
  const langToggleBtn = $("langToggleBtn");
  langToggleBtn?.addEventListener("click", () => {
    const isEL = (langToggleBtn.textContent || "").trim().toUpperCase() === "EL";
    langToggleBtn.textContent = isEL ? "EN" : "EL";
  });

  // Default: open Pages
  const firstBtn = document.querySelector(".leftRail .railbtn[data-panel='pages']");
  if (firstBtn) {
    setActiveRailButton(firstBtn);
    openLeftPanel("pages", "Pages");
  }
});
