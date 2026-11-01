import { adminDb } from "../../../../lib/firebaseAdmin";
import { requireRole, errorResponse } from "../../../../lib/serverAuth";
import { sendMarketingEmail } from "../../../../lib/sendShortlistEmail.server";
import { EMAIL_RE } from "../../../../lib/constants";

export const maxDuration = 60;

const AUDIENCES = ["all", "applied", "shortlisted", "selected"];
const MAX_RECIPIENTS = 500;

async function recipients({ audience, domainId }) {
  let q = adminDb().collection("applications");
  if (audience !== "all") q = q.where("status", "==", audience);
  if (domainId) q = q.where("domainId", "==", domainId);
  const snap = await q.get();
  const byEmail = new Map();
  for (const d of snap.docs) {
    const a = d.data();
    const email = String(a.email || "").trim().toLowerCase();
    if (EMAIL_RE.test(email) && !byEmail.has(email)) byEmail.set(email, { email, name: a.name });
  }
  return [...byEmail.values()];
}

// POST { audience, domainId?, subject, body, dryRun? }  superadmin only.
// dryRun returns just the recipient count so the UI can confirm before sending.
export async function POST(req) {
  try {
    await requireRole(req, ["superadmin"]);
    const { audience, domainId, subject, body, dryRun } = await req.json();
    if (!AUDIENCES.includes(audience)) return Response.json({ error: "Bad audience" }, { status: 400 });

    const list = await recipients({ audience, domainId: domainId || null });
    if (dryRun) return Response.json({ count: list.length });

    const subj = String(subject || "").trim();
    const text = String(body || "").trim();
    if (!subj || subj.length > 150) return Response.json({ error: "Subject required (max 150 chars)" }, { status: 400 });
    if (!text || text.length > 5000) return Response.json({ error: "Message required (max 5000 chars)" }, { status: 400 });
    if (!list.length) return Response.json({ error: "No recipients" }, { status: 400 });
    if (list.length > MAX_RECIPIENTS)
      return Response.json({ error: `Too many recipients (${list.length}). Narrow it to one domain.` }, { status: 400 });

    let sent = 0;
    let failed = 0;
    let notConfigured = false;
    const queue = [...list];
    const worker = async () => {
      for (let r; (r = queue.shift()); ) {
        try {
          const res = await sendMarketingEmail({ to: r.email, name: r.name, subject: subj, body: text });
          if (res.sent) sent++;
          else notConfigured = true;
        } catch (e) {
          console.error("sendMarketingEmail failed", e.message);
          failed++;
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    return Response.json({ ok: true, total: list.length, sent, failed, notConfigured });
  } catch (e) {
    return errorResponse(e);
  }
}
