"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../../../lib/firebase";
import AdminGate from "../../../../../components/AdminGate";

export default function Page() {
  return (
    <AdminGate roles={["superadmin", "domainHead"]} allow={(p) => p.role === "superadmin" || p.domainId === "events"}>
      {(auth) => <Panel auth={auth} />}
    </AdminGate>
  );
}

const STATUS_LABEL = { pending: "Pending", confirmed: "Confirmed", rejected: "Rejected" };

function Panel({ auth }) {
  const { slug } = useParams();
  const [rows, setRows] = useState([]);
  const [labels, setLabels] = useState({});
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [notIn, setNotIn] = useState(false);
  const [open, setOpen] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const call = useCallback(async (url, opts = {}) => {
    const r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${await auth.token()}` } });
    return r;
  }, [auth]);

  const load = useCallback(async () => {
    const r = await call(`/api/admin/registrations?event=${encodeURIComponent(slug)}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return setMsg(j.error || "Could not load registrations");
    setRows(j.rows);
    setOpen((o) => (o ? j.rows.find((x) => x.id === o.id) || null : null));
  }, [call, slug]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    getDocs(collection(db, `events/${slug}/questions`))
      .then((s) => setLabels(Object.fromEntries(s.docs.map((d) => [d.id, d.data().label]))))
      .catch(() => {});
  }, [slug]);

  const counts = useMemo(() => ({
    total: rows.length,
    confirmed: rows.filter((r) => r.status === "confirmed").length,
    pending: rows.filter((r) => r.status === "pending").length,
    in: rows.filter((r) => r.checked_in).length,
  }), [rows]);

  const shown = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) =>
      (status === "all" || r.status === status) &&
      (!notIn || (r.status === "confirmed" && !r.checked_in)) &&
      (!s || [r.name, r.srn, r.email, r.team_name || "", ...(r.members || []).map((m) => m.srn)].some((v) => String(v).toLowerCase().includes(s)))
    );
  }, [rows, status, search, notIn]);

  async function act(id, action) {
    setBusy(true); setMsg("");
    const r = await call("/api/admin/registrations/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? "Updated" : j.error || "Failed");
    setBusy(false);
    load();
  }

  async function showReceipt(id) {
    setReceipt("loading");
    const r = await call(`/api/admin/registrations/receipt?id=${encodeURIComponent(id)}`);
    const j = await r.json().catch(() => ({}));
    setReceipt(r.ok ? j.data_url : null);
    if (!r.ok) setMsg(j.error || "No receipt");
  }

  async function exportCsv() {
    const r = await call(`/api/admin/registrations/export?event=${encodeURIComponent(slug)}`);
    if (!r.ok) return setMsg("Export failed");
    const url = URL.createObjectURL(await r.blob());
    Object.assign(document.createElement("a"), { href: url, download: `registrations-${slug}.csv` }).click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="rc-row">
        <h1>Registrations</h1>
        <a className="rc-btn ghost" href="/admin/events">Back to events</a>
        <button className="rc-btn ghost" onClick={exportCsv}>Export CSV</button>
      </div>
      <p className="rc-muted">
        {slug} · {counts.total} total · {counts.confirmed} confirmed · {counts.pending} pending · {counts.in} checked in
      </p>
      {msg && <p className="rc-muted">{msg}</p>}

      <div className="rc-row">
        <input placeholder="Search name, SRN, email, team" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="rejected">Rejected</option>
        </select>
        <label style={{ margin: 0 }}>
          <input type="checkbox" checked={notIn} onChange={(e) => setNotIn(e.target.checked)} /> Not checked in yet
        </label>
      </div>

      <table>
        <thead><tr><th>Name</th><th>SRN</th><th>Team</th><th>Status</th><th>In</th><th></th></tr></thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.srn}</td>
              <td>{r.team_name || "—"}</td>
              <td><span className="rc-badge">{STATUS_LABEL[r.status] || r.status}</span></td>
              <td>{r.checked_in ? "✓" : ""}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                {r.status === "confirmed" && !r.checked_in && (
                  <button className="rc-btn" disabled={busy} onClick={() => act(r.id, "checkin")}>Check in</button>
                )}
                <button className="rc-btn ghost" onClick={() => { setOpen(r); setReceipt(null); }}>View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!shown.length && <p className="rc-muted">No registrations.</p>}

      {open && (
        <div className="rc-card" style={{ marginTop: 16 }}>
          <h3>{open.name} <span className="rc-badge">{STATUS_LABEL[open.status] || open.status}</span></h3>
          <p className="rc-muted">{open.srn} · {open.email} · {open.phone} · Year {open.year} · {open.branch}</p>
          {open.team_name && (
            <>
              <label>Team: {open.team_name}</label>
              <p style={{ margin: 0 }}>{(open.members || []).map((m) => `${m.name} (${m.srn})`).join(", ") || "No teammates"}</p>
            </>
          )}
          {Object.entries(open.answers || {}).map(([k, v]) => (
            <div key={k}>
              <label>{labels[k] || `(question ${k})`}</label>
              <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{v}</p>
            </div>
          ))}
          {open.has_receipt && (
            <div>
              <label>Payment: ₹{open.fee}</label>
              {!receipt && <button className="rc-btn ghost" onClick={() => showReceipt(open.id)}>Show receipt</button>}
              {receipt === "loading" && <p className="rc-muted">Loading…</p>}
              {receipt && receipt !== "loading" && (
                <img src={receipt} alt="Payment receipt" style={{ maxWidth: "100%", marginTop: 8, borderRadius: 8, border: "1px solid var(--line)" }} />
              )}
            </div>
          )}
          <div>
            {open.status !== "confirmed" && <button className="rc-btn" disabled={busy} onClick={() => act(open.id, "confirm")}>Confirm</button>}
            {open.status !== "rejected" && <button className="rc-btn ghost" disabled={busy} onClick={() => act(open.id, "reject")}>Reject</button>}
            {open.status === "confirmed" && !open.checked_in && <button className="rc-btn" disabled={busy} onClick={() => act(open.id, "checkin")}>Check in</button>}
            {open.checked_in && <button className="rc-btn ghost" disabled={busy} onClick={() => act(open.id, "undo_checkin")}>Undo check-in</button>}
            <button className="rc-btn ghost" onClick={() => setOpen(null)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
