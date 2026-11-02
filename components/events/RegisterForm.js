"use client";
import { useState } from "react";
import Link from "next/link";
import { BRANCHES, YEARS, SRN_RE, EMAIL_RE, PHONE_RE, URL_RE } from "../../lib/constants";

// Shrinks a screenshot to a JPEG data URL small enough to store (server limit: 900k chars).
async function toJpegDataUrl(file) {
  const bmp = await createImageBitmap(file);
  let max = 1600;
  let q = 0.85;
  for (let i = 0; i < 6; i++) {
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", q);
    if (url.length <= 850_000) return url;
    max *= 0.85;
    q = Math.max(0.5, q - 0.07);
  }
  throw new Error("That image is too large. Try a cropped screenshot.");
}

const empty = { name: "", srn: "", email: "", phone: "", year: "", branch: "", team_name: "" };

export default function RegisterForm({ event, questions }) {
  const isTeam = event.reg_type === "team";
  const maxTeam = event.team_size || 4;
  const [f, setF] = useState(empty);
  const [members, setMembers] = useState([]);
  const [answers, setAnswers] = useState({});
  const [receipt, setReceipt] = useState(null);
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const set = (k) => (e) => setF({ ...f, [k]: k === "srn" ? e.target.value.toUpperCase() : e.target.value });
  const setMember = (i, k, v) =>
    setMembers(members.map((m, j) => (j === i ? { ...m, [k]: k === "srn" ? v.toUpperCase() : v } : m)));

  async function pickReceipt(file) {
    setMsg("");
    if (!file) return setReceipt(null);
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setMsg("Receipt must be a JPG, PNG or WebP image");
    try {
      setReceipt({ url: await toJpegDataUrl(file), name: file.name });
    } catch (e) {
      setReceipt(null);
      setMsg(e.message);
    }
  }

  function validate() {
    const e = {};
    if (f.name.trim().length < 2) e.name = "Enter your name";
    if (!SRN_RE.test(f.srn.trim())) e.srn = "Format: PES2UG25CS304";
    if (!EMAIL_RE.test(f.email.trim())) e.email = "Enter a valid email";
    if (!PHONE_RE.test(f.phone.trim())) e.phone = "10-digit phone number";
    if (!f.year) e.year = "Select year";
    if (!f.branch) e.branch = "Select branch";
    if (isTeam) {
      if (f.team_name.trim().length < 2) e.team_name = "Enter a team name";
      if (!members.length) e.members = "Add at least one teammate";
      const seen = new Set([f.srn.trim()]);
      members.forEach((m, i) => {
        if (m.name.trim().length < 2) e[`m${i}name`] = "Name required";
        if (!SRN_RE.test(m.srn.trim())) e[`m${i}srn`] = "Valid SRN required";
        else if (seen.has(m.srn.trim())) e[`m${i}srn`] = "Duplicate SRN";
        seen.add(m.srn.trim());
      });
    }
    for (const q of questions) {
      const v = (answers[q.id] || "").trim();
      if (q.required && !v) e[q.id] = "Required";
      else if (v && q.type === "link" && !URL_RE.test(v)) e[q.id] = "Enter a valid link (https://…)";
      else if (v && q.type === "mcq" && !q.options.includes(v)) e[q.id] = "Pick an option";
    }
    if (event.fee > 0 && !receipt) e.receipt = "Attach your payment receipt screenshot";
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function submit() {
    setMsg("");
    if (!validate()) return setMsg("Please fix the highlighted fields.");
    setBusy(true);
    try {
      const r = await fetch("/api/events/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: event.slug,
          ...f,
          members: isTeam ? members : [],
          answers,
          receipt: event.fee > 0 ? receipt.url : null,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setMsg(j.error || "Something went wrong. Try again.");
      else setDone(j.status);
    } catch {
      setMsg("Network error. Try again.");
    }
    setBusy(false);
  }

  if (done)
    return (
      <div className="rc-card">
        <h2>{done === "pending" ? "Registration received" : "You're registered"}</h2>
        <p>
          {done === "pending"
            ? "We'll verify your payment receipt and email you once your registration is confirmed."
            : `See you at ${event.title}. A confirmation email is on its way.`}
        </p>
        <p className="rc-muted">
          Track it anytime on the <Link href="/registration-status">registration status page</Link>.
        </p>
      </div>
    );

  const err = (k) => errors[k] && <div className="rc-err">{errors[k]}</div>;

  return (
    <>
      {msg && <p className="rc-err">{msg}</p>}

      <div className="rc-card">
        <h3>{isTeam ? "Team leader" : "Your details"}</h3>
        {[["name", "Full name"], ["srn", "SRN"], ["email", "Email"], ["phone", "Phone (10 digits)"]].map(([k, l]) => (
          <div key={k}>
            <label>{l}</label>
            <input value={f[k]} onChange={set(k)} />
            {err(k)}
          </div>
        ))}
        <div className="rc-row">
          <div>
            <label>Year</label>
            <select value={f.year} onChange={set("year")}>
              <option value="">Select</option>
              {YEARS.map((y) => <option key={y}>{y}</option>)}
            </select>
            {err("year")}
          </div>
          <div>
            <label>Branch</label>
            <select value={f.branch} onChange={set("branch")}>
              <option value="">Select</option>
              {BRANCHES.map((b) => <option key={b}>{b}</option>)}
            </select>
            {err("branch")}
          </div>
        </div>
      </div>

      {isTeam && (
        <div className="rc-card">
          <h3>Your team</h3>
          <p className="rc-muted">Up to {maxTeam} members including you.</p>
          <label>Team name</label>
          <input value={f.team_name} onChange={set("team_name")} />
          {err("team_name")}
          {members.map((m, i) => (
            <div key={i} className="rc-row" style={{ marginTop: 10 }}>
              <div>
                <label>Teammate {i + 1} name</label>
                <input value={m.name} onChange={(e) => setMember(i, "name", e.target.value)} />
                {err(`m${i}name`)}
              </div>
              <div>
                <label>SRN</label>
                <input value={m.srn} onChange={(e) => setMember(i, "srn", e.target.value)} />
                {err(`m${i}srn`)}
              </div>
              <button type="button" className="rc-btn ghost" style={{ flex: "none" }}
                onClick={() => setMembers(members.filter((_, j) => j !== i))}>Remove</button>
            </div>
          ))}
          {err("members")}
          {members.length + 1 < maxTeam && (
            <button type="button" className="rc-btn ghost" onClick={() => setMembers([...members, { name: "", srn: "" }])}>
              + Add teammate
            </button>
          )}
        </div>
      )}

      {questions.length > 0 && (
        <div className="rc-card">
          <h3>A few questions</h3>
          {questions.map((q) => (
            <div key={q.id}>
              <label>{q.label}{q.required && " *"}</label>
              {q.type === "long" ? (
                <textarea rows={4} value={answers[q.id] || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
              ) : q.type === "mcq" ? (
                <select value={answers[q.id] || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}>
                  <option value="">Select</option>
                  {q.options.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={q.type === "link" ? "url" : "text"}
                  placeholder={q.type === "link" ? "https://" : ""}
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                />
              )}
              {err(q.id)}
            </div>
          ))}
        </div>
      )}

      {event.fee > 0 && (
        <div className="rc-card">
          <h3>Payment: ₹{event.fee}{isTeam ? " per team" : ""}</h3>
          <p>
            Pay on <b>PESU Academy</b> → <b>Online Payments</b>, and choose <b>{event.title}</b> as both the
            category and the sub-category.
          </p>
          <p className="rc-muted">
            Then upload a screenshot of the receipt with <b>all details visible</b>. Registrations with unclear
            receipts will be rejected.
          </p>
          <label>Payment receipt screenshot *</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => pickReceipt(e.target.files?.[0])} />
          {err("receipt")}
          {receipt && <img src={receipt.url} alt="Receipt preview" style={{ maxWidth: 260, marginTop: 10, borderRadius: 8, border: "1px solid var(--line)" }} />}
        </div>
      )}

      <button className="rc-btn" onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit registration"}</button>
    </>
  );
}
