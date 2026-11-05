"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminGate from "../../../components/AdminGate";
import ContactPhotoInput from "../../../components/contacts/ContactPhotoInput";

export default function ContactsAdminPage() {
  return (
    <AdminGate roles={["superadmin"]}>
      {(auth) => <ContactsManager auth={auth} />}
    </AdminGate>
  );
}

const PRESET_GROUPS = [
  "Club Coordinator",
  "Previous Core Team — Batch 2026",
];

const BLANK_FORM = {
  name: "",
  designation: "",
  group: "Previous Core Team — Batch 2026",
  customGroup: "",
  email: "",
  linkedin: "",
  github: "",
  photo_url: "",
  order: 1,
  published: true,
};

function ContactsManager({ auth }) {
  const [list, setList] = useState(null);
  const [activeGroup, setActiveGroup] = useState("all");
  const [form, setForm] = useState(null); // null = view list, object = editing/creating
  const [editingId, setEditingId] = useState(null); // null = new, string = updating
  const [deleteTarget, setDeleteTarget] = useState(null); // contact to confirm deletion for
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const call = useCallback(
    async (method, payload) => {
      const token = await auth.token();
      const r = await fetch("/api/admin/contacts", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Request failed");
      return j;
    },
    [auth]
  );

  const load = useCallback(async () => {
    try {
      setErr("");
      const res = await call("GET");
      setList(res.contacts || []);
    } catch (e) {
      setErr(e.message);
      setList([]);
    }
  }, [call]);

  useEffect(() => {
    load();
  }, [load]);

  // Flash success message
  const flashSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  // Distinct groups present in database + presets
  const availableGroups = useMemo(() => {
    const set = new Set(PRESET_GROUPS);
    if (Array.isArray(list)) {
      list.forEach((c) => {
        if (c.group) set.add(c.group);
      });
    }
    return Array.from(set);
  }, [list]);

  // Filtered contacts based on active tab
  const filteredContacts = useMemo(() => {
    if (!list) return [];
    if (activeGroup === "all") return list;
    return list.filter((c) => c.group === activeGroup);
  }, [list, activeGroup]);

  // Open Add modal/form
  function handleOpenAdd() {
    setErr("");
    setEditingId(null);
    const targetGroup = activeGroup !== "all" ? activeGroup : "Previous Core Team — Batch 2026";
    const groupItems = (list || []).filter((c) => c.group === targetGroup);
    const maxOrder = groupItems.reduce((max, c) => Math.max(max, Number(c.order) || 0), 0);
    setForm({
      ...BLANK_FORM,
      group: targetGroup,
      order: maxOrder + 1,
    });
  }

  // Open Edit modal/form
  function handleOpenEdit(c) {
    setErr("");
    setEditingId(c.id);
    const isCustom = !PRESET_GROUPS.includes(c.group);
    setForm({
      name: c.name || "",
      designation: c.designation || "",
      group: isCustom ? "__custom__" : c.group,
      customGroup: isCustom ? c.group : "",
      email: c.email || "",
      linkedin: c.linkedin || "",
      github: c.github || "",
      photo_url: c.photo_url || "",
      order: typeof c.order === "number" ? c.order : 1,
      published: c.published !== false,
    });
  }

  // Save (Create or Update)
  async function handleSave(e) {
    if (e) e.preventDefault();
    setErr("");

    const name = form.name.trim();
    const designation = form.designation.trim();
    const resolvedGroup = (
      form.group === "__custom__" ? form.customGroup : form.group
    ).trim();

    if (!name) return setErr("Name is required");
    if (!designation) return setErr("Designation is required");
    if (!resolvedGroup) return setErr("Group/Category is required");

    setBusy(true);
    try {
      const payload = {
        name,
        designation,
        group: resolvedGroup,
        email: form.email.trim(),
        linkedin: form.linkedin.trim(),
        github: form.github.trim(),
        photo_url: form.photo_url,
        order: Number(form.order) || 1,
        published: form.published,
      };

      if (editingId) {
        await call("PUT", { ...payload, id: editingId });
        flashSuccess(`Updated contact "${name}"`);
      } else {
        await call("POST", payload);
        flashSuccess(`Added new contact "${name}"`);
      }

      setForm(null);
      setEditingId(null);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Toggle publish state
  async function handleTogglePublish(c) {
    setErr("");
    try {
      await call("PUT", {
        ...c,
        id: c.id,
        published: !c.published,
      });
      flashSuccess(`Contact ${c.published ? "unpublished" : "published"}`);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  }

  // Confirm delete dialog
  function handleRequestDelete(c) {
    setErr("");
    setDeleteTarget(c);
  }

  // Perform delete
  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await call("DELETE", { id: deleteTarget.id });
      flashSuccess(`Deleted "${deleteTarget.name}"`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Seed default contacts (idempotent)
  async function handlePurgePhones() {
    if (!confirm("Delete all stored phone numbers from the contacts database? This cannot be undone.")) return;
    setBusy(true);
    setErr("");
    try {
      const res = await call("POST", { action: "purge_phones" });
      flashSuccess(`Removed phone numbers from ${res.purged} contact(s)`);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSeedDefault() {
    if (!confirm("Seed default contacts (Batch 2026 Core Team and Prof. Lakshmeesa)? Existing entries will not be duplicated.")) {
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await call("POST", { action: "seed_default" });
      flashSuccess(`Default contacts seeded (${res.seededCount} new added)`);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Move up / down within group
  async function handleMove(c, direction) {
    if (!list) return;
    // Get all items in the same group sorted by order
    const groupItems = list
      .filter((item) => item.group === c.group)
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    const index = groupItems.findIndex((item) => item.id === c.id);
    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= groupItems.length) return;

    const other = groupItems[targetIndex];

    // Swap order values
    const currentOrder = Number(c.order) || (index + 1);
    const otherOrder = Number(other.order) || (targetIndex + 1);

    const newCurrentOrder = currentOrder === otherOrder
      ? (direction === "up" ? currentOrder - 1 : currentOrder + 1)
      : otherOrder;
    const newOtherOrder = currentOrder;

    setBusy(true);
    try {
      await call("PATCH", {
        items: [
          { id: c.id, order: newCurrentOrder },
          { id: other.id, order: newOtherOrder },
        ],
      });
      flashSuccess(`Reordered ${c.name}`);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Navigation Header */}
      <div className="rc-row" style={{ alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1>Manage Contact Page</h1>
          <p className="rc-muted">
            Add, edit, reorder, and remove contacts for the Previous Core Team, Club Coordinator, and other categories.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <a className="rc-btn ghost" href="/contact" target="_blank" rel="noopener noreferrer">
            View Public Page ↗
          </a>
          <a className="rc-btn ghost" href="/admin/superadmin">
            Back to Superadmin
          </a>
          <button className="rc-btn ghost" onClick={auth.signOut}>
            Sign out
          </button>
        </div>
      </div>

      {/* Notifications */}
      {err && (
        <div className="rc-err" style={{ padding: "12px 16px", background: "rgba(255, 60, 60, 0.1)", borderRadius: 10, marginBottom: 16 }}>
          ⚠️ {err}
        </div>
      )}
      {successMsg && (
        <div style={{ color: "#34d399", padding: "12px 16px", background: "rgba(52, 211, 153, 0.1)", borderRadius: 10, marginBottom: 16, border: "1px solid rgba(52, 211, 153, 0.3)" }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Main Controls Card */}
      <div className="rc-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <button
            type="button"
            className="rc-btn"
            style={{ margin: 0 }}
            onClick={handleOpenAdd}
          >
            + Add Contact
          </button>

          <button
            type="button"
            className="rc-btn ghost"
            style={{ margin: 0 }}
            disabled={busy}
            onClick={handlePurgePhones}
            title="One-off cleanup: removes any phone numbers still stored from the old version"
          >
            Remove stored phone numbers
          </button>

          <button
            type="button"
            className="rc-btn ghost"
            style={{ margin: 0 }}
            disabled={busy}
            onClick={handleSeedDefault}
            title="Idempotently populates the Batch 2026 Core Team and Prof. Lakshmeesa if missing"
          >
            {busy ? "Seeding…" : "Seed Initial Contacts"}
          </button>
        </div>

        {/* Group Filter Tabs */}
        <div className="rc-tabs" style={{ marginTop: 20 }}>
          <button
            type="button"
            className={`rc-btn ${activeGroup === "all" ? "" : "ghost"}`}
            onClick={() => setActiveGroup("all")}
          >
            All Contacts ({list?.length ?? 0})
          </button>
          {availableGroups.map((grp) => {
            const count = (list || []).filter((c) => c.group === grp).length;
            return (
              <button
                key={grp}
                type="button"
                className={`rc-btn ${activeGroup === grp ? "" : "ghost"}`}
                onClick={() => setActiveGroup(grp)}
              >
                {grp} ({count})
              </button>
            );
          })}
        </div>

        {/* Table View */}
        {list === null ? (
          <p className="rc-muted" style={{ padding: 24, textAlign: "center" }}>Loading contacts…</p>
        ) : filteredContacts.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <p className="rc-muted">No contacts found in this section.</p>
            <button type="button" className="rc-btn ghost" onClick={handleSeedDefault} style={{ marginTop: 12 }}>
              Populate Default Contacts (2026 Core & Coordinator)
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Order</th>
                  <th>Name</th>
                  <th>Designation</th>
                  <th>Group</th>
                  <th>Email</th>
                  <th>Links</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((c, idx) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontWeight: 600, minWidth: 20, textAlign: "center" }}>{c.order ?? idx + 1}</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <button
                            type="button"
                            title="Move Up"
                            disabled={busy}
                            onClick={() => handleMove(c, "up")}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--fg)",
                              cursor: "pointer",
                              padding: "0 2px",
                              lineHeight: 1,
                              fontSize: "0.75rem",
                              opacity: 0.7,
                            }}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            title="Move Down"
                            disabled={busy}
                            onClick={() => handleMove(c, "down")}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--fg)",
                              cursor: "pointer",
                              padding: "0 2px",
                              lineHeight: 1,
                              fontSize: "0.75rem",
                              opacity: 0.7,
                            }}
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{c.name}</strong>
                    </td>
                    <td>
                      <span className="rc-badge">{c.designation}</span>
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                      {c.group}
                    </td>
                    <td>
                      {c.email ? (
                        <a href={`mailto:${c.email}`} style={{ color: "inherit", textDecoration: "underline", fontSize: "0.85rem" }}>
                          {c.email}
                        </a>
                      ) : (
                        <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "0.85rem" }}>None</span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.85rem" }}>
                      {[c.github && "GitHub", c.linkedin && "LinkedIn", c.photo_url && "Photo"].filter(Boolean).join(" · ") || (
                        <span style={{ color: "var(--muted)", fontStyle: "italic" }}>None</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(c)}
                        title="Click to toggle publish status"
                        style={{
                          background: c.published ? "rgba(52, 211, 153, 0.15)" : "rgba(150, 150, 160, 0.15)",
                          color: c.published ? "#34d399" : "var(--muted)",
                          border: `1px solid ${c.published ? "rgba(52, 211, 153, 0.4)" : "var(--line)"}`,
                          borderRadius: 999,
                          padding: "3px 10px",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        {c.published ? "Published" : "Draft"}
                      </button>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        className="rc-btn ghost"
                        style={{ margin: "0 4px", padding: "4px 12px", fontSize: "0.8rem" }}
                        onClick={() => handleOpenEdit(c)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rc-btn ghost"
                        style={{ margin: "0 4px", padding: "4px 12px", fontSize: "0.8rem", color: "#ff8a8a", borderColor: "rgba(255, 100, 100, 0.3)" }}
                        onClick={() => handleRequestDelete(c)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {form && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div
            className="rc-card"
            style={{
              width: "100%",
              maxWidth: 540,
              maxHeight: "90vh",
              overflowY: "auto",
              margin: 0,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
              border: "1px solid var(--line-strong)",
            }}
          >
            <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>
              {editingId ? "Edit Contact" : "Add New Contact"}
            </h2>
            <p className="rc-muted" style={{ marginBottom: 16 }}>
              {editingId ? "Update member details and contact information." : "Add a member to the contact page."}
            </p>

            <form onSubmit={handleSave}>
              <div style={{ marginBottom: 12 }}>
                <label htmlFor="c-name">Full Name *</label>
                <input
                  id="c-name"
                  required
                  placeholder="e.g. Jane Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label htmlFor="c-designation">Designation / Position *</label>
                <input
                  id="c-designation"
                  required
                  placeholder="e.g. President, Head of Tech, Club Coordinator"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label htmlFor="c-group">Group / Category *</label>
                <select
                  id="c-group"
                  value={form.group}
                  onChange={(e) => setForm({ ...form, group: e.target.value })}
                >
                  {PRESET_GROUPS.map((grp) => (
                    <option key={grp} value={grp}>
                      {grp}
                    </option>
                  ))}
                  {availableGroups
                    .filter((g) => !PRESET_GROUPS.includes(g))
                    .map((grp) => (
                      <option key={grp} value={grp}>
                        {grp}
                      </option>
                    ))}
                  <option value="__custom__">+ Add Custom Group…</option>
                </select>

                {form.group === "__custom__" && (
                  <input
                    placeholder="Enter new group name"
                    style={{ marginTop: 8 }}
                    required
                    value={form.customGroup}
                    onChange={(e) => setForm({ ...form, customGroup: e.target.value })}
                  />
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <ContactPhotoInput
                  value={form.photo_url}
                  onChange={(url) => setForm({ ...form, photo_url: url })}
                  getToken={auth.token}
                />
              </div>

              <div className="rc-row" style={{ marginBottom: 12 }}>
                <div>
                  <label htmlFor="c-email">Email Address (Optional)</label>
                  <input
                    id="c-email"
                    type="email"
                    placeholder="user@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="c-linkedin">LinkedIn (Optional)</label>
                  <input
                    id="c-linkedin"
                    type="url"
                    placeholder="https://www.linkedin.com/in/…"
                    value={form.linkedin}
                    onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                  />
                </div>
              </div>

              <div className="rc-row" style={{ marginBottom: 12 }}>
                <div>
                  <label htmlFor="c-github">GitHub (Optional)</label>
                  <input
                    id="c-github"
                    type="url"
                    placeholder="https://github.com/username"
                    value={form.github}
                    onChange={(e) => setForm({ ...form, github: e.target.value })}
                  />
                </div>
              </div>

              <div className="rc-row" style={{ marginBottom: 16 }}>
                <div>
                  <label htmlFor="c-order">Display Order</label>
                  <input
                    id="c-order"
                    type="number"
                    min="1"
                    max="999"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: e.target.value })}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", paddingTop: 28 }}>
                  <label style={{ margin: 0, display: "flex", alignItems: "center", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={form.published}
                      onChange={(e) => setForm({ ...form, published: e.target.checked })}
                    />
                    Visible on public Contact page
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  className="rc-btn ghost"
                  disabled={busy}
                  onClick={() => setForm(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rc-btn"
                  disabled={busy}
                >
                  {busy ? "Saving…" : editingId ? "Update Contact" : "Create Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Deletion */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div
            className="rc-card"
            style={{
              width: "100%",
              maxWidth: 440,
              margin: 0,
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
              border: "1px solid rgba(255, 100, 100, 0.4)",
            }}
          >
            <h3 style={{ fontSize: "1.2rem", color: "#ff8a8a", marginBottom: 8 }}>
              Confirm Contact Deletion
            </h3>
            <p style={{ fontSize: "0.95rem", lineHeight: 1.5, marginBottom: 16 }}>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong> ({deleteTarget.designation}) from <em>{deleteTarget.group}</em>?
            </p>
            <p className="rc-muted" style={{ fontSize: "0.85rem", marginBottom: 20 }}>
              This action cannot be undone and will immediately remove this entry from the public Contact page.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="rc-btn ghost"
                disabled={busy}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rc-btn"
                style={{ background: "#dc2626", borderColor: "#dc2626", color: "#fff" }}
                disabled={busy}
                onClick={handleConfirmDelete}
              >
                {busy ? "Deleting…" : "Delete Contact"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

