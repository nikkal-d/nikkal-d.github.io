document.addEventListener("DOMContentLoaded", () => {
  const railButtons = document.querySelectorAll(".railbtn[data-panel]");
  const leftPanel = document.getElementById("leftPanel");
  const panelTitle = document.getElementById("panelTitle");
  const views = document.querySelectorAll(".panelView");

  railButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.panel;
      if (!leftPanel) return;

      leftPanel.classList.add("open");

      views.forEach(v => {
        v.hidden = v.dataset.view !== view;
      });

      panelTitle.textContent = view.charAt(0).toUpperCase() + view.slice(1);
    });
  });

  document.getElementById("closeLeftPanelBtn")?.addEventListener("click", () => {
    leftPanel?.classList.remove("open");
  });
});
