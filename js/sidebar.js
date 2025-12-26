// sidebar.js
// Safe sidebar toggles

const $ = (id)=>document.getElementById(id);

function setPanelView(panelEl, viewName){
  if (!panelEl) return;
  panelEl.querySelectorAll(".panel-view").forEach(v=>{
    v.classList.toggle("active", v.dataset.view === viewName);
  });
}

window.addEventListener("DOMContentLoaded", ()=>{
  const left = $("leftPanel");
  const right = $("rightPanel");

  document.querySelectorAll("[data-left-view]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const view = btn.dataset.leftView;
      if (!left) return;
      left.classList.add("open");
      setPanelView(left, view);
    });
  });

  $("closeLeftPanelBtn")?.addEventListener("click", ()=>left?.classList.remove("open"));
  $("closeRightPanelBtn")?.addEventListener("click", ()=>right?.classList.remove("open"));

  $("toggleExportBtn")?.addEventListener("click", ()=>{
    if (!right) return;
    right.classList.toggle("open");
    // default view
    setPanelView(right, "export");
  });

  $("openExportBtn")?.addEventListener("click", ()=>{
    if (!right) return;
    right.classList.add("open");
    setPanelView(right, "export");
  });

  document.querySelectorAll("[data-right-view]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const view = btn.dataset.rightView;
      if (!right) return;
      right.classList.add("open");
      setPanelView(right, view);
    });
  });
});
