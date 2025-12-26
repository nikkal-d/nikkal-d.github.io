// js/sidebar.js
document.querySelectorAll(".railbtn").forEach(btn => {
  btn.addEventListener("click", () => {
    const panel = btn.dataset.panel;
    document.querySelectorAll(".panelView").forEach(v => {
      v.hidden = v.dataset.view !== panel;
    });
  });
});
