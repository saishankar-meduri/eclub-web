import { adminDb } from "../../../../lib/firebaseAdmin";
import { requireRole, errorResponse } from "../../../../lib/serverAuth";

// GET ?event=<slug>  -> registrations for one event (no receipt images)
export async function GET(req) {
  try {
    const me = await requireRole(req, ["superadmin", "domainHead"]);
    if (!(me.role === "superadmin" || me.domainId === "events"))
      return Response.json({ error: "Forbidden" }, { status: 403 });
    const slug = new URL(req.url).searchParams.get("event");
    if (!slug) return Response.json({ error: "event required" }, { status: 400 });

    const snap = await adminDb().collection("registrations").where("event", "==", slug).get();
    const rows = snap.docs
      .map((d) => {
        const { all_srns, ...r } = d.data();
        void all_srns;
        return {
          id: d.id,
          ...r,
          created_at: r.created_at?.toDate?.().toISOString() || null,
          checked_in_at: r.checked_in_at?.toDate?.().toISOString() || null,
        };
      })
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return Response.json({ rows });
  } catch (e) {
    return errorResponse(e);
  }
}
