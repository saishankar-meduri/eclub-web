import crypto from "crypto";
import { requireRole, errorResponse } from "../../../../lib/serverAuth";

// Returns a short-lived signed upload ticket for Cloudinary. The API secret never reaches the browser.
//  purpose "events"   -> superadmins and the events-domain head
//  purpose "contacts" -> superadmins only
export async function POST(req) {
  try {
    const me = await requireRole(req, ["superadmin", "domainHead"]);
    const body = await req.json().catch(() => ({}));
    const purpose = body.purpose === "contacts" ? "contacts" : "events";
    if (purpose === "contacts" && me.role !== "superadmin")
      return Response.json({ error: "Forbidden" }, { status: 403 });
    if (purpose === "events" && me.role === "domainHead" && me.domainId !== "events")
      return Response.json({ error: "Forbidden" }, { status: 403 });

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !secret)
      return Response.json({ error: "Image uploads are not configured" }, { status: 500 });

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = purpose === "contacts" ? "eclub/contacts" : "eclub/events";
    const allowedFormats = "jpg,jpeg,png,webp";
    const signature = crypto
      .createHash("sha1")
      .update(`allowed_formats=${allowedFormats}&folder=${folder}&timestamp=${timestamp}${secret}`)
      .digest("hex");

    return Response.json({ cloudName, apiKey, timestamp, signature, folder, allowedFormats });
  } catch (e) {
    return errorResponse(e);
  }
}
