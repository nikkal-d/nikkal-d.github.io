// js/ui.js

document.addEventListener("DOMContentLoaded", () => {

  const buttons = document.querySelectorAll("#leftSidebar button");
  const panels  = document.querySelectorAll("#leftPanels .panel");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.panel;

      panels.forEach(p => {
        if (p.id === `panel-${target}`) {
          p.classList.toggle("open");
        } else {
          p.classList.remove("open");
        }
      });
    });
  });

});
