"use client";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { WA_RE } from "../../lib/constants";

export default function DomainSettings({ domainId }) {
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const [d, p] = await Promise.all([
        getDoc(doc(db, "domains", domainId)),
        getDoc(doc(db, "domains", domainId, "private", "settings")),
      ]);
      setF({ name: d.data()?.name, description: d.data()?.description || "", open: !!d.data()?.open, whatsappLink: p.data()?.whatsappLink || "" });
    })();
  }, [domainId]);

  async function save() {
    setMsg("");
    if (f.whatsappLink && !WA_RE.test(f.whatsappLink.trim())) return setMsg("WhatsApp link must start with https://chat.whatsapp.com/");
    try {
      await updateDoc(doc(db, "domains", domainId), { open: f.open, description: f.description });
      await setDoc(doc(db, "domains", domainId, "private", "settings"), { whatsappLink: f.whatsappLink.trim() }, { merge: true });
      setMsg("Saved");
    } catch { setMsg("Save failed"); }
  }

  if (!f) return <p className="rc-muted">Loading…</p>;
  return (
    <div className="rc-card">
      <h3>{f.name}</h3>
      <label>Description</label>
      <textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <label>WhatsApp group link (shown only to shortlisted applicants)</label>
      <input value={f.whatsappLink} placeholder="https://chat.whatsapp.com/…" onChange={(e) => setF({ ...f, whatsappLink: e.target.value })} />
      <label><input type="checkbox" checked={f.open} onChange={(e) => setF({ ...f, open: e.target.checked })} /> Applications open</label>
      <button className="rc-btn" onClick={save}>Save</button>
      {msg && <span className="rc-muted">{msg}</span>}
    </div>
  );
}
