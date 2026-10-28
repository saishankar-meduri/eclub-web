"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function Applicants({ domainId, auth }) {
  const [apps, setApps] = useState([]);
  const [labels, setLabels] = useState({});
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState(new Set());
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const cs = [where("domainId", "==", domainId)];
    if (status !== "all") cs.push(where("status", "==", status));
    const [a, q] = await Promise.all([
      getDocs(query(collection(db, "applications"), ...cs, orderBy("createdAt", "desc"))),
      getDocs(collection(db, `domains/${domainId}/questions`)),
    ]);
    setApps(a.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLabels(Object.fromEntries(q.docs.map((d) => [d.id, d.data().label])));
    setSel(new Set());
  }, [domainId, status]);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s ? apps.filter((a) => [a.name, a.srn, a.email].some((v) => v.toLowerCase().includes(s))) : apps;
  }, [apps, search]);

  async function act(ids, newStatus) {
    if (!ids.length) return;
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/applications/status", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await auth.token()}` },
      body: JSON.stringify({ ids, status: newStatus }),
    });
    setMsg(r.ok ? `Updated ${ids.length}` : "Failed");
    setBusy(false);
    setOpen(null);
    load();
  }

  const toggle = (id) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  const allOn = shown.length > 0 && shown.every((a) => sel.has(a.id));

  return (
    <div>
      <div className="rc-row">
        <input placeholder="Search name / SRN / email" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="applied">Applied</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <button className="rc-btn" disabled={busy || !sel.size} onClick={() => act([...sel], "shortlisted")}>Shortlist selected ({sel.size})</button>
      <button className="rc-btn ghost" disabled={busy || !sel.size} onClick={() => act([...sel], "rejected")}>Reject selected</button>
      {msg && <span className="rc-muted">{msg}</span>}

      <table>
        <thead>
          <tr>
            <th><input type="checkbox" checked={allOn} onChange={() => setSel(allOn ? new Set() : new Set(shown.map((a) => a.id)))} /></th>
            <th>Name</th><th>SRN</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          {shown.map((a) => (
            <tr key={a.id}>
              <td><input type="checkbox" checked={sel.has(a.id)} onChange={() => toggle(a.id)} /></td>
              <td>{a.name}</td><td>{a.srn}</td>
              <td><span className="rc-badge">{a.status}</span></td>
              <td><button className="rc-btn ghost" onClick={() => setOpen(a)}>View</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!shown.length && <p className="rc-muted">No applicants.</p>}

      {open && (
        <div className="rc-card" style={{ marginTop: 16 }}>
          <h3>{open.name} <span className="rc-badge">{open.status}</span></h3>
          <p className="rc-muted">{open.srn} · {open.email} · {open.phone} · Year {open.year} · {open.branch}</p>
          {Object.entries(open.answers || {}).map(([k, v]) => (
            <div key={k}>
              <label>{labels[k] || `(deleted question ${k})`}</label>
              <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{v}</p>
            </div>
          ))}
          <button className="rc-btn" disabled={busy} onClick={() => act([open.id], "shortlisted")}>Shortlist</button>
          <button className="rc-btn ghost" disabled={busy} onClick={() => act([open.id], "rejected")}>Reject</button>
          <button className="rc-btn ghost" onClick={() => setOpen(null)}>Close</button>
        </div>
      )}
    </div>
  );
}
