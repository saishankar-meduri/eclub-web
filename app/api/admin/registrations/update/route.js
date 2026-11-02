import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../../../lib/firebaseAdmin";
import { requireRole, errorResponse } from "../../../../../lib/serverAuth";
import { sendEventEmail } from "../../../../../lib/eventEmails.server";

// POST { id, action: "confirm" | "reject" | "checkin" | "undo_checkin" }
export async function POST(req) {
  try {
    const me = await requireRole(req, ["superadmin", "domainHead"]);
    if (!(me.role === "superadmin" || me.domainId === "events"))
      return Response.json({ error: "Forbidden" }, { status: 403 });

    const { id, action } = await req.json();
    const db = adminDb();
    const ref = db.doc(`registrations/${String(id)}`);
    const snap = await ref.get();
    if (!snap.exists) return Response.json({ error: "Not found" }, { status: 404 });
    const reg = snap.data();

    if (action === "confirm" || action === "reject") {
      const status = action === "confirm" ? "confirmed" : "rejected";
      if (reg.status === status) return Response.json({ ok: true });
      await ref.update({ status, ...(status === "rejected" ? { checked_in: false, checked_in_at: null } : {}) });
      try {
        const ev = (await db.doc(`events/${reg.event}`).get()).data() || {};
        await sendEventEmail(status, reg, { title: ev.title || reg.event_title, date: ev.date?.toDate?.(), venue: ev.venue });
      } catch (e) {
        console.error("sendEventEmail failed", id, e);
      }
      return Response.json({ ok: true });
    }
    if (action === "checkin") {
      if (reg.status !== "confirmed") return Response.json({ error: "Confirm the registration first" }, { status: 400 });
      await ref.update({ checked_in: true, checked_in_at: FieldValue.serverTimestamp() });
      return Response.json({ ok: true });
    }
    if (action === "undo_checkin") {
      await ref.update({ checked_in: false, checked_in_at: null });
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Bad action" }, { status: 400 });
  } catch (e) {
    return errorResponse(e);
  }
}
