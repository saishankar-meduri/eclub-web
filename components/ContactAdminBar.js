"use client";

import Link from "next/link";
import { useAuth } from "../lib/useAuth";

export default function ContactAdminBar() {
  const { user, profile } = useAuth();

  if (!user || profile?.role !== "superadmin") {
    return null;
  }

  return (
    <aside
      className="contact-admin-bar"
      aria-label="Superadmin controls"
    >
      <div className="contact-admin-bar-inner">
        <div className="contact-admin-badge-col">
          <span className="contact-admin-pulse" aria-hidden="true" />
          <span className="contact-admin-label">
            Superadmin Access · <strong>{user.email}</strong>
          </span>
        </div>
        <div className="contact-admin-actions">
          <Link
            href="/admin/contacts"
            className="contact-admin-btn"
          >
            Manage Contact Page <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}

