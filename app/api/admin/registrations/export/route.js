import { adminDb } from "../../../../../lib/firebaseAdmin";
import { requireRole, errorResponse } from "../../../../../lib/serverAuth";

const esc = (v) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // CSV/Excel formula injection guard
  return `"${s.replace(/"/g, '""')}"`;
};

// GET ?event=<slug> -> CSV
export async function GET(req) {
  try {
    const me = await requireRole(req, ["superadmin", "domainHead"]);
    if (!(me.role === "superadmin" || me.domainId === "events"))
      return Response.json({ error: "Forbidden" }, { status: 403 });
    const slug = new URL(req.url).searchParams.get("event");
    if (!slug) return Response.json({ error: "event required" }, { status: 400 });

    const db = adminDb();
    const labels = {};
    for (const q of (await db.collection(`events/${slug}/questions`).get()).docs) labels[q.id] = q.data().label;
    const regs = (await db.collection("registrations").where("event", "==", slug).get()).docs.map((d) => d.data());

    const head = ["Name","SRN","Email","Phone","Year","Branch","Team","Team members","Fee","Status","Checked in","Registered at","Answers"];
    const rows = regs.map((r) => [
      r.name, r.srn, r.email, r.phone, r.year, r.branch, r.team_name || "",
      (r.members || []).map((m) => `${m.name} (${m.srn})`).join("; "),
      r.fee, r.status, r.checked_in ? "Yes" : "No",
      r.created_at?.toDate?.().toISOString() || "",
      Object.entries(r.answers || {}).map(([k, v]) => `${labels[k] || k}: ${v}`).join(" | "),
    ]);
    const csv = [head, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="registrations-${slug}.csv"`,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
