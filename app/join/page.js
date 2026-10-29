"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { BRANCHES, YEARS, SRN_RE, EMAIL_RE, PHONE_RE, URL_RE } from "../../lib/constants";

const empty = { name: "", srn: "", email: "", phone: "", year: "", branch: "", domainId: "" };

export default function Join() {
  const [step, setStep] = useState(1);
  const [domains, setDomains] = useState([]);
  const [form, setForm] = useState(empty);
  const [questions, setQuestions] = useState([]);
  const [loadedFor, setLoadedFor] = useState("");
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getDocs(query(collection(db, "domains"), where("open", "==", true)))
      .then((s) => setDomains(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setMsg("Could not load domains. Refresh and try again."));
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: k === "srn" ? e.target.value.toUpperCase() : e.target.value });
  const domainName = domains.find((d) => d.id === form.domainId)?.name;

  function validate1() {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Enter your name";
    if (!SRN_RE.test(form.srn.trim().toUpperCase())) e.srn = "Format: PES2UG25CS304";
    if (!EMAIL_RE.test(form.email.trim())) e.email = "Enter a valid email";
    if (!PHONE_RE.test(form.phone.trim())) e.phone = "10-digit phone number";
    if (!form.year) e.year = "Select year";
    if (!form.branch) e.branch = "Select branch";
    if (!form.domainId) e.domainId = "Select a domain";
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function next() {
    setMsg("");
    if (!validate1()) return;
    setBusy(true);
    try {
      if (loadedFor !== form.domainId) {
        const s = await getDocs(query(collection(db, `domains/${form.domainId}/questions`), orderBy("order")));
        setQuestions(s.docs.map((d) => ({ id: d.id, ...d.data() })));
        setAnswers({});
        setLoadedFor(form.domainId);
      }
      setStep(2);
    } catch {
      setMsg("This domain is not accepting applications right now.");
    }
    setBusy(false);
  }

  function validate2() {
    const e = {};
    for (const q of questions) {
      const v = (answers[q.id] || "").trim();
      if (q.required && !v) e[q.id] = "Required";
      else if (v && q.type === "link" && !URL_RE.test(v)) e[q.id] = "Enter a valid link (https://…)";
      else if (v && q.type === "mcq" && !q.options.includes(v)) e[q.id] = "Pick an option";
      else if (v.length > 2000) e[q.id] = "Too long (max 2000)";
    }
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function submit() {
    setMsg("");
    if (!validate2()) return;
    setBusy(true);
    const srn = form.srn.trim().toUpperCase();
    const clean = {};
    for (const q of questions) if ((answers[q.id] || "").trim()) clean[q.id] = answers[q.id].trim();
    try {
      await setDoc(doc(db, "applications", `${srn}_${form.domainId}`), {
        name: form.name.trim(),
        srn,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        year: form.year,
        branch: form.branch,
        domainId: form.domainId,
        answers: clean,
        status: "applied",
        createdAt: serverTimestamp(),
      });
      setDone(true);
    } catch (err) {
      setMsg(
        err.code === "permission-denied"
          ? "You have already applied to this domain, or applications just closed."
          : "Something went wrong. Try again."
      );
    }
    setBusy(false);
  }

  if (done)
    return (
      <div className="container section rc">
        <div className="rc-card">
          <h2>Application received</h2>
          <p>Thanks {form.name.split(" ")[0]}, your application for <b>{domainName}</b> is in.</p>
          <p className="rc-muted">Check progress anytime on the <a href="/status">status page</a> with your SRN and email.</p>
        </div>
      </div>
    );

  return (
    <div className="container section rc">
      <h1>Join the club</h1>
      <p className="rc-muted">Step {step} of 2</p>
      {msg && <p className="rc-err">{msg}</p>}

      {step === 1 && (
        <div className="rc-card">
          {[["name", "Full name"], ["srn", "SRN"], ["email", "Email"], ["phone", "Phone (10 digits)"]].map(([k, l]) => (
            <div key={k}>
              <label>{l}</label>
              <input value={form[k]} onChange={set(k)} />
              {errors[k] && <div className="rc-err">{errors[k]}</div>}
            </div>
          ))}
          <div className="rc-row">
            <div>
              <label>Year</label>
              <select value={form.year} onChange={set("year")}>
                <option value="">Select</option>
                {YEARS.map((y) => <option key={y}>{y}</option>)}
              </select>
              {errors.year && <div className="rc-err">{errors.year}</div>}
            </div>
            <div>
              <label>Branch</label>
              <select value={form.branch} onChange={set("branch")}>
                <option value="">Select</option>
                {BRANCHES.map((b) => <option key={b}>{b}</option>)}
              </select>
              {errors.branch && <div className="rc-err">{errors.branch}</div>}
            </div>
          </div>
          <label>Domain</label>
          <select value={form.domainId} onChange={set("domainId")}>
            <option value="">{domains.length ? "Select a domain" : "No domains open"}</option>
            {domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {errors.domainId && <div className="rc-err">{errors.domainId}</div>}
          {form.domainId && <p className="rc-muted">{domains.find((d) => d.id === form.domainId)?.description}</p>}
          <button className="rc-btn" onClick={next} disabled={busy}>{busy ? "Loading…" : "Next"}</button>
        </div>
      )}

      {step === 2 && (
        <div className="rc-card">
          <h3>{domainName}</h3>
          {questions.length === 0 && <p className="rc-muted">No extra questions for this domain.</p>}
          {questions.map((q) => (
            <div key={q.id}>
              <label>{q.label}{q.required && " *"}</label>
              {q.type === "long" ? (
                <textarea rows={5} value={answers[q.id] || ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
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
              {errors[q.id] && <div className="rc-err">{errors[q.id]}</div>}
            </div>
          ))}
          <button className="rc-btn ghost" onClick={() => setStep(1)}>Back</button>
          <button className="rc-btn" onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit"}</button>
        </div>
      )}
    </div>
  );
}
