"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const fmtDate = (ms) =>
  new Date(ms).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

function countdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${d > 0 ? `${d}d ` : ""}${h}:${m}:${sec}`;
}

// Reads settings/recruitment (set by superadmins). state: loading | before | open | closed
export function useRecruitmentWindow() {
  const [w, setW] = useState({ loaded: false, opens: null, closes: null });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const { db } = await import("../lib/firebase");
        const s = await getDoc(doc(db, "settings", "recruitment"));
        const d = s.exists() ? s.data() : {};
        if (alive) setW({ loaded: true, opens: d.opens_at?.toMillis?.() ?? null, closes: d.closes_at?.toMillis?.() ?? null });
      } catch {
        if (alive) setW({ loaded: true, opens: null, closes: null }); // no window configured -> open
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  let state = "loading";
  if (w.loaded) {
    if (w.opens && now < w.opens) state = "before";
    else if (w.closes && now >= w.closes) state = "closed";
    else state = "open";
  }
  return { state, opens: w.opens, closes: w.closes, now };
}

const box = {
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  padding: "14px 18px",
  background: "var(--surface, transparent)",
};

// Slim countdown shown above the form while applications are open and a closing time is set
export function RecruitmentBanner({ win }) {
  if (win.state !== "open" || !win.closes) return null;
  const left = win.closes - win.now;
  const urgent = left < 24 * 3600 * 1000;
  return (
    <div className="container" style={{ paddingTop: 16 }}>
      <div style={{ ...box, borderColor: urgent ? "var(--fg)" : "var(--line)", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span>Applications close in <b style={{ fontVariantNumeric: "tabular-nums" }}>{countdown(left)}</b></span>
        <span style={{ color: "var(--muted)" }}>{fmtDate(win.closes)} IST</span>
      </div>
    </div>
  );
}

// Full-page screen that replaces the form when applications have not opened yet or have closed
function Units({ ms }) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const parts = [
    ["Days", Math.floor(s / 86400)],
    ["Hours", Math.floor((s % 86400) / 3600)],
    ["Minutes", Math.floor((s % 3600) / 60)],
    ["Seconds", s % 60],
  ];
  return (
    <div style={{ display: "flex", gap: "clamp(8px, 2vw, 20px)", justifyContent: "center", flexWrap: "wrap", margin: "36px 0 28px" }}>
      {parts.map(([label, n]) => (
        <div
          key={label}
          style={{
            minWidth: "clamp(70px, 19vw, 150px)",
            padding: "clamp(14px, 3vw, 28px) 10px",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            background: "var(--surface, transparent)",
          }}
        >
          <div style={{ fontSize: "clamp(2.1rem, 9vw, 5.5rem)", fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {String(n).padStart(2, "0")}
          </div>
          <div style={{ marginTop: 10, fontSize: "0.75rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecruitmentClosed({ win }) {
  const before = win.state === "before";
  return (
    <section
      style={{
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "120px 20px 80px",
      }}
    >
      <p style={{ letterSpacing: "0.22em", textTransform: "uppercase", fontSize: "0.8rem", color: "var(--muted)", marginBottom: 18 }}>
        Recruitment · PESU EC
      </p>
      <h1 style={{ fontSize: "clamp(2.2rem, 7vw, 5rem)", lineHeight: 1.05, maxWidth: 900 }}>
        {before ? "Applications open soon" : "Applications are closed"}
      </h1>

      {before ? (
        <>
          <Units ms={win.opens - win.now} />
          <p style={{ color: "var(--muted)", fontSize: "1.05rem" }}>Opens {fmtDate(win.opens)} IST</p>
        </>
      ) : (
        <p style={{ color: "var(--muted)", fontSize: "1.15rem", marginTop: 22, maxWidth: 560 }}>
          This recruitment window has ended. Follow our{" "}
          <Link href="/announcements" style={{ textDecoration: "underline", color: "var(--fg)" }}>announcements</Link> for the next round.
        </p>
      )}

      <p style={{ marginTop: 40 }}>
        Already applied?{" "}
        <Link href="/status" style={{ textDecoration: "underline", fontWeight: 600 }}>Check your status</Link>
      </p>
    </section>
  );
}