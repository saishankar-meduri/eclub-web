"use client";
import { useState } from "react";

const LABEL = { pending: "Payment under review", confirmed: "Confirmed", rejected: "Rejected" };

export default function RegistrationStatus() {
  const [srn, setSrn] = useState("");
  const [email, setEmail] = useState("");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function check() {
    setBusy(true); setErr(""); setRes(null);
    const r = await fetch("/api/events/registration-status", {
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
      <h1>Event registration status</h1>
      <div className="rc-card">
        <label>SRN (team leader's SRN for team events)</label>
        <input value={srn} onChange={(e) => setSrn(e.target.value.toUpperCase())} />
        <label>Email used to register</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="rc-btn" onClick={check} disabled={busy || !srn || !email}>{busy ? "Checking…" : "Check status"}</button>
        {err && <div className="rc-err">{err}</div>}
      </div>
      {res && !res.found && <p>No registration found for that SRN and email.</p>}
      {res?.found && res.results.map((r, i) => (
        <div className="rc-card" key={i}>
          <h3>{r.event}</h3>
          <span className="rc-badge">{LABEL[r.status] || r.status}</span>
          {r.team_name && <p className="rc-muted">Team: {r.team_name}</p>}
          {r.status === "pending" && <p className="rc-muted">We're verifying your payment receipt. You'll get an email.</p>}
          {r.status === "confirmed" && <p>{r.checked_in ? "Checked in." : "You're all set. Carry your college ID for check-in."}</p>}
          {r.status === "rejected" && <p className="rc-muted">We couldn't verify your receipt. Register again from the event page with a clear screenshot.</p>}
        </div>
      ))}
    </div>
  );
}
