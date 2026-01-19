export async function previewFlipbook() {
  saveCurrentPage();
  const images = [];
  const size = PRESETS[App.preset];

  // Δημιουργία εικόνων
  for (let i = 0; i < App.pages.length; i++) {
    await new Promise((resolve) => {
      App.canvas.loadFromJSON(App.pages[i].json, () => {
        App.canvas.renderAll();
        images.push(App.canvas.toDataURL({ format: 'jpeg', quality: 0.9 }));
        resolve();
      });
    });
  }
  await renderCurrentPage();

  const modal = document.getElementById("flipPreviewModal");
  const frame = document.getElementById("flipPreviewFrame");
  if (!modal || !frame) return;

  const html = `
  <!doctype html>
  <html>
  <head>
    <style>
      /* ΚΡΥΒΕΙ ΗΜΕΡΟΜΗΝΙΕΣ ΚΑΙ LINKS ΣΤΗΝ ΕΚΤΥΠΩΣΗ */
      @page { size: auto; margin: 0mm; } 
      @media print {
        body { margin: 0; background: white; }
        .no-print { display: none !important; }
        .page-img { box-shadow: none !important; margin: 0 !important; page-break-after: always; }
      }

      body { margin:0; background:#1a1a1a; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; }
      .nav-bar { 
        width:100%; background:#000; padding:15px; display:flex; justify-content:center; gap:20px; 
        position:sticky; top:0; z-index:100; box-shadow: 0 2px 10px rgba(0,0,0,0.5);
      }
      .btn { padding:12px 25px; border:none; border-radius:5px; cursor:pointer; font-weight:bold; font-size:14px; transition: 0.2s; }
      .btn-pdf { background:#27ae60; color:white; }
      .btn-pdf:hover { background:#2ecc71; }
      .btn-close { background:#e74c3c; color:white; }
      
      .container { margin: 20px; width: 90%; max-width: 800px; display: flex; flex-direction: column; gap: 0; }
      .page-img { background:white; width:100%; margin-bottom: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
      .page-img img { width:100%; display:block; }
    </style>
  </head>
  <body>
    <div class="nav-bar no-print">
      <button class="btn btn-pdf" onclick="window.print()">📥 Download PDF (Χωρίς Link/Ημερομηνία)</button>
      <button class="btn btn-close" onclick="window.parent.closeFlipbookPreview()">Κλείσιμο</button>
    </div>
    <div class="container">
      ${images.map(src => `<div class="page-img"><img src="${src}"></div>`).join('')}
    </div>
  </body>
  </html>`;

  frame.srcdoc = html;
  modal.style.display = "block";
}

// export την ίδια συνάρτηση και ως exportFlipbook αν το χρησιμοποιείς έτσι στο ui.js
export const exportFlipbook = previewFlipbook;
