"use client";
import { useRef, useState } from "react";
import { optimize } from "../../lib/images";

async function squareJpeg(file, size = 600) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(bmp.width, bmp.height);
  const c = document.createElement("canvas");
  c.width = c.height = Math.min(size, s);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, c.width, c.height); // center crop
  return await new Promise((r) => c.toBlob(r, "image/jpeg", 0.88));
}

export default function ContactPhotoInput({ value, onChange, getToken }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef(null);

  async function upload(file) {
    if (!file) return;
    setErr("");
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setErr("Only JPG, PNG or WebP");
    setBusy(true);
    try {
      const sigRes = await fetch("/api/admin/upload-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` },
        body: JSON.stringify({ purpose: "contacts" }),
      });
      const sig = await sigRes.json();
      if (!sigRes.ok) throw new Error(sig.error || "Could not start upload");
      const fd = new FormData();
      fd.append("file", await squareJpeg(file), "photo.jpg");
      fd.append("api_key", sig.apiKey);
      fd.append("timestamp", sig.timestamp);
      fd.append("signature", sig.signature);
      fd.append("folder", sig.folder);
      fd.append("allowed_formats", sig.allowedFormats);
      const r = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.message || "Upload failed");
      onChange(j.secure_url);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
    if (ref.current) ref.current.value = "";
  }

  return (
    <div>
      <label>Photo (optional)</label>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ width: 84, height: 84, borderRadius: "50%", overflow: "hidden", border: "1px solid var(--line)", display: "grid", placeItems: "center", background: "var(--surface-subtle, transparent)", flex: "none" }}>
          {value ? <img src={optimize(value, 200)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="rc-muted">No photo</span>}
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
          <p className="rc-muted" style={{ marginTop: 6 }}>{busy ? "Uploading…" : "Square photos look best. It is cropped to a circle on the page."}</p>
          {value && !busy && <button type="button" className="rc-btn ghost" style={{ margin: 0, padding: "2px 12px" }} onClick={() => onChange("")}>Remove photo</button>}
          {err && <div className="rc-err">{err}</div>}
        </div>
      </div>
    </div>
  );
}
