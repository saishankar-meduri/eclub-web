// Safe & idempotent seed script for Contact Page
// Run: npm run seed:contacts
// Or: node --env-file=.env.local scripts/seed-contacts.mjs

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { INITIAL_CONTACTS } from "../lib/initialContacts.js";

function getDb() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n");

    if (clientEmail && privateKey) {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      // Default local or emulator initialization
      initializeApp({ projectId: projectId || "demo-eclub" });
    }
  }
  return getFirestore();
}

async function main() {
  const db = getDb();
  console.log("Seeding contacts idempotently into Firestore...");

  let created = 0;
  let updated = 0;

  for (const contact of INITIAL_CONTACTS) {
    const ref = db.collection("contacts").doc(contact.id);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({
        ...contact,
        category: contact.group,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });
      created++;
      console.log(`+ Created: [${contact.group}] ${contact.name} (${contact.designation})`);
    } else {
      // If doc exists, preserve existing data or update fields safely
      await ref.set(
        {
          ...contact,
          category: contact.group,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      updated++;
      console.log(`~ Checked / updated: [${contact.group}] ${contact.name}`);
    }
  }

  console.log(`Done! Created: ${created}, Updated: ${updated}, Total: ${INITIAL_CONTACTS.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});

