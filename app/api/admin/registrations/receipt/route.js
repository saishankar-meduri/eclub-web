import { adminDb } from "../../../../../lib/firebaseAdmin";
import { requireRole, errorResponse } from "../../../../../lib/serverAuth";

// GET ?id=<registration id> -> { data_url }
export async function GET(req) {
  try {
    const me = await requireRole(req, ["superadmin", "domainHead"]);
    if (!(me.role === "superadmin" || me.domainId === "events"))
      return Response.json({ error: "Forbidden" }, { status: 403 });
    const id = new URL(req.url).searchParams.get("id") || "";
    const s = await adminDb().doc(`registration_receipts/${id}`).get();
    if (!s.exists) return Response.json({ error: "No receipt" }, { status: 404 });
    return Response.json({ data_url: s.data().data_url });
  } catch (e) {
    return errorResponse(e);
  }
}
