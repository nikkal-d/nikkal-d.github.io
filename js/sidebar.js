document.querySelectorAll(".railbtn").forEach(btn => {
  btn.onclick = () => {
    const view = btn.dataset.panel;
    document.querySelectorAll(".panelView").forEach(v => {
      v.hidden = v.dataset.view !== view;
    });
    document.getElementById("leftPanel").classList.remove("closed");
    document.getElementById("panelTitle").textContent = view;
  };
});

document.getElementById("closeLeftPanelBtn").onclick = () =>
  document.getElementById("leftPanel").classList.add("closed");

document.getElementById("themeToggleBtn").onclick = () =>
  document.body.classList.toggle("theme-dark");
