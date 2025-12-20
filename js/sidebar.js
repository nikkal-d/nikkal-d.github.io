const sidebar = document.getElementById("leftSidebar");
const panelsWrap = document.getElementById("leftPanels");
const panels = document.querySelectorAll(".panel");

sidebar.querySelectorAll("button").forEach(btn => {
  btn.onclick = () => {
    const name = btn.dataset.panel;
    const panel = document.getElementById("panel-" + name);

    const isOpen = panel.classList.contains("open");

    panels.forEach(p => p.classList.remove("open"));

    if (isOpen) {
      panelsWrap.classList.remove("open");
    } else {
      panel.classList.add("open");
      panelsWrap.classList.add("open");
    }
  };
});
