
// js/sidebar.js
// Left panel tabs + right export panel + theme/lang toggles.
// Safe: no null crashes, no double-binding.

(function(){
  if (window.__pbSidebarInit) return;
  window.__pbSidebarInit = true;

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

  function toggleRightPanel(){
    if (!rightPanel) return;
    rightPanel.classList.toggle("open");
  }
  function closeRightPanel(){
    if (!rightPanel) return;
    rightPanel.classList.remove("open");
  }

  // Left rail buttons
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

      // toggle if same view
      if (leftPanel && !leftPanel.classList.contains("closed")) {
        const currentVisible = document.querySelector('.leftPanel .panelView:not([hidden])');
        const isSame = currentVisible && currentVisible.dataset.view === view;
        if (isSame) {
          closeLeftPanel();
          return;
        }
      }

      setActiveRailButton(btn);
      openLeftPanel(view, titles[view] || "Panel");
    });
  });

  closeLeft && closeLeft.addEventListener("click", closeLeftPanel);

  // Right panel open/close
  openExportBtn && openExportBtn.addEventListener("click", toggleRightPanel);
  toggleExportBtn && toggleExportBtn.addEventListener("click", toggleRightPanel);
  closeRight && closeRight.addEventListener("click", closeRightPanel);

  // Theme toggle
  themeToggleBtn && themeToggleBtn.addEventListener("click", () => {
    const body = document.body;
    const isLight = body.classList.contains("theme-light");
    body.classList.toggle("theme-light", !isLight);
    body.classList.toggle("theme-dark", isLight);
    themeToggleBtn.textContent = body.classList.contains("theme-light") ? "🌙" : "☀️";
  });

  // Lang toggle (UI only here)
  langToggleBtn && langToggleBtn.addEventListener("click", () => {
    const cur = (langToggleBtn.textContent || "").trim().toUpperCase();
    langToggleBtn.textContent = (cur === "EL") ? "EN" : "EL";
  });

  // Default open pages
  const firstBtn = document.querySelector(".leftRail .railbtn[data-panel='pages']");
  if (firstBtn) {
    setActiveRailButton(firstBtn);
    openLeftPanel("pages", "Pages");
  }
})();
