import Link from 'next/link';
import { getAnnouncements } from '../../lib/data';
import { formatShortDate } from '../../lib/format';

export const revalidate = 60;
export const metadata = { title: 'Announcements' };

export default async function AnnouncementsPage() {
  const announcements = await getAnnouncements();

  return (
    <div className="page-shell">
      <section className="container ed-page-section">
        <header className="modern-page-header modern-header-split">
          <div>
            <div className="modern-kicker">
              <span className="modern-kicker-idx">02</span>
              <span className="modern-kicker-rule" aria-hidden="true" />
              <span>Club Dispatches</span>
            </div>
            <h1 className="modern-display-title">
              Announcements <span className="modern-title-dim">&amp; updates.</span>
            </h1>
          </div>
          <p className="modern-header-aside">
            Official updates, recruitment windows, event drops, and community notes from The
            Entrepreneurship Club.
          </p>
        </header>

        {announcements.length ? (
          <div className="dispatch-list">
            {announcements.map((a, idx) => (
              <article key={a.id} className="dispatch-row">
                <div className="dispatch-meta">
                  <span className="dispatch-index">{String(idx + 1).padStart(2, '0')}</span>
                  <time dateTime={a.created_at}>{formatShortDate(a.created_at)}</time>
                </div>
                <div className="dispatch-content">
                  <h2>{a.title}</h2>
                  <p className="body-text">{a.body}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-panel">
            <div>
              <p className="empty-title">No announcements yet.</p>
              <p className="muted">
                When recruitment opens or new club updates go live, they will appear right here.
              </p>
            </div>
            <Link href="/events" className="btn-pill-secondary btn-pill-sm">
              Explore events <span className="btn-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
