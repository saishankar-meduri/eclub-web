// Run once: node --env-file=.env.local scripts/seed-superadmin.mjs
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  }),
});
const email = (process.env.SUPERADMIN_EMAIL || "").toLowerCase();
if (!email) throw new Error("Set SUPERADMIN_EMAIL");
await getFirestore().doc(`users/${email}`).set({ email, role: "superadmin", domainId: null });
console.log("Superadmin seeded:", email);
