"use client";

// value = the picked options separated by newlines (stored as the answer string)
export default function CheckboxAnswerInput({ options, value, onChange }) {
  const picked = new Set(value ? value.split("\n").filter(Boolean) : []);
  const toggle = (o) => {
    const next = new Set(picked);
    next.has(o) ? next.delete(o) : next.add(o);
    onChange(options.filter((x) => next.has(x)).join("\n")); // keeps the original option order
  };
  return (
    <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
      {options.map((o) => (
        <label key={o} style={{ display: "flex", alignItems: "center", gap: 10, margin: 0, cursor: "pointer", textTransform: "none", letterSpacing: "normal" }}>
          <input type="checkbox" checked={picked.has(o)} onChange={() => toggle(o)} style={{ width: "auto", margin: 0, flex: "none" }} />
          <span>{o}</span>
        </label>
      ))}
    </div>
  );
}
