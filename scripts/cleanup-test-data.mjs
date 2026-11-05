// One-off cleanup before launch. Deletes TEST data from Firestore with the Admin SDK.
//
//   node --env-file=.env.local scripts/cleanup-test-data.mjs                 (dry run: only shows counts)
//   node --env-file=.env.local scripts/cleanup-test-data.mjs --yes           (deletes after you type the project id)
//
// Always deletes:  applications, registrations, registration_receipts
// Optional flags:  --events (also each event's questions), --announcements, --contacts
// Never touches:   users, domains + their questions/WhatsApp links, settings
import readline from "node:readline/promises";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
initializeApp({
  credential: cert({
    projectId,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();

const flags = new Set(process.argv.slice(2));
const targets = ["applications", "registrations", "registration_receipts"];
if (flags.has("--events")) targets.push("events");
if (flags.has("--announcements")) targets.push("announcements");
if (flags.has("--contacts")) targets.push("contacts");

console.log(`Project: ${projectId}\n`);
for (const t of targets) {
  const c = (await db.collection(t).count().get()).data().count;
  console.log(`  ${t.padEnd(24)} ${c} document(s)`);
}

if (!flags.has("--yes")) {
  console.log("\nDry run only. Re-run with --yes to delete the collections above.");
  process.exit(0);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question(`\nThis permanently deletes the data above. Type the project id (${projectId}) to continue: `);
rl.close();
if (answer.trim() !== projectId) {
  console.log("Project id did not match. Nothing was deleted.");
  process.exit(1);
}

for (const t of targets) {
  await db.recursiveDelete(db.collection(t));
  console.log(`Deleted ${t}`);
}
console.log("\nDone.");
