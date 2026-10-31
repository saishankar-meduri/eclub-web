"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BRANCHES, YEARS, SRN_RE, EMAIL_RE, PHONE_RE, URL_RE } from "../../lib/constants";

let fsPromise = null;
function loadFirestore() {
  if (!fsPromise) {
    fsPromise = Promise.all([import("firebase/firestore"), import("../../lib/firebase")]).then(
      ([fs, fb]) => ({ ...fs, db: fb.db })
    );
  }
  return fsPromise;
}

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
    let cancelled = false;
    let idleId;
    let timerId;

    const fetchDomains = () => {
      loadFirestore()
        .then(({ db, collection, getDocs, query, where }) =>
          getDocs(query(collection(db, "domains"), where("open", "==", true)))
        )
        .then((s) => {
          if (cancelled) return;
          setDomains(
            s.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .sort((a, b) => a.name.localeCompare(b.name))
          );
        })
        .catch(() => {
          if (!cancelled) setMsg("Could not load domains. Refresh and try again.");
        });
    };

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(fetchDomains, { timeout: 220 });
    } else {
      timerId = window.setTimeout(fetchDomains, 90);
    }

    return () => {
      cancelled = true;
      if (idleId && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timerId) window.clearTimeout(timerId);
    };
  }, []);

  const set = (k) => (e) =>
    setForm({ ...form, [k]: k === "srn" ? e.target.value.toUpperCase() : e.target.value });
  const selectedDomain = domains.find((d) => d.id === form.domainId);
  const domainName = selectedDomain?.name;

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
        const { db, collection, getDocs, query, orderBy } = await loadFirestore();
        const s = await getDocs(
          query(collection(db, `domains/${form.domainId}/questions`), orderBy("order"))
        );
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
      const { db, doc, setDoc, serverTimestamp } = await loadFirestore();
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

  if (done) {
    return (
      <div className="page-shell">
        <div className="container ed-page-section rc">
          <div className="ed-form-shell">
            <div className="rc-card ed-success-card">
              <div className="modern-kicker">
                <span className="ed-dot" aria-hidden="true" />
                <span>Application submitted</span>
              </div>
              <h1 className="ed-section-title">
                Application <span className="modern-title-dim">received.</span>
              </h1>
              <p className="ed-page-sub">
                Thanks {form.name.split(" ")[0]}, your application for <strong>{domainName}</strong>{" "}
                is now in review.
              </p>
              <div className="ed-actions">
                <Link href="/status" className="btn-pill-primary">
                  Track application status <span className="btn-arrow" aria-hidden="true">→</span>
                </Link>
                <Link href="/" className="btn-pill-secondary">
                  Back to home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="container ed-page-section rc">
        <header className="modern-page-header modern-header-split">
          <div>
            <div className="modern-kicker">
              <span className="modern-kicker-idx">04</span>
              <span className="modern-kicker-rule" aria-hidden="true" />
              <span>Recruitment · PESU EC</span>
            </div>
            <h1 className="modern-display-title">
              Join the club. <span className="modern-title-dim">Build with us.</span>
            </h1>
          </div>
          <p className="modern-header-aside">
            Pick the domain where you do your sharpest work and tell us what drives you to build.
          </p>
        </header>

        <div className="ed-form-layout">
          <aside className="ed-form-aside">
            <div className="step-rail step-rail-flush" aria-label="Application steps">
              <div className={`step-pill${step === 1 ? " active" : " done"}`}>
                <span className="step-num">01</span>
                <span>Your details &amp; domain</span>
              </div>
              <div className={`step-pill${step === 2 ? " active" : ""}`}>
                <span className="step-num">02</span>
                <span>Domain questions</span>
              </div>
            </div>

            <div className="ed-aside-note">
              <p className="rc-muted">Already submitted an application?</p>
              <Link href="/status" className="inline-arrow-link">
                Check your status <span aria-hidden="true">→</span>
              </Link>
            </div>
          </aside>

          <div className="ed-form-main">
            {msg && <div className="form-alert">{msg}</div>}

            {step === 1 && (
              <div className="rc-card ed-form-card">
                <div className="form-field">
                  <label>Full name</label>
                  <input placeholder="Your full name" value={form.name} onChange={set("name")} />
                  {errors.name && <div className="rc-err">{errors.name}</div>}
                </div>

                <div className="rc-row">
                  <div className="form-field">
                    <label>SRN</label>
                    <input
                      placeholder="PES2UG25CS304"
                      value={form.srn}
                      onChange={set("srn")}
                    />
                    {errors.srn && <div className="rc-err">{errors.srn}</div>}
                  </div>
                  <div className="form-field">
                    <label>Phone (10 digits)</label>
                    <input
                      placeholder="9876543210"
                      value={form.phone}
                      onChange={set("phone")}
                    />
                    {errors.phone && <div className="rc-err">{errors.phone}</div>}
                  </div>
                </div>

                <div className="form-field">
                  <label>Email address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={set("email")}
                  />
                  {errors.email && <div className="rc-err">{errors.email}</div>}
                </div>

                <div className="rc-row">
                  <div className="form-field">
                    <label>Year</label>
                    <select value={form.year} onChange={set("year")}>
                      <option value="">Select year</option>
                      {YEARS.map((y) => (
                        <option key={y}>{y}</option>
                      ))}
                    </select>
                    {errors.year && <div className="rc-err">{errors.year}</div>}
                  </div>
                  <div className="form-field">
                    <label>Branch</label>
                    <select value={form.branch} onChange={set("branch")}>
                      <option value="">Select branch</option>
                      {BRANCHES.map((b) => (
                        <option key={b}>{b}</option>
                      ))}
                    </select>
                    {errors.branch && <div className="rc-err">{errors.branch}</div>}
                  </div>
                </div>

                <div className="form-field">
                  <label>Domain</label>
                  <select value={form.domainId} onChange={set("domainId")}>
                    <option value="">
                      {domains.length ? "Select a domain" : "No domains currently open"}
                    </option>
                    {domains.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  {errors.domainId && <div className="rc-err">{errors.domainId}</div>}
                </div>

                {selectedDomain?.description && (
                  <div className="domain-callout">
                    <span className="domain-callout-title">{selectedDomain.name}</span>
                    <p>{selectedDomain.description}</p>
                  </div>
                )}

                <div className="form-actions">
                  <button className="btn-pill-primary" onClick={next} disabled={busy}>
                    {busy ? "Loading…" : "Continue"}
                    {!busy && <span className="btn-arrow" aria-hidden="true">→</span>}
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="rc-card ed-form-card">
                <div className="step2-head">
                  <div className="modern-kicker">
                    <span className="modern-kicker-idx">02</span>
                    <span className="modern-kicker-rule" aria-hidden="true" />
                    <span>Domain questionnaire</span>
                  </div>
                  <h2>{domainName}</h2>
                </div>

                {questions.length === 0 && (
                  <p className="rc-muted">No additional questions for this domain — ready to submit.</p>
                )}

                {questions.map((q) => (
                  <div key={q.id} className="form-field">
                    <label>
                      {q.label}
                      {q.required && <span className="req-star"> *</span>}
                    </label>
                    {q.type === "long" ? (
                      <textarea
                        rows={5}
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      />
                    ) : q.type === "mcq" ? (
                      <select
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      >
                        <option value="">Select an option</option>
                        {q.options.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
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

                <div className="form-actions">
                  <button className="btn-pill-secondary" onClick={() => setStep(1)}>
                    <span aria-hidden="true">←</span> Back
                  </button>
                  <button className="btn-pill-primary" onClick={submit} disabled={busy}>
                    {busy ? "Submitting…" : "Submit application"}
                    {!busy && <span className="btn-arrow" aria-hidden="true">→</span>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
