"use client";
import { useState } from "react";

export default function Status() {
  const [srn, setSrn] = useState("");
  const [email, setEmail] = useState("");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function check() {
    setBusy(true); setErr(""); setRes(null);
    const r = await fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ srn, email }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setErr(j.error || "Something went wrong");
    else setRes(j);
    setBusy(false);
  }

  return (
    <div className="container section rc">
      <h1>Application status</h1>
      <div className="rc-card">
        <label>SRN</label>
        <input value={srn} onChange={(e) => setSrn(e.target.value)} />
        <label>Email used to apply</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="rc-btn" onClick={check} disabled={busy || !srn || !email}>{busy ? "Checking…" : "Check status"}</button>
        {err && <div className="rc-err">{err}</div>}
      </div>
      {res && !res.found && <p>No application found for that SRN and email.</p>}
      {res?.found && res.results.map((r, i) => (
        <div className="rc-card" key={i}>
          <h3>{r.domain}</h3>
          <span className="rc-badge">{r.status}</span>
          {r.status === "shortlisted" && (
            <p>
              You're shortlisted! {r.whatsappLink
                ? <>Join the group: <a href={r.whatsappLink} target="_blank" rel="noopener noreferrer">{r.whatsappLink}</a></>
                : "The group link will be shared soon."}
            </p>
          )}
          {r.status === "applied" && <p className="rc-muted">Under review.</p>}
          {r.status === "rejected" && <p className="rc-muted">Not selected this time.</p>}
        </div>
      ))}
    </div>
  );
}
