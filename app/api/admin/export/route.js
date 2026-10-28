import { adminDb } from "../../../../lib/firebaseAdmin";
import { requireRole, errorResponse } from "../../../../lib/serverAuth";

const esc = (v) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // CSV/Excel formula injection guard
  return `"${s.replace(/"/g, '""')}"`;
};

// GET /api/admin/export?domainId=optional  (superadmin only)
export async function GET(req) {
  try {
    await requireRole(req, ["superadmin"]);
    const domainId = new URL(req.url).searchParams.get("domainId");
    let q = adminDb().collection("applications");
    if (domainId) q = q.where("domainId", "==", domainId);
    const apps = (await q.get()).docs.map((d) => ({ id: d.id, ...d.data() }));

    const domains = {}, labels = {};
    for (const d of (await adminDb().collection("domains").get()).docs) {
      domains[d.id] = d.data().name;
      for (const qd of (await d.ref.collection("questions").get()).docs) labels[qd.id] = qd.data().label;
    }

    const head = ["Name","SRN","Email","Phone","Year","Branch","Domain","Status","Applied at","Shortlisted at","Answers"];
    const rows = apps.map((a) => [
      a.name, a.srn, a.email, a.phone, a.year, a.branch,
      domains[a.domainId] || a.domainId, a.status,
      a.createdAt?.toDate?.().toISOString() || "",
      a.shortlistedAt?.toDate?.().toISOString() || "",
      Object.entries(a.answers || {}).map(([k, v]) => `${labels[k] || k}: ${v}`).join(" | "),
    ]);
    const csv = [head, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="applications${domainId ? "-" + domainId : ""}.csv"`,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
