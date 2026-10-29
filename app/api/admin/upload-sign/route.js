import crypto from "crypto";
import { requireRole, errorResponse } from "../../../../lib/serverAuth";

// Returns a short-lived signed upload ticket for Cloudinary. Only superadmins and the
// events-domain head can get one, so the API secret never reaches the browser.
export async function POST(req) {
  try {
    const me = await requireRole(req, ["superadmin", "domainHead"]);
    if (me.role === "domainHead" && me.domainId !== "events")
      return Response.json({ error: "Forbidden" }, { status: 403 });

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !secret)
      return Response.json({ error: "Image uploads are not configured" }, { status: 500 });

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "eclub/events";
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
