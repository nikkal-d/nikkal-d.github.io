// js/sidebar.js
// =====================================
// SAFE SIDEBAR CONTROLLER (NO ASSUMPTIONS)
// =====================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("🟢 sidebar.js loaded");

  const leftSidebar = document.getElementById("leftSidebar");
  if (!leftSidebar) {
    console.warn("❌ leftSidebar not found");
    return;
  }

  const panels = document.querySelectorAll(".panel");
  const buttons = leftSidebar.querySelectorAll("button");

  console.log("🟢 sidebar buttons:", buttons.length);
  console.log("🟢 panels:", panels.length);

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = btn.getAttribute("data-panel");
      console.log("👉 clicked:", panel);

      if (!panel) return;

      panels.forEach(p => {
        if (p.id === "panel-" + panel) {
          p.classList.toggle("open");
        } else {
          p.classList.remove("open");
        }
      });
    });
  });
});
