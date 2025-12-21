import { addText, addImageFromFile } from "./core.js";

document.getElementById("addTextBtn")?.addEventListener("click", addText);

document.getElementById("imageInput")?.addEventListener("change", e => {
  if (e.target.files[0]) {
    addImageFromFile(e.target.files[0]);
    e.target.value = "";
  }
});

/* LEFT SIDEBAR */
document.querySelectorAll("#leftSidebar button").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.panel;
    document.querySelectorAll("#leftPanels .panel").forEach(p => {
      p.classList.toggle("open", p.id === `panel-${target}`);
    });
  });
});
