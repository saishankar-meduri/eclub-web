import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../../lib/firebaseAdmin";
import { requireRole, errorResponse } from "../../../../lib/serverAuth";
import { sendMarketingEmail } from "../../../../lib/sendShortlistEmail.server";
import { EMAIL_RE, isMarketingDomain } from "../../../../lib/constants";

export const maxDuration = 60;

const AUDIENCES = ["all", "applied", "shortlisted", "selected"];
const MAX_RECIPIENTS = 100; // keeps one send inside maxDuration; split bigger lists by domain

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
  const list = [...byEmail.values()];
  // Opt-outs: one doc config/mailOptOut with an array field `emails` (lowercase). Edit it in the Firebase console.
  const opt = (await adminDb().doc("config/mailOptOut").get()).data()?.emails;
  const out = new Set(Array.isArray(opt) ? opt.map((e) => String(e).trim().toLowerCase()) : []);
  return list.filter((r) => !out.has(r.email));
}

// POST { audience, domainId?, subject, body, campaignId, dryRun? }  superadmin, or the head of the
// Social Media and Marketing domain.
// dryRun returns just the recipient count so the UI can confirm before sending.
export async function POST(req) {
  try {
    const me = await requireRole(req, ["superadmin", "domainHead"]);
    if (me.role !== "superadmin") {
      const dom = me.domainId ? (await adminDb().doc(`domains/${me.domainId}`).get()).data() : null;
      if (!isMarketingDomain(me.domainId, dom?.name)) return Response.json({ error: "No access" }, { status: 403 });
    }
    const { audience, domainId, subject, body, dryRun, campaignId } = await req.json();
    if (!AUDIENCES.includes(audience)) return Response.json({ error: "Bad audience" }, { status: 400 });

    const list = await recipients({ audience, domainId: domainId || null });
    if (dryRun) return Response.json({ count: list.length });

    const subj = String(subject || "").trim();
    const text = String(body || "").trim();
    if (!subj || subj.length > 150) return Response.json({ error: "Subject required (max 150 chars)" }, { status: 400 });
    if (!text || text.length > 5000) return Response.json({ error: "Message required (max 5000 chars)" }, { status: 400 });
    if (!list.length) return Response.json({ error: "No recipients" }, { status: 400 });
    if (list.length > MAX_RECIPIENTS)
      return Response.json({ error: `Too many recipients (${list.length}). Max ${MAX_RECIPIENTS} per send. Pick one domain.` }, { status: 400 });

    // Idempotency: the same campaignId can only be sent once (blocks double-clicks and retries).
    const cid = String(campaignId || "");
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(cid)) return Response.json({ error: "Missing campaignId" }, { status: 400 });
    const logRef = adminDb().doc(`mailLog/${cid}`);
    try {
      await logRef.create({
        by: me.email, audience, domainId: domainId || null, subject: subj,
        total: list.length, status: "sending", createdAt: FieldValue.serverTimestamp(),
      });
    } catch (e) {
      if (e.code === 6) return Response.json({ error: "This email was already sent (or is sending). Edit it to send again." }, { status: 409 });
      throw e;
    }

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
    await logRef.update({ status: "done", sent, failed, finishedAt: FieldValue.serverTimestamp() }).catch(() => {});
    return Response.json({ ok: true, total: list.length, sent, failed, notConfigured });
  } catch (e) {
    return errorResponse(e);
  }
}
