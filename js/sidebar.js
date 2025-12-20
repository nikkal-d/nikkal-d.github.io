document.querySelectorAll(".sidebar button").forEach(btn => {
  btn.onclick = () => {
    const name = btn.dataset.panel;
    document.querySelectorAll(".panel").forEach(p => {
      p.classList.toggle("open", p.id === "panel-" + name);
    });
  };
});
