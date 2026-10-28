import { adminDb } from "../../../lib/firebaseAdmin";

// Public status lookup. Server-side only: applications are never publicly readable.
const hits = new Map(); // naive per-IP limiter (per instance); use Upstash/Vercel KV for real limits
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 10;
}

export async function POST(req) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "anon";
  if (limited(ip)) return Response.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const srn = String(body.srn || "").trim().toUpperCase();
  const email = String(body.email || "").trim().toLowerCase();
  if (!srn || !email) return Response.json({ error: "SRN and email required" }, { status: 400 });

  const snap = await adminDb().collection("applications").where("srn", "==", srn).get();
  const mine = snap.docs.map((d) => d.data()).filter((a) => String(a.email).toLowerCase() === email);
  // Same response for "wrong email" and "no application" -> no SRN enumeration
  if (!mine.length) return Response.json({ found: false });

  const results = await Promise.all(
    mine.map(async (a) => {
      const dom = await adminDb().doc(`domains/${a.domainId}`).get();
      let whatsappLink = null;
      if (a.status === "shortlisted") {
        const p = await adminDb().doc(`domains/${a.domainId}/private/settings`).get();
        whatsappLink = p.data()?.whatsappLink || null;
      }
      return { domain: dom.data()?.name || a.domainId, status: a.status, whatsappLink };
    })
  );
  return Response.json({ found: true, results });
}
