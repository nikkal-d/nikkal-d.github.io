// js/export.js
// ---------------------------------------------
// EXPORT SYSTEM (Cloud Upload + Local Download)
// ---------------------------------------------

import { auth, db, storage } from "../firebase-init.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  ref,
  uploadString,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ---------------------------------------------
// CLOUD UPLOAD
// ---------------------------------------------
export async function exportToCloud(pages, title, password = "") {
  const user = auth.currentUser;

  if (!user) {
    alert("Πρέπει να συνδεθείς για να ανεβάσεις το βιβλίο στο cloud.");
    return null;
  }

  try {
    // unique ID για το βιβλίο
    const bookId = crypto.randomUUID();

    const folderRef = ref(storage, `photobooks/${bookId}`);

    const uploadedPages = [];

    // -----------------------------------------
    // UPLOAD ΚΑΘΕ ΣΕΛΙΔΑ ΣΤΟ STORAGE
    // -----------------------------------------
    for (let i = 0; i < pages.length; i++) {
      const pageDataURL = pages[i];

      const pageRef = ref(folderRef, `page-${i}.png`);
      const uploadResult = await uploadString(pageRef, pageDataURL, "data_url");
      const url = await getDownloadURL(uploadResult.ref);

      uploadedPages.push(url);
    }

    // -----------------------------------------
    // SAVE METADATA στο Firestore
    // -----------------------------------------
    await setDoc(doc(db, "photobooks", bookId), {
      userId: user.uid,
      title: title || "Χωρίς τίτλο",
      pages: uploadedPages,
      isPublic: false,
      shareId: "",
      password: password || "",
      createdAt: serverTimestamp()
    });

    return bookId;

  } catch (err) {
    console.error("CLOUD EXPORT ERROR:", err);
    alert("Σφάλμα κατά την αποστολή στο cloud: " + err.message);
    return null;
  }
}
// ---------------------------------------------
// EXPORT AS PDF
// ---------------------------------------------
export async function exportAsPDF(pages) {
  const pdf = new jspdf.jsPDF("p", "mm", "a4");

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage();
    pdf.addImage(pages[i], "PNG", 0, 0, 210, 297);
  }

  pdf.save("photobook.pdf");
}

// ---------------------------------------------
// EXPORT AS IMAGES (ZIP)
// ---------------------------------------------
export async function exportAsZip(pages) {
  const zip = new JSZip();

  pages.forEach((page, i) => {
    const base64 = page.split(",")[1];
    zip.file(`page-${i + 1}.png`, base64, { base64: true });
  });

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, "photobook.zip");
}
// ---------------------------------------------
// EXPORT AS OFFLINE FLIPBOOK (HTML)
// ---------------------------------------------
export async function exportAsFlipbook(pages) {
  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>My Flipbook</title>
<style>
body { margin:0; background:#111; display:flex; justify-content:center; }
#flipbook { width:90vw; height:90vh; position:relative; }
.page {
  width:100%; height:100%;
  position:absolute;
  top:0; left:0;
  transform-origin:left center;
  transition:transform 0.8s ease-in-out;
  backface-visibility:hidden;
}
</style>
</head>
<body>
<div id="flipbook">
${pages
  .map(
    (p, i) => `<div class="page" id="p${i}" style="z-index:${pages.length - i}">
      <img src="${p}" style="width:100%;height:100%;object-fit:cover;">
    </div>`
  )
  .join("")}
</div>

<script>
let index = 0;
const total = ${pages.length};

function flipTo(n) {
  index = n;
  for (let i = 0; i < total; i++) {
    const page = document.getElementById("p" + i);
    page.style.transform = i <= index ? "rotateY(-180deg)" : "rotateY(0deg)";
  }
}

document.addEventListener("keydown", e => {
  if (e.key === "ArrowRight" && index < total - 1) flipTo(index + 1);
  if (e.key === "ArrowLeft" && index > 0) flipTo(index - 1);
});
</script>

</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  saveAs(blob, "flipbook.html");
}
