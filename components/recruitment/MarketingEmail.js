"use client";
import { useRef, useState } from "react";

const AUDIENCES = [
  ["selected", "Members (Selected)"],
  ["shortlisted", "Shortlisted"],
  ["applied", "Applied (under review)"],
  ["all", "Everyone who applied"],
];

export default function MarketingEmail({ auth, domains }) {
  const [audience, setAudience] = useState("selected");
  const [domainId, setDomainId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const campaign = useRef(null); // same id for retries of the same email, reset when the content changes
  const edit = (setter) => (e) => { campaign.current = null; setter(e.target.value); };

  async function call(extra) {
    const r = await fetch("/api/admin/marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await auth.token()}` },
      body: JSON.stringify({ audience, domainId: domainId || undefined, subject, body, campaignId: campaign.current, ...extra }),
    });
    return { ok: r.ok, status: r.status, j: await r.json().catch(() => ({})) };
  }

  async function send() {
    setMsg("");
    if (!subject.trim() || !body.trim()) return setMsg("Add a subject and a message");
    setBusy(true);
    try {
      const pre = await call({ dryRun: true });
      if (!pre.ok) return setMsg(pre.j.error || "Failed");
      if (!pre.j.count) return setMsg("No recipients for that audience");
      if (!confirm(`Send "${subject.trim()}" to ${pre.j.count} recipient(s)? This can't be undone.`)) return;
      if (!campaign.current) campaign.current = crypto.randomUUID();
      const { ok, status, j } = await call({});
      if (!ok) {
        if (status !== 409) campaign.current = null;
        return setMsg(j.error || "Failed");
      }
      campaign.current = null;
      setMsg(
        j.notConfigured
          ? "SMTP isn't configured, so nothing was sent."
          : `Sent ${j.sent} of ${j.total}${j.failed ? `, ${j.failed} failed` : ""}.`
      );
      if (j.sent) { setSubject(""); setBody(""); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rc-card">
      <h3>Marketing email</h3>
      <p className="rc-muted">Send an announcement to applicants or members. Each person gets their own email.</p>
      <div className="rc-row">
        <select value={audience} onChange={edit(setAudience)}>
          {AUDIENCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={domainId} onChange={edit(setDomainId)}>
          <option value="">All domains</option>
          {domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <label>Subject</label>
      <input value={subject} maxLength={150} onChange={edit(setSubject)} />
      <label>Message (blank line = new paragraph)</label>
      <textarea rows={6} value={body} maxLength={5000} onChange={edit(setBody)} />
      {msg && <p className="rc-muted">{msg}</p>}
      <button className="rc-btn" disabled={busy} onClick={send}>{busy ? "Sending…" : "Send email"}</button>
    </div>
  );
}
