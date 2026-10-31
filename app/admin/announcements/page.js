"use client";
import { useCallback, useEffect, useState } from "react";
import AdminGate from "../../../components/AdminGate";

export default function Page() {
  return (
    <AdminGate roles={["superadmin", "domainHead"]} allow={(p) => p.role === "superadmin" || p.domainId === "events"}>
      {(auth) => <Manager auth={auth} />}
    </AdminGate>
  );
}

const blank = { title: "", body: "", published: true };

function Manager({ auth }) {
  const [list, setList] = useState(null);
  const [f, setF] = useState(null); // null = list view
  const [id, setId] = useState(null); // null = new
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const call = useCallback(
    async (method, payload) => {
      const r = await fetch("/api/admin/announcements", {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await auth.token()}` },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Request failed");
      return j;
    },
    [auth]
  );

  const load = useCallback(async () => {
    try { setList((await call("GET")).announcements); }
    catch (e) { setErr(e.message); setList([]); }
  }, [call]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setErr("");
    if (!f.title.trim() || !f.body.trim()) return setErr("Title and body are required");
    setBusy(true);
    try {
      await call(id ? "PUT" : "POST", { ...f, id });
      setF(null);
      load();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  async function togglePublish(a) {
    try { await call("PUT", { id: a.id, title: a.title, body: a.body, published: !a.published }); load(); }
    catch (e) { setErr(e.message); }
  }

  async function remove(a) {
    if (!confirm(`Delete "${a.title}"? This can't be undone.`)) return;
    try { await call("DELETE", { id: a.id }); load(); } catch (e) { setErr(e.message); }
  }

  return (
    <>
      <div className="rc-row">
        <h1>Announcements</h1>
        <a className="rc-btn ghost" href={auth.profile.role === "superadmin" ? "/admin/superadmin" : "/admin/recruitment"}>Back</a>
        <button className="rc-btn ghost" onClick={auth.signOut}>Sign out</button>
      </div>

      {!f && (
        <div className="rc-card">
          <button className="rc-btn" onClick={() => { setId(null); setErr(""); setF(blank); }}>New announcement</button>
          <p className="rc-muted">Changes show on the public site within about a minute.</p>
          {err && <div className="rc-err">{err}</div>}
          {list === null ? <p className="rc-muted">Loading…</p> : (
            <table>
              <thead><tr><th>Title</th><th>Posted</th><th>Visible</th><th></th></tr></thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id}>
                    <td>{a.title}</td>
                    <td>{a.created_at ? new Date(a.created_at).toLocaleDateString("en-IN") : ""}</td>
                    <td>{a.published ? "Yes" : "Draft"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="rc-btn ghost" onClick={() => { setId(a.id); setErr(""); setF({ title: a.title, body: a.body, published: !!a.published }); }}>Edit</button>
                      <button className="rc-btn ghost" onClick={() => togglePublish(a)}>{a.published ? "Unpublish" : "Publish"}</button>
                      <button className="rc-btn ghost" onClick={() => remove(a)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {list?.length === 0 && !err && <p className="rc-muted">No announcements yet.</p>}
        </div>
      )}

      {f && (
        <div className="rc-card">
          <h3>{id ? "Edit announcement" : "New announcement"}</h3>
          <label htmlFor="a-title">Title</label>
          <input id="a-title" maxLength={150} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <label htmlFor="a-body">Body</label>
          <textarea id="a-body" rows={8} maxLength={5000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
          <label><input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} /> Published (visible on the site)</label>
          {err && <div className="rc-err">{err}</div>}
          <button className="rc-btn" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
          <button className="rc-btn ghost" onClick={() => setF(null)}>Cancel</button>
        </div>
      )}
    </>
  );
}
