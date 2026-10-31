import { adminAuth, adminDb } from "../../../lib/firebaseAdmin";

export async function GET(req) {
  try {
    const h = req.headers.get("authorization") || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return Response.json({ tier: "normal" }, { status: 401 });

    const decoded = await adminAuth().verifyIdToken(token);
    const email = (decoded.email || "").trim().toLowerCase();
    if (!email || !decoded.email_verified) return Response.json({ tier: "normal" });

    // 1. Check admin / explicit user role in users/{email}
    const userSnap = await adminDb().doc(`users/${email}`).get();
    if (userSnap.exists) {
      const u = userSnap.data();
      if (u.role === "superadmin" || u.role === "domainHead") {
        return Response.json({
          tier: "admin",
          role: u.role,
          domainId: u.domainId || null,
        });
      }
      if (u.role === "selected" || u.selected === true) {
        return Response.json({
          tier: "selected",
          shortlistedDomains: [],
        });
      }
    }

    // 2. Check applications for shortlisted / selected status
    const appSnap = await adminDb().collection("applications").where("email", "==", email).get();
    const apps = appSnap.docs.map((d) => d.data());
    const shortlisted = apps.filter(
      (a) => a.status === "shortlisted" || a.status === "selected"
    );

    if (shortlisted.length > 0) {
      const domainNames = await Promise.all(
        shortlisted.map(async (a) => {
          const dom = await adminDb().doc(`domains/${a.domainId}`).get();
          return dom.data()?.name || a.domainId;
        })
      );
      return Response.json({
        tier: "selected",
        shortlistedDomains: domainNames,
        applicationsCount: apps.length,
      });
    }

    return Response.json({
      tier: "normal",
      applicationsCount: apps.length,
    });
  } catch {
    return Response.json({ tier: "normal" });
  }
}
