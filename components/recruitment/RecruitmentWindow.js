"use client";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, Timestamp, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";

const pad = (n) => String(n).padStart(2, "0");
const toInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function RecruitmentWindow() {
  const [opens, setOpens] = useState("");
  const [closes, setCloses] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "settings", "recruitment"))
      .then((s) => {
        const d = s.exists() ? s.data() : {};
        setOpens(d.opens_at ? toInput(d.opens_at.toDate()) : "");
        setCloses(d.closes_at ? toInput(d.closes_at.toDate()) : "");
      })
      .catch(() => {});
  }, []);

  async function save(o, c) {
    setMsg("");
    const op = o ? new Date(o) : null;
    const cl = c ? new Date(c) : null;
    if ((op && isNaN(op)) || (cl && isNaN(cl))) return setMsg("Check the dates");
    if (op && cl && cl <= op) return setMsg("The closing time must be after the opening time");
    setBusy(true);
    try {
      await setDoc(doc(db, "settings", "recruitment"), {
        opens_at: op ? Timestamp.fromDate(op) : null,
        closes_at: cl ? Timestamp.fromDate(cl) : null,
        updated_at: serverTimestamp(),
      });
      setMsg("Saved");
    } catch {
      setMsg("Save failed (are the latest Firestore rules published?)");
    }
    setBusy(false);
  }

  return (
    <div className="rc-card">
      <h3>Recruitment window</h3>
      <p className="rc-muted">
        Shows a countdown on /join and blocks applications outside this window, for every domain. Leave a field empty for no limit. Times are in your
        local time (IST).
      </p>
      <div className="rc-row">
        <div>
          <label>Opens at (optional)</label>
          <input type="datetime-local" value={opens} onChange={(e) => setOpens(e.target.value)} />
        </div>
        <div>
          <label>Closes at (optional)</label>
          <input type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)} />
        </div>
      </div>
      <button className="rc-btn" disabled={busy} onClick={() => save(opens, closes)}>Save window</button>
      <button className="rc-btn ghost" disabled={busy} onClick={() => { setOpens(""); setCloses(""); save("", ""); }}>Clear (no limit)</button>
      {msg && <span className="rc-muted">{msg}</span>}
    </div>
  );
}
