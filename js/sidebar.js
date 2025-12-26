// sidebar.js
document.querySelectorAll("[data-panel]").forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.panel;
    document.querySelectorAll(".panel").forEach(p => {
      p.classList.toggle("open", p.id === id);
    });
  });
});
