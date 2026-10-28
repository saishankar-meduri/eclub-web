import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../../../lib/firebaseAdmin";
import { requireRole, errorResponse } from "../../../../../lib/serverAuth";
import { sendShortlistEmail } from "../../../../../lib/sendShortlistEmail.server";

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

    // Stub for now (no-op). Failures must never block shortlisting.
    for (const a of toEmail) {
      try { await sendShortlistEmail(a); } catch (e) { console.error("sendShortlistEmail failed", a.id, e); }
    }
    return Response.json({ ok: true, updated: toEmail.length });
  } catch (e) {
    return errorResponse(e);
  }
}
