import "server-only";
import { adminAuth, adminDb } from "./firebaseAdmin";

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Verifies the Firebase ID token and loads the role from users/{email} via the Admin SDK.
export async function requireRole(req, roles) {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) throw new HttpError(401, "Not signed in");
  let decoded;
  try { decoded = await adminAuth().verifyIdToken(token); }
  catch { throw new HttpError(401, "Invalid token"); }
  if (!decoded.email || !decoded.email_verified) throw new HttpError(401, "Email not verified");

  const email = decoded.email.toLowerCase();
  const snap = await adminDb().doc(`users/${email}`).get();
  if (!snap.exists) throw new HttpError(403, "No access");
  const u = snap.data();
  if (!roles.includes(u.role)) throw new HttpError(403, "No access");
  return { email, role: u.role, domainId: u.domainId || null };
}

export function errorResponse(e) {
  const status = e instanceof HttpError ? e.status : 500;
  return Response.json({ error: status === 500 ? "Server error" : e.message }, { status });
}
