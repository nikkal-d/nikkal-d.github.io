// js/sidebar.js
function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }
function qs(sel) { return document.querySelector(sel); }

const exportPanel = qs("#exportPanel");
const toggleExportBtn = qs("#toggleExport");

function closeLeftPanels() {
  qsa(".leftpanels .panel").forEach(p => p.classList.remove("open"));
}

function openLeftPanel(name) {
  const p = qs(`#panel-${name}`);
  if (!p) return;
  const isOpen = p.classList.contains("open");
  closeLeftPanels();
  if (!isOpen) p.classList.add("open");
}

qsa(".leftbar .tool").forEach(btn => {
  btn.addEventListener("click", () => openLeftPanel(btn.dataset.panel));
});

qsa('[data-close="left"]').forEach(btn => {
  btn.addEventListener("click", closeLeftPanels);
});

if (toggleExportBtn && exportPanel) {
  toggleExportBtn.addEventListener("click", () => exportPanel.classList.toggle("open"));
}
qsa('[data-close="export"]').forEach(btn => {
  btn.addEventListener("click", () => exportPanel?.classList.remove("open"));
});
