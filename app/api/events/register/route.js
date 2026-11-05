import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../../lib/firebaseAdmin";
import { rateLimit, clientIp } from "../../../../lib/rateLimit.server";
import { sendEventEmail } from "../../../../lib/eventEmails.server";
import { SRN_RE, EMAIL_RE, PHONE_RE, URL_RE, YEARS, BRANCHES } from "../../../../lib/constants";

const MAX_RECEIPT_CHARS = 900_000; // keeps the receipt doc under Firestore's 1 MiB limit
const str = (v, max) => String(v ?? "").trim().slice(0, max);
const fail = (error, status = 400) => Response.json({ error }, { status });

// Public registration. All validation happens here (Admin SDK); clients never write to Firestore.
export async function POST(req) {
  const rl = await rateLimit(`evreg:ip:${clientIp(req)}`, 8, 600);
  if (!rl.ok) return fail("Too many attempts. Try again in a few minutes.", 429);

  const b = await req.json().catch(() => null);
  if (!b) return fail("Bad request");

  const slug = str(b.slug, 80);
  const db = adminDb();
  const evSnap = await db.doc(`events/${slug}`).get();
  if (!evSnap.exists || !evSnap.data().published) return fail("Event not found", 404);
  const ev = evSnap.data();
  if (ev.status === "past") return fail("This event has ended", 403);
  if (!ev.reg_enabled) return fail("Registrations are not open for this event", 403);
  if (ev.reg_deadline && ev.reg_deadline.toMillis() < Date.now()) return fail("The registration deadline has passed", 403);

  // --- leader / individual details
  const name = str(b.name, 100);
  const srn = str(b.srn, 20).toUpperCase();
  const email = str(b.email, 254).toLowerCase();
  const phone = str(b.phone, 15);
  const year = str(b.year, 2);
  const branch = str(b.branch, 50);
  if (name.length < 2) return fail("Enter your name");
  if (!SRN_RE.test(srn)) return fail("Enter a valid SRN");
  if (!EMAIL_RE.test(email)) return fail("Enter a valid email");
  if (!PHONE_RE.test(phone)) return fail("Enter a 10-digit phone number");
  if (!YEARS.includes(year)) return fail("Select your year");
  if (!BRANCHES.includes(branch)) return fail("Select your branch");

  // --- team
  let teamName = null;
  let members = [];
  const isTeam = ev.reg_type === "team";
  if (isTeam) {
    teamName = str(b.team_name, 60);
    if (teamName.length < 2) return fail("Enter a team name");
    const raw = Array.isArray(b.members) ? b.members.slice(0, 10) : [];
    members = raw.map((m) => ({ name: str(m?.name, 100), srn: str(m?.srn, 20).toUpperCase() }));
    const max = Number(ev.team_size) || 4;
    if (members.length + 1 < 2) return fail("Add at least one teammate");
    if (members.length + 1 > max) return fail(`Teams can have at most ${max} members`);
    const seen = new Set([srn]);
    for (const m of members) {
      if (m.name.length < 2) return fail("Enter every teammate's name");
      if (!SRN_RE.test(m.srn)) return fail(`Invalid SRN for ${m.name || "a teammate"}`);
      if (seen.has(m.srn)) return fail("Each team member needs a different SRN");
      seen.add(m.srn);
    }
  }
  const allSrns = [srn, ...members.map((m) => m.srn)];

  // --- event questions
  const qSnap = await db.collection(`events/${slug}/questions`).orderBy("order").get();
  const answers = {};
  const given = b.answers && typeof b.answers === "object" ? b.answers : {};
  for (const d of qSnap.docs) {
    const q = d.data();
    const v = str(given[d.id], 5000);
    if (!v) {
      if (q.required) return fail(`Please answer: ${q.label}`);
      continue;
    }
    if (q.type === "link" && !URL_RE.test(v)) return fail(`Enter a valid link for: ${q.label}`);
    if (q.type === "mcq" && !q.options.includes(v)) return fail(`Pick an option for: ${q.label}`);
    answers[d.id] = v;
  }

  // --- payment receipt (PESU Academy receipt screenshot)
  const fee = Number(ev.fee) || 0;
  let receipt = null;
  if (fee > 0) {
    receipt = typeof b.receipt === "string" ? b.receipt : "";
    if (!receipt.startsWith("data:image/jpeg;base64,") || receipt.length > MAX_RECEIPT_CHARS)
      return fail("Attach a clear screenshot of your payment receipt");
    const head = Buffer.from(receipt.slice(23, 60), "base64");
    if (head[0] !== 0xff || head[1] !== 0xd8) return fail("Receipt must be an image");
  }

  // --- duplicates (leader, and anyone already inside another team for this event)
  const id = `${srn}_${slug}`;
  const ref = db.doc(`registrations/${id}`);
  const existing = await ref.get();
  if (existing.exists && existing.data().status !== "rejected") return fail("You have already registered for this event.", 409);
  for (const s of allSrns) {
    const q = await db.collection("registrations").where("all_srns", "array-contains", s).get();
    const clash = q.docs.find((d) => d.id !== id && d.data().event === slug && d.data().status !== "rejected");
    if (clash) return fail(`${s} is already registered for this event.`, 409);
  }

  const status = fee > 0 ? "pending" : "confirmed";
  const batch = db.batch();
  batch.set(ref, {
    event: slug,
    event_title: ev.title,
    name, srn, email, phone, year, branch,
    team_name: teamName,
    members,
    all_srns: allSrns,
    answers,
    fee,
    has_receipt: fee > 0,
    status,
    checked_in: false,
    checked_in_at: null,
    created_at: FieldValue.serverTimestamp(),
  });
  const rRef = db.doc(`registration_receipts/${id}`);
  if (receipt) batch.set(rRef, { data_url: receipt, created_at: FieldValue.serverTimestamp() });
  else batch.delete(rRef);
  await batch.commit();

  try {
    await sendEventEmail(fee > 0 ? "received" : "confirmed", { name, email, team_name: teamName }, {
      title: ev.title,
      date: ev.date?.toDate?.(),
      venue: ev.venue,
    });
  } catch (e) {
    console.error("sendEventEmail failed", id, e);
  }
  return Response.json({ ok: true, status });
}
