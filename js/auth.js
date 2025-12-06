/* ============================================================
   PHOTObook Studio — AUTH MODULE
   Firebase Login / Logout / Auto-load Draft
   ============================================================ */

import {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "./firebase-init.js";

import { loadDraft, saveDraft } from "./core.js";

/* ------------------------------------------------------------
   INIT AUTH LISTENERS
   ------------------------------------------------------------ */
window.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  loginBtn.onclick = promptLogin;
  logoutBtn.onclick = executeLogout;

  onAuthStateChanged(auth, (user) => {
    updateUserUi(user);
    setTimeout(loadDraft, 500); // load correct draft per user
  });
});

/* ------------------------------------------------------------
   LOGIN / REGISTER PROMPTS
   ------------------------------------------------------------ */
async function promptLogin() {
  const email = prompt("Email:");
  if (!email) return;

  const pass = prompt("Κωδικός:");
  if (!pass) return;

  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      const ok = confirm("Ο χρήστης δεν υπάρχει. Θέλεις να δημιουργήσω νέο λογαριασμό;");
      if (ok) {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(cred.user, {
          displayName: email.split("@")[0]
        });
        alert("Ο λογαριασμός δημιουργήθηκε.");
      }
    } else {
      alert("Σφάλμα: " + err.message);
    }
  }
}

/* ------------------------------------------------------------
   LOGOUT
   ------------------------------------------------------------ */
async function executeLogout() {
  await signOut(auth);
  saveDraft();
  alert("Έγινε αποσύνδεση.");
}

/* ------------------------------------------------------------
   UPDATE UI LABELS
   ------------------------------------------------------------ */
function updateUserUi(user) {
  const label = document.getElementById("user-label");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  if (user) {
    label.textContent = user.displayName || user.email;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-flex";
  } else {
    label.textContent = "Επισκέπτης";
    loginBtn.style.display = "inline-flex";
    logoutBtn.style.display = "none";
  }
}

export { updateUserUi };
