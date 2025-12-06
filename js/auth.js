// js/auth.js
// Απλό auth για το βασικό header (photobook, projects κλπ)

import {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from "../firebase-init.js";

window.addEventListener("DOMContentLoaded", () => {
  const userLabel = document.getElementById("user-label");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  if (!userLabel) {
    // Δεν είμαστε σε σελίδα με αυτό το header, απλά αγνόησε
    return;
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      userLabel.textContent = user.displayName || user.email;
      if (loginBtn) loginBtn.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "inline-flex";
    } else {
      userLabel.textContent = "Επισκέπτης";
      if (loginBtn) loginBtn.style.display = "inline-flex";
      if (logoutBtn) logoutBtn.style.display = "none";
    }
  });

  if (loginBtn) {
    loginBtn.onclick = async () => {
      const email = prompt("Email:");
      if (!email) return;
      const pass = prompt("Κωδικός:");
      if (!pass) return;

      try {
        await signInWithEmailAndPassword(auth, email, pass);
      } catch (err) {
        if (err.code === "auth/user-not-found") {
          const ok = confirm("Ο χρήστης δεν υπάρχει. Να δημιουργηθεί λογαριασμός;");
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
    };
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await signOut(auth);
      alert("Αποσυνδέθηκες.");
    };
  }
});
