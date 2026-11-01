import Link from "next/link";
import { getContacts } from "../../lib/data";
import { SITE } from "../../lib/site";
import ContactCard from "../../components/ContactCard";
import ContactAdminBar from "../../components/ContactAdminBar";

export const revalidate = 60;

export const metadata = {
  title: "Contact",
  description:
    "Official contacts for The Entrepreneurship Club at PES University. Connect with the Previous Core Team (Batch 2026) and Club Coordinator Prof. Lakshmeesa.",
};

async function fetchContacts() {
  // 1. Try Firebase Admin SDK if configured on the server (bypasses client security rules)
  if (
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  ) {
    try {
      const { adminDb } = await import("../../lib/firebaseAdmin.js");
      const snap = await adminDb().collection("contacts").where("published", "==", true).get();
      
        return snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              created_at: data.created_at?.toDate?.()?.toISOString() ?? null,
              updated_at: data.updated_at?.toDate?.()?.toISOString() ?? null,
            };
          })
          .sort((a, b) => {
            const orderA = typeof a.order === "number" ? a.order : 999;
            const orderB = typeof b.order === "number" ? b.order : 999;
            if (orderA !== orderB) return orderA - orderB;
            return (a.name || "").localeCompare(b.name || "");
          });
      
    } catch {
      // Fall through to client SDK or initial contacts
    }
  }

  // 2. Try Client SDK if configured
  try {
    const list = await getContacts();
    if (list && list.length > 0) return list;
  } catch {
    // Fall through
  }

  // 3. Fall back to initial contacts
  return [];
}

export default async function ContactPage() {
  const contacts = await fetchContacts();

  // Separate Club Coordinator from Previous Core Team and other groups
  const coordinatorContacts = contacts.filter(
    (c) =>
      c.group === "Club Coordinator" ||
      c.designation?.toLowerCase().includes("coordinator")
  );

  const core2026Contacts = contacts.filter(
    (c) =>
      c.group === "Previous Core Team — Batch 2026" &&
      !coordinatorContacts.some((coord) => coord.id === c.id)
  );

  // Any other dynamic groups created by Superadmins
  const otherGroups = Array.from(
    new Set(
      contacts
        .filter(
          (c) =>
            c.group !== "Club Coordinator" &&
            c.group !== "Previous Core Team — Batch 2026" &&
            !coordinatorContacts.some((coord) => coord.id === c.id)
        )
        .map((c) => c.group)
    )
  );

  return (
    <div className="page-shell">
      {/* Superadmin Quick Access Bar */}
      <ContactAdminBar />

      <section className="container ed-page-section" aria-labelledby="contact-page-title">
        {/* Page Hero Header */}
        <header className="modern-page-header modern-header-split">
          <div>
            <div className="modern-kicker">
              <span className="modern-kicker-idx">04</span>
              <span className="modern-kicker-rule" aria-hidden="true" />
              <span>Contact Directory · PESU EC</span>
            </div>
            <h1 id="contact-page-title" className="modern-display-title">
              Get in touch. <span className="modern-title-dim">Connect with the team.</span>
            </h1>
          </div>
          <p className="modern-header-aside">
            Reach out to our club coordinator and previous student leadership for inquiries,
            collaborations, and alumni connect.
          </p>
        </header>

        {/* SECTION 1: CLUB COORDINATOR */}
        <section className="contact-section" aria-labelledby="section-coordinator">
          <div className="contact-section-head">
            <div className="modern-kicker">
              <span className="modern-kicker-idx">01</span>
              <span className="modern-kicker-rule" aria-hidden="true" />
              <span>Faculty Leadership</span>
            </div>
            <h2 id="section-coordinator" className="contact-section-title">
              CLUB COORDINATOR
            </h2>
            <p className="contact-section-sub">
              Faculty guidance, administrative approvals, and institutional oversight for E-Club PESU.
            </p>
          </div>

          <div className="contact-coordinator-grid">
            {coordinatorContacts.length > 0 ? (
              coordinatorContacts.map((c) => (
                <ContactCard key={c.id || c.name} contact={c} isCoordinator={true} />
              ))
            ) : (
              <div className="empty-panel">
                <p className="empty-title">Coordinator details pending.</p>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: PREVIOUS CORE TEAM — BATCH 2026 */}
        <section className="contact-section" aria-labelledby="section-core-2026">
          <div className="contact-section-head">
            <div className="modern-kicker">
              <span className="modern-kicker-idx">02</span>
              <span className="modern-kicker-rule" aria-hidden="true" />
              <span>Student Leadership Archive</span>
            </div>
            <h2 id="section-core-2026" className="contact-section-title">
              PREVIOUS CORE TEAM — BATCH 2026
            </h2>
            <p className="contact-section-sub">
              The founding student leads who spearheaded operations, events, outreach, and technical
              initiatives across PES University Electronic City Campus.
            </p>
          </div>

          <div className="contact-grid">
            {core2026Contacts.length > 0 ? (
              core2026Contacts.map((c) => (
                <ContactCard key={c.id || c.name} contact={c} />
              ))
            ) : (
              <div className="empty-panel">
                <p className="empty-title">Core team details pending.</p>
              </div>
            )}
          </div>
        </section>

        {/* DYNAMIC ADDITIONAL GROUPS (Created by Superadmins) */}
        {otherGroups.map((groupName, gIdx) => {
          const groupMembers = contacts.filter((c) => c.group === groupName);
          return (
            <section key={groupName} className="contact-section" aria-labelledby={`section-group-${gIdx}`}>
              <div className="contact-section-head">
                <div className="modern-kicker">
                  <span className="modern-kicker-idx">{String(gIdx + 3).padStart(2, "0")}</span>
                  <span className="modern-kicker-rule" aria-hidden="true" />
                  <span>{groupName}</span>
                </div>
                <h2 id={`section-group-${gIdx}`} className="contact-section-title">
                  {groupName.toUpperCase()}
                </h2>
              </div>

              <div className="contact-grid">
                {groupMembers.map((c) => (
                  <ContactCard key={c.id || c.name} contact={c} />
                ))}
              </div>
            </section>
          );
        })}

        {/* General Club Inquiries Panel */}
        <div className="contact-inquiries-card">
          <div className="contact-inquiries-content">
            <div className="modern-kicker">
              <span className="modern-kicker-rule" aria-hidden="true" />
              <span>General inquiries</span>
            </div>
            <h3 className="contact-inquiries-title">Looking to collaborate or build with us?</h3>
            <p className="contact-inquiries-lead">
              For event partnerships, sponsorship proposals, or joining the club as a recruit, explore
              our open domains or connect on our social channels.
            </p>
            <div className="contact-inquiries-actions">
              <Link href="/join" className="btn-pill-primary">
                Join the club <span className="btn-arrow" aria-hidden="true">→</span>
              </Link>
              <a
                href={SITE.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pill-secondary"
              >
                Instagram ↗
              </a>
              <a
                href={SITE.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pill-secondary"
              >
                LinkedIn ↗
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

