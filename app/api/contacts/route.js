import { adminDb } from "../../../lib/firebaseAdmin";
import { errorResponse } from "../../../lib/serverAuth";

// Public endpoint to read published contacts
export async function GET() {
  try {
    const snap = await adminDb().collection("contacts").where("published", "==", true).get();
    const contacts = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || "",
          designation: data.designation || "",
          group: data.group || data.category || "Previous Core Team — Batch 2026",
          category: data.group || data.category || "Previous Core Team — Batch 2026",
          phone: data.phone || "",
          email: data.email || "",
          order: typeof data.order === "number" ? data.order : 999,
          published: data.published === true,
          created_at: data.created_at?.toDate().toISOString() ?? null,
          updated_at: data.updated_at?.toDate().toISOString() ?? null,
        };
      })
      .sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name);
      });

    return Response.json({ contacts });
  } catch (e) {
    return errorResponse(e);
  }
}

