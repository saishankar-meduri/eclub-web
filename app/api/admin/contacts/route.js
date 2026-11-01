import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../../../../lib/firebaseAdmin.js";
import { requireRole, errorResponse } from "../../../../lib/serverAuth.js";
import { INITIAL_CONTACTS } from "../../../../lib/initialContacts.js";

// Server-side authorization check: ONLY superadmins can access or modify contacts
async function auth(req) {
  const me = await requireRole(req, ["superadmin"]);
  return me;
}

const col = () => adminDb().collection("contacts");
const bad = (m) => Response.json({ error: m }, { status: 400 });

function clean(b) {
  const name = String(b.name || "").trim();
  const designation = String(b.designation || "").trim();
  const group = String(b.group || b.category || "Previous Core Team — Batch 2026").trim();
  const phone = String(b.phone || "").trim();
  const email = String(b.email || "").trim();
  const order = Number.isFinite(Number(b.order)) ? Number(b.order) : 1;
  const published = b.published !== false;

  if (!name || name.length > 120) {
    return { error: "Name is required (max 120 characters)" };
  }
  if (!designation || designation.length > 120) {
    return { error: "Designation is required (max 120 characters)" };
  }
  if (!group || group.length > 120) {
    return { error: "Group/Category is required (max 120 characters)" };
  }
  if (phone.length > 30) {
    return { error: "Phone number is too long (max 30 characters)" };
  }
  if (email.length > 254) {
    return { error: "Email address is too long (max 254 characters)" };
  }

  return {
    name,
    designation,
    group,
    category: group,
    phone,
    email,
    order,
    published,
  };
}

export async function GET(req) {
  try {
    await auth(req);
    const snap = await col().get();
    const list = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          created_at: data.created_at?.toDate().toISOString() ?? null,
          updated_at: data.updated_at?.toDate().toISOString() ?? null,
        };
      })
      .sort((a, b) => {
        const orderA = typeof a.order === "number" ? a.order : 999;
        const orderB = typeof b.order === "number" ? b.order : 999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || "").localeCompare(b.name || "");
      });
    return Response.json({ contacts: list });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req) {
  try {
    await auth(req);
    const body = await req.json().catch(() => ({}));

    // Idempotent initial seed action triggered by superadmin
    if (body.action === "seed_default") {
      const batch = adminDb().batch();
      let count = 0;
      for (const item of INITIAL_CONTACTS) {
        const ref = col().doc(item.id);
        const existing = await ref.get();
        if (!existing.exists) {
          batch.set(ref, {
            ...item,
            category: item.group,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
          });
          count++;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
      return Response.json({ ok: true, seededCount: count });
    }

    const c = clean(body);
    if (c.error) return bad(c.error);

    const ref = await col().add({
      ...c,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
    return Response.json({ ok: true, id: ref.id });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(req) {
  try {
    await auth(req);
    const b = await req.json().catch(() => ({}));
    if (!b.id) return bad("Missing id");
    const c = clean(b);
    if (c.error) return bad(c.error);

    const ref = col().doc(String(b.id));
    const snap = await ref.get();
    if (!snap.exists) return Response.json({ error: "Contact not found" }, { status: 404 });

    await ref.update({
      ...c,
      updated_at: FieldValue.serverTimestamp(),
    });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req) {
  try {
    await auth(req);
    const b = await req.json().catch(() => ({}));
    const items = Array.isArray(b.items) ? b.items : [];
    if (!items.length) return bad("Missing items array for reordering");

    const batch = adminDb().batch();
    for (const item of items) {
      if (item && item.id) {
        const ref = col().doc(String(item.id));
        const order = Number(item.order);
        if (Number.isFinite(order)) {
          batch.update(ref, {
            order,
            updated_at: FieldValue.serverTimestamp(),
          });
        }
      }
    }
    await batch.commit();
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req) {
  try {
    await auth(req);
    const { id } = await req.json().catch(() => ({}));
    if (!id) return bad("Missing id");
    const ref = col().doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return Response.json({ error: "Contact not found" }, { status: 404 });
    await ref.delete();
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
