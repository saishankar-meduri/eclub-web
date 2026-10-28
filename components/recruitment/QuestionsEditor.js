"use client";
import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "../../lib/firebase";

const blank = { label: "", type: "short", options: "", required: true };

export default function QuestionsEditor({ domainId }) {
  const [qs, setQs] = useState([]);
  const [f, setF] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState("");
  const col = `domains/${domainId}/questions`;

  const load = useCallback(async () => {
    const s = await getDocs(query(collection(db, col), orderBy("order")));
    setQs(s.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, [col]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setErr("");
    const options = f.type === "mcq" ? f.options.split("\n").map((o) => o.trim()).filter(Boolean) : [];
    if (!f.label.trim()) return setErr("Label required");
    if (f.type === "mcq" && options.length < 2) return setErr("MCQ needs at least 2 options (one per line)");
    const data = { label: f.label.trim(), type: f.type, options, required: f.required };
    try {
      if (editId) await updateDoc(doc(db, col, editId), data);
      else await addDoc(collection(db, col), { ...data, order: qs.length ? Math.max(...qs.map((q) => q.order)) + 1 : 0 });
      setF(blank); setEditId(null); load();
    } catch { setErr("Save failed"); }
  }

  async function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= qs.length) return;
    const b = writeBatch(db);
    b.update(doc(db, col, qs[i].id), { order: qs[j].order });
    b.update(doc(db, col, qs[j].id), { order: qs[i].order });
    await b.commit();
    load();
  }

  async function remove(q) {
    if (!confirm(`Delete "${q.label}"? Existing answers to it stay in applications.`)) return;
    await deleteDoc(doc(db, col, q.id));
    load();
  }

  function edit(q) {
    setEditId(q.id);
    setF({ label: q.label, type: q.type, options: q.options.join("\n"), required: q.required });
  }

  return (
    <div>
      <div className="rc-card">
        <h3>{editId ? "Edit question" : "Add question"}</h3>
        <label>Label</label>
        <input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
        <label>Type</label>
        <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
          <option value="short">Short answer</option>
          <option value="long">Long answer</option>
          <option value="mcq">Multiple choice</option>
          <option value="link">Link</option>
        </select>
        {f.type === "mcq" && (
          <>
            <label>Options (one per line)</label>
            <textarea rows={4} value={f.options} onChange={(e) => setF({ ...f, options: e.target.value })} />
          </>
        )}
        <label><input type="checkbox" checked={f.required} onChange={(e) => setF({ ...f, required: e.target.checked })} /> Required</label>
        {err && <div className="rc-err">{err}</div>}
        <button className="rc-btn" onClick={save}>{editId ? "Update" : "Add"}</button>
        {editId && <button className="rc-btn ghost" onClick={() => { setEditId(null); setF(blank); }}>Cancel</button>}
      </div>

      <div className="rc-card">
        <h3>Questions ({qs.length})</h3>
        {qs.length === 0 && <p className="rc-muted">None yet.</p>}
        <table>
          <tbody>
            {qs.map((q, i) => (
              <tr key={q.id}>
                <td>{q.label}{q.required && " *"} <span className="rc-badge">{q.type}</span></td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="rc-btn ghost" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                  <button className="rc-btn ghost" onClick={() => move(i, 1)} disabled={i === qs.length - 1}>↓</button>
                  <button className="rc-btn ghost" onClick={() => edit(q)}>Edit</button>
                  <button className="rc-btn ghost" onClick={() => remove(q)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
