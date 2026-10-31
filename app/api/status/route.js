import { adminDb } from "../../../lib/firebaseAdmin";

// Public status lookup. Server-side only: applications are never publicly readable.
import { rateLimit, clientIp } from "../../../lib/rateLimit.server";

export async function POST(req) {
  // 10 lookups/min per IP
  const ipRl = await rateLimit(`status:ip:${clientIp(req)}`, 10, 60);
  if (!ipRl.ok)
    return Response.json({ error: "Too many requests. Try again in a minute." }, { status: 429, headers: { "Retry-After": String(ipRl.retryAfter) } });

  const body = await req.json().catch(() => ({}));
  const srn = String(body.srn || "").trim().toUpperCase();
  const email = String(body.email || "").trim().toLowerCase();
  if (!srn || !email) return Response.json({ error: "SRN and email required" }, { status: 400 });

  // 30 lookups/hour per SRN across all IPs: slows down enumeration from rotating IPs
  const srnRl = await rateLimit(`status:srn:${srn}`, 30, 3600);
  if (!srnRl.ok)
    return Response.json({ error: "Too many requests. Try again later." }, { status: 429, headers: { "Retry-After": String(srnRl.retryAfter) } });

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
