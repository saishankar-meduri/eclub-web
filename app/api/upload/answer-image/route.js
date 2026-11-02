import crypto from "crypto";
import { rateLimit, clientIp } from "../../../../lib/rateLimit.server";

const MAX_BYTES = 2_500_000;
const fail = (error, status = 400) => Response.json({ error }, { status });

function sniff(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return "image/png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

// Public upload for application answers (e.g. design portfolios). The Cloudinary secret stays on
// the server; abuse is limited by size, file-type sniffing and a per-IP rate limit.
export async function POST(req) {
  const rl = await rateLimit(`ansimg:ip:${clientIp(req)}`, 10, 600);
  if (!rl.ok) return fail("Too many uploads. Try again in a few minutes.", 429);

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !secret) return fail("Image uploads are not configured", 500);

  let form;
  try { form = await req.formData(); } catch { return fail("Bad upload"); }
  const file = form.get("file");
  if (!file || typeof file === "string") return fail("No file");
  if (file.size > MAX_BYTES) return fail("Image is too large (max 2.5 MB)", 413);

  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buf);
  if (!mime) return fail("Only JPG, PNG or WebP images");

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "eclub/applications";
  const allowed = "jpg,jpeg,png,webp";
  const signature = crypto
    .createHash("sha1")
    .update(`allowed_formats=${allowed}&folder=${folder}&timestamp=${timestamp}${secret}`)
    .digest("hex");

  const fd = new FormData();
  fd.append("file", new Blob([buf], { type: mime }), "upload");
  fd.append("api_key", apiKey);
  fd.append("timestamp", String(timestamp));
  fd.append("signature", signature);
  fd.append("folder", folder);
  fd.append("allowed_formats", allowed);

  const r = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.secure_url) return fail("Upload failed. Try again.", 502);
  return Response.json({ url: j.secure_url });
}
