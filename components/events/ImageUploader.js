"use client";
import { useRef, useState } from "react";
import { optimize } from "../../lib/images";

const MAX = 10;

// Downscale in the browser first: faster uploads, stays far below Cloudinary limits.
async function shrink(file, max = 1600) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return (await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85))) || file;
  } catch {
    return file;
  }
}

export default function ImageUploader({ images, onChange, getToken }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [url, setUrl] = useState("");
  const fileRef = useRef(null);

  async function upload(files) {
    setErr("");
    const list = [...files].slice(0, MAX - images.length);
    if (!list.length) return setErr(`Max ${MAX} images`);
    setBusy(true);
    const added = [];
    try {
      const token = await getToken();
      for (const f of list) {
        if (!/^image\/(jpeg|png|webp)$/.test(f.type)) throw new Error("Only JPG, PNG or WebP");
        const sigRes = await fetch("/api/admin/upload-sign", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        const sig = await sigRes.json();
        if (!sigRes.ok) throw new Error(sig.error || "Could not start upload");
        const fd = new FormData();
        fd.append("file", await shrink(f));
        fd.append("api_key", sig.apiKey);
        fd.append("timestamp", sig.timestamp);
        fd.append("signature", sig.signature);
        fd.append("folder", sig.folder);
        fd.append("allowed_formats", sig.allowedFormats);
        const r = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: fd });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error?.message || "Upload failed");
        added.push(j.secure_url);
      }
    } catch (e) {
      setErr(e.message);
    }
    if (added.length) onChange([...images, ...added]);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function addUrl() {
    setErr("");
    const u = url.trim();
    if (!/^https:\/\/\S+$/i.test(u)) return setErr("Image URL must start with https://");
    if (images.length >= MAX) return setErr(`Max ${MAX} images`);
    onChange([...images, u]);
    setUrl("");
  }

  const move = (i) => { const a = [...images]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; onChange(a); };
  const remove = (i) => onChange(images.filter((_, j) => j !== i));

  return (
    <div>
      <label>Images (the first one is the cover)</label>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy}
        onChange={(e) => upload(e.target.files)} />
      {busy && <p className="rc-muted">Uploading…</p>}
      <div className="rc-row" style={{ marginTop: 8 }}>
        <input placeholder="or paste an image URL (https://…)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button type="button" className="rc-btn ghost" style={{ flex: "none", marginTop: 0 }} onClick={addUrl}>Add URL</button>
      </div>
      {err && <div className="rc-err">{err}</div>}
      <div className="rc-thumbs">
        {images.map((src, i) => (
          <div className="rc-thumb" key={src}>
            <img src={optimize(src, 300)} alt="" />
            {i > 0 && <button type="button" className="rc-btn ghost" onClick={() => move(i)}>←</button>}
            <button type="button" className="rc-btn ghost" onClick={() => remove(i)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
