// js/sidebar.js
// =======================================
// LEFT / RIGHT SIDEBAR TOGGLE CONTROLLER
// =======================================

document.addEventListener("DOMContentLoaded", () => {

  const leftSidebar = document.getElementById("leftSidebar");
  const rightSidebar = document.getElementById("rightSidebar");

  const panels = document.querySelectorAll(".panel");
  const sidebarButtons = document.querySelectorAll("#leftSidebar button");

  // ===============================
  // LEFT SIDEBAR → PANELS
  // ===============================
  sidebarButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const panelName = btn.dataset.panel;
      if (!panelName) return;

      panels.forEach(panel => {
        if (panel.id === `panel-${panelName}`) {
          panel.classList.toggle("open");
        } else {
          panel.classList.remove("open");
        }
      });
    });
  });

  // ===============================
  // RIGHT SIDEBAR (EXPORT / ZOOM)
  // ===============================
  // (έτοιμο για επέκταση – δεν σπάει τίποτα)
  if (rightSidebar) {
    rightSidebar.classList.add("ready");
  }

});
