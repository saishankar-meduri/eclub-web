"use client";
import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, getDoc, setDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { slugify } from "../../../lib/constants";
import AdminGate from "../../../components/AdminGate";
import ImageUploader from "../../../components/events/ImageUploader";
import EventQuestionsEditor from "../../../components/events/EventQuestionsEditor";

export default function Page() {
  return (
    <AdminGate roles={["superadmin", "domainHead"]} allow={(p) => p.role === "superadmin" || p.domainId === "events"}>
      {(auth) => <Manager auth={auth} />}
    </AdminGate>
  );
}

const pad = (n) => String(n).padStart(2, "0");
const toInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const blank = {
  title: "", slug: "", description: "", schedule: "", rules: "", date: "", venue: "",
  fee: "0", team_size: "1", registration_url: "", status: "upcoming", published: false, images: [],
  reg_enabled: false, reg_type: "individual", reg_deadline: "",
};

function Manager({ auth }) {
  const [events, setEvents] = useState([]);
  const [f, setF] = useState(null); // null = list view
  const [isNew, setIsNew] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const s = await getDocs(collection(db, "events"));
    setEvents(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.date.toMillis() - a.date.toMillis()));
  }, []);
  useEffect(() => { load(); }, [load]);

  function edit(e) {
    setIsNew(false);
    setErr("");
    setF({
      title: e.title, slug: e.slug, description: e.description || "", schedule: e.schedule || "", rules: e.rules || "",
      date: toInput(e.date.toDate()), venue: e.venue || "", fee: String(e.fee ?? 0), team_size_min: String(e.team_size_min ?? e.team_size ?? 1), team_size_max: String(e.team_size_max ?? e.team_size ?? 1),
      registration_url: e.registration_url || "", status: e.status, published: !!e.published,
      images: e.images?.length ? e.images : e.banner_url ? [e.banner_url] : [],
      reg_enabled: !!e.reg_enabled,
      reg_type: e.reg_type === "team" ? "team" : "individual",
      reg_deadline: e.reg_deadline ? toInput(e.reg_deadline.toDate()) : "",
    });
  }

  async function save() {
    setErr("");
    const slug = f.slug.trim();
    const when = new Date(f.date);
    if (!f.title.trim()) return setErr("Title required");
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) return setErr("Slug: lowercase letters, numbers, dashes");
    if (isNaN(when)) return setErr("Pick a date and time");
    const tMin = Number(f.team_size_min), tMax = Number(f.team_size_max);
    if (!(Number(f.fee) >= 0) || !Number.isInteger(tMin) || !Number.isInteger(tMax) || tMin < 1) return setErr("Check fee and team size");
    if (tMax < tMin) return setErr("Max team size can't be less than min");
    if (tMax > 20) return setErr("Max team size can't exceed 20");
    if (f.registration_url && !/^https?:\/\/\S+$/i.test(f.registration_url.trim())) return setErr("Registration link must start with http(s)://");
    if (f.reg_enabled && f.reg_type === "team" && Number(f.team_size) < 2) return setErr("Team events need a team size (max members) of at least 2");
    if (f.reg_deadline && isNaN(new Date(f.reg_deadline))) return setErr("Check the registration deadline");
    setBusy(true);
    try {
      if (isNew && (await getDoc(doc(db, "events", slug))).exists()) {
        setBusy(false);
        return setErr("An event with this slug already exists");
      }
      await setDoc(doc(db, "events", slug), {
        title: f.title.trim(),
        slug,
        description: f.description.trim(),
        schedule: f.schedule.trim() || null,
        rules: f.rules.trim() || null,
        date: Timestamp.fromDate(when),
        venue: f.venue.trim(),
        fee: Number(f.fee),
        team_size_min: tMin,
        team_size_max: tMax,
        team_size: tMax, // legacy field, kept for older readers
        banner_url: f.images[0] || null,
        registration_url: f.registration_url.trim() || null,
        status: f.status,
        published: f.published,
        images: f.images,
        reg_enabled: f.reg_enabled,
        reg_type: f.reg_type,
        reg_deadline: f.reg_deadline ? Timestamp.fromDate(new Date(f.reg_deadline)) : null,
      });
      setF(null);
      load();
    } catch {
      setErr("Save failed (check your permissions)");
    }
    setBusy(false);
  }

  async function remove(e) {
    if (!confirm(`Delete "${e.title}"? This can't be undone.`)) return;
    await deleteDoc(doc(db, "events", e.id));
    load();
  }

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <div className="rc-row">
        <h1>Events</h1>
        <a className="rc-btn ghost" href={auth.profile.role === "superadmin" ? "/admin/superadmin" : "/admin/recruitment"}>Back</a>
        <button className="rc-btn ghost" onClick={auth.signOut}>Sign out</button>
      </div>

      {!f && (
        <div className="rc-card">
          <button className="rc-btn" onClick={() => { setIsNew(true); setErr(""); setF(blank); }}>New event</button>
          <p className="rc-muted">Changes show on the public site within about a minute.</p>
          <table>
            <thead><tr><th>Event</th><th>Date</th><th>Status</th><th>Visible</th><th></th></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{e.title}</td>
                  <td>{e.date.toDate().toLocaleDateString("en-IN")}</td>
                  <td><span className="rc-badge">{e.status}</span></td>
                  <td>{e.published ? "Yes" : "Draft"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="rc-btn ghost" onClick={() => edit(e)}>Edit</button>
                    {e.reg_enabled && <a className="rc-btn ghost" href={`/admin/events/${e.id}/registrations`}>Registrations</a>}
                    <button className="rc-btn ghost" onClick={() => remove(e)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!events.length && <p className="rc-muted">No events yet.</p>}
        </div>
      )}

      {f && (
        <>
        <div className="rc-card">
          <h3>{isNew ? "New event" : `Edit: ${f.title}`}</h3>
          <label>Title</label>
          <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value, slug: isNew ? slugify(e.target.value) : f.slug })} />
          <label>Slug (the URL: /events/…)</label>
          <input value={f.slug} onChange={set("slug")} disabled={!isNew} />
          <label>Description</label>
          <textarea rows={4} value={f.description} onChange={set("description")} />
          <div className="rc-row">
            <div><label>Date and time</label><input type="datetime-local" value={f.date} onChange={set("date")} /></div>
            <div><label>Venue</label><input value={f.venue} onChange={set("venue")} /></div>
          </div>
          <div className="rc-row">
            <div><label>Fee (₹, 0 = free)</label><input type="number" min="0" value={f.fee} onChange={set("fee")} /></div>
            <div><label>Team size (min)</label><input type="number" min="1" value={f.team_size_min} onChange={set("team_size_min")} /></div>
            <div><label>Team size (max)</label><input type="number" min="1" value={f.team_size_max} onChange={set("team_size_max")} /></div>
            <div>
              <label>Status</label>
              <select value={f.status} onChange={set("status")}>
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="past">Past</option>
              </select>
            </div>
          </div>
          <label>Schedule (one item per line)</label>
          <textarea rows={4} value={f.schedule} onChange={set("schedule")} />
          <label>Rules (one per line)</label>
          <textarea rows={4} value={f.rules} onChange={set("rules")} />
          <label>External registration link (optional, used only if on-site registration is off)</label>
          <input value={f.registration_url} placeholder="https://forms.gle/…" onChange={set("registration_url")} />
          <h3 style={{ marginTop: 20 }}>On-site registration</h3>
          <label><input type="checkbox" checked={f.reg_enabled} onChange={(e) => setF({ ...f, reg_enabled: e.target.checked })} /> Accept registrations on this site</label>
          <div className="rc-row">
            <div>
              <label>Registration type</label>
              <select value={f.reg_type} onChange={set("reg_type")}>
                <option value="individual">Individual</option>
                <option value="team">Team (team size above = max members incl. leader)</option>
              </select>
            </div>
            <div>
              <label>Deadline (optional)</label>
              <input type="datetime-local" value={f.reg_deadline} onChange={set("reg_deadline")} />
            </div>
          </div>
          <p className="rc-muted">Paid events (fee above 0) require a PESU Academy receipt screenshot. Payments are verified under Registrations.</p>
          <ImageUploader images={f.images} onChange={(images) => setF({ ...f, images })} getToken={auth.token} />
          <label><input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} /> Published (visible on the site)</label>
          {err && <div className="rc-err">{err}</div>}
          <button className="rc-btn" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
          <button className="rc-btn ghost" onClick={() => setF(null)}>Cancel</button>
        </div>
        {!isNew && (
          <div style={{ marginTop: 16 }}>
            <h3>Registration questions</h3>
            <p className="rc-muted">Extra questions applicants answer for this event. Changes save instantly.</p>
            <EventQuestionsEditor path={`events/${f.slug}/questions`} />
          </div>
        )}
        </>
      )}
    </>
  );
}
