"use client";
import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, getDoc, setDoc, deleteDoc, doc, query, where, getCountFromServer } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { EMAIL_RE, slugify } from "../../../lib/constants";
import AdminGate from "../../../components/AdminGate";

export default function Page() {
  return <AdminGate roles={["superadmin"]}>{(auth) => <Panel auth={auth} />}</AdminGate>;
}

function Panel({ auth }) {
  const [rows, setRows] = useState([]);
  const [heads, setHeads] = useState([]);
  const [nd, setNd] = useState({ name: "", description: "" });
  const [hd, setHd] = useState({ email: "", domainId: "" });
  const [msg, setMsg] = useState("");
  const [admins, setAdmins] = useState([]);
  const [na, setNa] = useState("");

  const load = useCallback(async () => {
    const ds = (await getDocs(collection(db, "domains"))).docs.map((d) => ({ id: d.id, ...d.data() }));
    const apps = collection(db, "applications");
    const withCounts = await Promise.all(
      ds.map(async (d) => ({
        ...d,
        total: (await getCountFromServer(query(apps, where("domainId", "==", d.id)))).data().count,
        shortlisted: (await getCountFromServer(query(apps, where("domainId", "==", d.id), where("status", "==", "shortlisted")))).data().count,
      }))
    );
    setRows(withCounts);
    setHeads((await getDocs(query(collection(db, "users"), where("role", "==", "domainHead")))).docs.map((d) => d.data()));
    setAdmins((await getDocs(query(collection(db, "users"), where("role", "==", "superadmin")))).docs.map((d) => d.data()));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function createDomain() {
    setMsg("");
    const slug = slugify(nd.name);
    if (!slug) return setMsg("Enter a name");
    if ((await getDoc(doc(db, "domains", slug))).exists()) return setMsg("Domain already exists");
    await setDoc(doc(db, "domains", slug), { name: nd.name.trim(), slug, description: nd.description.trim(), open: false });
    await setDoc(doc(db, "domains", slug, "private", "settings"), { whatsappLink: "" });
    setNd({ name: "", description: "" });
    load();
  }

  async function assignHead() {
    setMsg("");
    const email = hd.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || !hd.domainId) return setMsg("Enter email and pick a domain");
    const ex = await getDoc(doc(db, "users", email));
    if (ex.exists() && ex.data().role === "superadmin") return setMsg("That account is a superadmin. Remove it from Superadmins first.");
    await setDoc(doc(db, "users", email), { email, role: "domainHead", domainId: hd.domainId });
    setHd({ email: "", domainId: "" });
    load();
  }

  async function removeHead(email) {
    if (!confirm(`Remove ${email}?`)) return;
    await deleteDoc(doc(db, "users", email));
    load();
  }

  async function addAdmin() {
    setMsg("");
    const email = na.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return setMsg("Enter a valid email");
    await setDoc(doc(db, "users", email), { email, role: "superadmin", domainId: null });
    setNa("");
    load();
  }

  async function removeAdmin(email) {
    if (email === auth.user.email.toLowerCase()) return setMsg("You can't remove yourself");
    if (!confirm(`Remove superadmin ${email}?`)) return;
    await deleteDoc(doc(db, "users", email));
    load();
  }

  async function exportCsv() {
    const r = await fetch("/api/admin/export", { headers: { Authorization: `Bearer ${await auth.token()}` } });
    if (!r.ok) return setMsg("Export failed");
    const url = URL.createObjectURL(await r.blob());
    const a = Object.assign(document.createElement("a"), { href: url, download: "applications.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="rc-row">
        <h1>Superadmin</h1>
        <a className="rc-btn ghost" href="/admin/events">Manage events</a>
        <a className="rc-btn ghost" href="/admin/announcements">Announcements</a>
        <button className="rc-btn ghost" onClick={auth.signOut}>Sign out</button>
      </div>
      {msg && <p className="rc-err">{msg}</p>}

      <div className="rc-card">
        <h3>Domains</h3>
        <table>
          <thead><tr><th>Domain</th><th>Open</th><th>Applied</th><th>Shortlisted</th><th></th></tr></thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td><td>{d.open ? "Yes" : "No"}</td><td>{d.total}</td><td>{d.shortlisted}</td>
                <td><a href={`/admin/recruitment?domain=${d.id}`}>Manage</a></td>
              </tr>
            ))}
            <tr><td><b>Total</b></td><td></td><td>{rows.reduce((s, d) => s + d.total, 0)}</td><td>{rows.reduce((s, d) => s + d.shortlisted, 0)}</td><td></td></tr>
          </tbody>
        </table>
        <button className="rc-btn" onClick={exportCsv}>Export all (CSV)</button>
      </div>

      <div className="rc-card">
        <h3>Create domain</h3>
        <input placeholder="Name" value={nd.name} onChange={(e) => setNd({ ...nd, name: e.target.value })} />
        <label>Description</label>
        <textarea rows={2} value={nd.description} onChange={(e) => setNd({ ...nd, description: e.target.value })} />
        <button className="rc-btn" onClick={createDomain}>Create (starts closed)</button>
      </div>

      <div className="rc-card">
        <h3>Domain heads</h3>
        <div className="rc-row">
          <input placeholder="head@email.com (Google account)" value={hd.email} onChange={(e) => setHd({ ...hd, email: e.target.value })} />
          <select value={hd.domainId} onChange={(e) => setHd({ ...hd, domainId: e.target.value })}>
            <option value="">Select domain</option>
            {rows.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <button className="rc-btn" onClick={assignHead}>Assign head</button>
        <table>
          <tbody>
            {heads.map((h) => (
              <tr key={h.email}>
                <td>{h.email}</td><td>{rows.find((d) => d.id === h.domainId)?.name || h.domainId}</td>
                <td><button className="rc-btn ghost" onClick={() => removeHead(h.email)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rc-card">
        <h3>Superadmins</h3>
        <p className="rc-muted">Superadmins can do everything, including adding other superadmins.</p>
        <div className="rc-row">
          <input placeholder="new-admin@email.com (Google account)" value={na} onChange={(e) => setNa(e.target.value)} />
        </div>
        <button className="rc-btn" onClick={addAdmin}>Add superadmin</button>
        <table>
          <tbody>
            {admins.map((a) => (
              <tr key={a.email}>
                <td>{a.email}</td>
                <td>
                  {a.email !== auth.user.email.toLowerCase() && (
                    <button className="rc-btn ghost" onClick={() => removeAdmin(a.email)}>Remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
