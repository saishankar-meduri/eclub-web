export default function ContactCard({ contact, isCoordinator = false }) {
  const { name, designation, phone, email } = contact;

  // Generate initials for avatar monogram (e.g., "Krish Gupta" -> "KG")
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  const cleanPhone = phone ? phone.replace(/[^0-9+]/g, "") : "";
  const hasContactInfo = Boolean(cleanPhone || email);

  return (
    <article className={`contact-card ${isCoordinator ? "contact-card-highlight" : ""}`}>
      <div className="contact-card-header">
        <div className="contact-avatar" aria-hidden="true">
          <span>{initials || "EC"}</span>
        </div>
        <div className="contact-meta">
          <span className="contact-role-tag">{designation}</span>
          <h3 className="contact-name">{name}</h3>
        </div>
      </div>

      <div className="contact-card-body">
        {hasContactInfo ? (
          <div className="contact-channels">
            {email && (
              <a
                href={`mailto:${email}`}
                className="contact-channel-link"
                title={`Send email to ${name}`}
              >
                <svg
                  className="contact-channel-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span className="contact-channel-text">{email}</span>
                <span className="contact-arrow" aria-hidden="true">↗</span>
              </a>
            )}

            {cleanPhone && (
              <a
                href={`tel:${cleanPhone}`}
                className="contact-channel-link"
                title={`Call ${name} at ${phone}`}
              >
                <svg
                  className="contact-channel-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span className="contact-channel-text">{phone}</span>
                <span className="contact-arrow" aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        ) : (
          <div className="contact-no-direct">
            <span className="contact-no-direct-note">
              Faculty advisory and institutional inquiries routed through E-Club PESU.
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

