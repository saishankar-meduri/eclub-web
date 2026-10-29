import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../../lib/firebaseAdmin";
import { requireRole, errorResponse } from "../../../../lib/serverAuth";

// Writes go through the Admin SDK, so firestore.rules (announcements: write false) stay unchanged.
// Allowed: superadmin, or the head of the `events` domain (same people who manage events).
async function auth(req) {
  const me = await requireRole(req, ["superadmin", "domainHead"]);
  if (me.role !== "superadmin" && me.domainId !== "events") {
    throw Object.assign(new Error("No access"), { status: 403 });
  }
  return me;
}
const col = () => adminDb().collection("announcements");
const bad = (m) => Response.json({ error: m }, { status: 400 });

function clean(b) {
  const title = String(b.title || "").trim();
  const body = String(b.body || "").trim();
  if (!title || title.length > 150) return { error: "Title required (max 150 characters)" };
  if (!body || body.length > 5000) return { error: "Body required (max 5000 characters)" };
  return { title, body, published: b.published === true };
}

export async function GET(req) {
  try {
    await auth(req);
    const snap = await col().get();
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data(), created_at: d.data().created_at?.toDate().toISOString() ?? null }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return Response.json({ announcements: list });
  } catch (e) { return errorResponse(e); }
}

export async function POST(req) {
  try {
    await auth(req);
    const c = clean(await req.json().catch(() => ({})));
    if (c.error) return bad(c.error);
    const ref = await col().add({ ...c, created_at: FieldValue.serverTimestamp() });
    return Response.json({ ok: true, id: ref.id });
  } catch (e) { return errorResponse(e); }
}

export async function PUT(req) {
  try {
    await auth(req);
    const b = await req.json().catch(() => ({}));
    if (!b.id) return bad("Missing id");
    const c = clean(b);
    if (c.error) return bad(c.error);
    const ref = col().doc(String(b.id));
    if (!(await ref.get()).exists) return Response.json({ error: "Not found" }, { status: 404 });
    await ref.update(c); // created_at is kept
    return Response.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(req) {
  try {
    await auth(req);
    const { id } = await req.json().catch(() => ({}));
    if (!id) return bad("Missing id");
    await col().doc(String(id)).delete();
    return Response.json({ ok: true });
  } catch (e) { return errorResponse(e); }
}
