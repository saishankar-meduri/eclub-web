import { adminDb } from "../../../../lib/firebaseAdmin";
import { rateLimit, clientIp } from "../../../../lib/rateLimit.server";

// POST { srn, email } -> the person's event registrations. Same answer for "wrong email" and "none".
export async function POST(req) {
  const ipRl = await rateLimit(`evstatus:ip:${clientIp(req)}`, 10, 60);
  if (!ipRl.ok) return Response.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const srn = String(body.srn || "").trim().toUpperCase();
  const email = String(body.email || "").trim().toLowerCase();
  if (!srn || !email) return Response.json({ error: "SRN and email required" }, { status: 400 });

  const srnRl = await rateLimit(`evstatus:srn:${srn}`, 30, 3600);
  if (!srnRl.ok) return Response.json({ error: "Too many requests. Try again later." }, { status: 429 });

  const snap = await adminDb().collection("registrations").where("srn", "==", srn).get();
  const mine = snap.docs.map((d) => d.data()).filter((r) => String(r.email).toLowerCase() === email);
  if (!mine.length) return Response.json({ found: false });
  return Response.json({
    found: true,
    results: mine.map((r) => ({
      event: r.event_title || r.event,
      status: r.status,
      team_name: r.team_name || null,
      checked_in: !!r.checked_in,
    })),
  });
}
