"use client";
import { useRef, useState } from "react";

const MAX_IMAGES = 3;

async function shrink(file, max = 1600) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return (await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85))) || file;
  } catch {
    return file;
  }
}

// value = image URLs separated by newlines (that's how it's stored as the answer string)
export default function ImageAnswerInput({ value, onChange, max = MAX_IMAGES }) {
  const urls = value ? value.split("\n").filter(Boolean) : [];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef(null);

  async function upload(files) {
    setErr("");
    const list = [...files].slice(0, max - urls.length);
    if (!list.length) return setErr(`You can add up to ${max} images`);
    setBusy(true);
    const added = [];
    try {
      for (const f of list) {
        if (!/^image\/(jpeg|png|webp)$/.test(f.type)) throw new Error("Only JPG, PNG or WebP images");
        const fd = new FormData();
        fd.append("file", await shrink(f), "upload.jpg");
        const r = await fetch("/api/upload/answer-image", { method: "POST", body: fd });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Upload failed");
        added.push(j.url);
      }
    } catch (e) {
      setErr(e.message);
    }
    if (added.length) onChange([...urls, ...added].join("\n"));
    setBusy(false);
    if (ref.current) ref.current.value = "";
  }

  return (
    <div>
      {urls.length < max && (
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy}
          onChange={(e) => upload(e.target.files)} />
      )}
      <p className="rc-muted" style={{ marginTop: 6 }}>
        {busy ? "Uploading…" : `Up to ${max} images (JPG, PNG or WebP).`}
      </p>
      {err && <div className="rc-err">{err}</div>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
        {urls.map((u) => (
          <div key={u} style={{ width: 120 }}>
            <img src={u} alt="" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }} />
            <button type="button" className="rc-btn ghost" style={{ margin: "4px 0 0", padding: "2px 10px", fontSize: "0.8rem" }}
              onClick={() => onChange(urls.filter((x) => x !== u).join("\n"))}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
