"use client";
import Link from "next/link";
import { useState } from "react";

const STATUS_LABELS = {
  applied: "Under review",
  shortlisted: "Shortlisted",
  rejected: "Not selected",
};

export default function Status() {
  const [srn, setSrn] = useState("");
  const [email, setEmail] = useState("");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function check(e) {
    if (e) e.preventDefault();
    setBusy(true);
    setErr("");
    setRes(null);
    const r = await fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ srn, email }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(j.error || "Something went wrong");
    } else {
      setRes(j);
      try {
        const hasShortlisted = Boolean(
          j?.found && j?.results?.some((it) => it.status === "shortlisted" || it.status === "selected")
        );
        sessionStorage.setItem("eclub-selected-hint", hasShortlisted ? "1" : "0");
        window.dispatchEvent(new Event("eclub-tier-change"));
      } catch {}
    }
    setBusy(false);
  }

  return (
    <div className="page-shell">
      <div className="container ed-page-section rc">
        <header className="modern-page-header modern-header-split">
          <div>
            <div className="modern-kicker">
              <span className="modern-kicker-idx">05</span>
              <span className="modern-kicker-rule" aria-hidden="true" />
              <span>Applicant Portal</span>
            </div>
            <h1 className="modern-display-title">
              Application <span className="modern-title-dim">status.</span>
            </h1>
          </div>
          <p className="modern-header-aside">
            Enter the SRN and email address you used when applying to view real-time updates for
            each domain.
          </p>
        </header>

        <div className="ed-form-layout">
          <aside className="ed-form-aside">
            <div className="ed-aside-note ed-aside-note-flush">
              <p className="rc-muted">Haven&apos;t applied yet?</p>
              <Link href="/join" className="inline-arrow-link">
                Apply to join <span aria-hidden="true">→</span>
              </Link>
            </div>
          </aside>

          <div className="ed-form-main">
            <form className="rc-card ed-form-card" onSubmit={check}>
              <div className="form-field">
                <label>SRN</label>
                <input
                  placeholder="PES2UG25CS304"
                  value={srn}
                  onChange={(e) => setSrn(e.target.value.toUpperCase())}
                />
              </div>
              <div className="form-field">
                <label>Email used to apply</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {err && <div className="rc-err">{err}</div>}
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-pill-primary"
                  disabled={busy || !srn.trim() || !email.trim()}
                >
                  {busy ? "Checking…" : "Check status"}
                  {!busy && <span className="btn-arrow" aria-hidden="true">→</span>}
                </button>
              </div>
            </form>

            {res && !res.found && (
              <div className="empty-panel">
                <div>
                  <p className="empty-title">No application found</p>
                  <p className="muted">
                    Double-check that both your SRN and email match what you submitted on the
                    application form.
                  </p>
                </div>
              </div>
            )}

            {res?.found && (
              <div className="status-results">
                {res.results.map((r, i) => (
                  <div className="rc-card status-result-card" key={i}>
                    <div className="status-result-top">
                      <h3>{r.domain}</h3>
                      <span className={`status-pill status-pill-${r.status}`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </span>
                    </div>

                    {r.status === "shortlisted" && (
                      <div className="status-callout">
                        <p>
                          Congratulations — you&apos;ve been shortlisted for{" "}
                          <strong>{r.domain}</strong>.
                        </p>
                        {r.whatsappLink ? (
                          <a
                            href={r.whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-pill-primary btn-pill-sm"
                          >
                            Join WhatsApp group <span className="btn-arrow" aria-hidden="true">↗</span>
                          </a>
                        ) : (
                          <p className="rc-muted">The onboarding group link will be shared soon.</p>
                        )}
                      </div>
                    )}

                    {r.status === "applied" && (
                      <p className="rc-muted">
                        Your responses are currently being reviewed by the domain leads.
                      </p>
                    )}

                    {r.status === "rejected" && (
                      <p className="rc-muted">
                        Not selected in this cycle — thank you for applying, and we hope to see you
                        at upcoming events.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
