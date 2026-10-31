import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../../../lib/firebaseAdmin";
import { requireRole, errorResponse } from "../../../../../lib/serverAuth";
import { sendShortlistEmail } from "../../../../../lib/sendShortlistEmail.server";

export const maxDuration = 60; // bulk shortlists send many emails

// POST { ids: string[], status: "shortlisted" | "rejected" | "applied" }
export async function POST(req) {
  try {
    const me = await requireRole(req, ["superadmin", "domainHead"]);
    const { ids, status } = await req.json();
    if (!Array.isArray(ids) || !ids.length || ids.length > 400)
      return Response.json({ error: "Bad ids" }, { status: 400 });
    if (!["shortlisted", "rejected", "applied"].includes(status))
      return Response.json({ error: "Bad status" }, { status: 400 });

    const refs = ids.map((id) => adminDb().doc(`applications/${id}`));
    const snaps = await adminDb().getAll(...refs);

    // A head may only touch their own domain's applications
    for (const s of snaps) {
      if (!s.exists) return Response.json({ error: "Not found" }, { status: 404 });
      if (me.role === "domainHead" && s.data().domainId !== me.domainId)
        return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const batch = adminDb().batch();
    const toEmail = [];
    for (const s of snaps) {
      if (s.data().status === status) continue;
      batch.update(s.ref, {
        status,
        shortlistedAt: status === "shortlisted" ? FieldValue.serverTimestamp() : null,
      });
      if (status === "shortlisted") toEmail.push({ id: s.id, ...s.data() });
    }
    await batch.commit();

    // Emails go out after the status is saved. A failed email must never undo or block shortlisting.
    let emailed = 0;
    const emailFailed = [];
    if (toEmail.length) {
      const doms = new Map();
      for (const id of new Set(toEmail.map((a) => a.domainId))) {
        doms.set(id, (await adminDb().doc(`domains/${id}`).get()).data()?.name);
      }
      const queue = [...toEmail];
      const worker = async () => {
        for (let a; (a = queue.shift()); ) {
          try {
            const r = await sendShortlistEmail({ ...a, domainName: doms.get(a.domainId) });
            if (r.sent) emailed++;
          } catch (e) {
            console.error("sendShortlistEmail failed", a.id, e.message);
            emailFailed.push(a.id);
          }
        }
      };
      await Promise.all([worker(), worker(), worker()]);
    }
    return Response.json({ ok: true, updated: toEmail.length, emailed, emailFailed });
  } catch (e) {
    return errorResponse(e);
  }
}
