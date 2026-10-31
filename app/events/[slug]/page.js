import Link from 'next/link';
import { notFound } from 'next/navigation';
import StatusBadge from '../../../components/StatusBadge';
import { getEvents, getEventBySlug } from '../../../lib/data';
import { formatDate, formatTime, formatFee, formatTeam, lines } from '../../../lib/format';
import { eventImages, optimize } from '../../../lib/images';

export const revalidate = 60;

export async function generateStaticParams() {
  const events = await getEvents();
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  return { title: event ? event.title : 'Event' };
}

export default async function EventPage({ params }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const schedule = lines(event.schedule);
  const rules = lines(event.rules);
  const imgs = eventImages(event);

  return (
    <div className="page-shell">
      <div className="container ed-page-section">
        <Link href="/events" className="back-pill">
          <span aria-hidden="true">←</span> Back to events
        </Link>

        <header className="detail-head">
          <div className="detail-meta-bar">
            <StatusBadge status={event.status} />
            <span className="muted">
              {formatDate(event.date)} · {formatTime(event.date)}
              {event.venue ? ` · ${event.venue}` : ''}
            </span>
          </div>
          <h1 className="ed-page-title">{event.title}</h1>
        </header>

        {imgs.length > 0 && (
          <div className="banner banner-large">
            <img className="cover" src={optimize(imgs[0], 1400)} alt="" />
          </div>
        )}

        {imgs.length > 1 && (
          <div className="gallery">
            {imgs.slice(1).map((src) => (
              <img key={src} src={optimize(src, 600)} alt="" loading="lazy" />
            ))}
          </div>
        )}

        <div className="detail">
          <div className="detail-main">
            {event.description && (
              <section className="detail-block">
                <span className="ed-eyebrow">Overview</span>
                <h2>About this event</h2>
                <p className="body-text detail-prose">{event.description}</p>
              </section>
            )}

            {schedule.length > 0 && (
              <section className="detail-block">
                <span className="ed-eyebrow">Run of show</span>
                <h2>Schedule</h2>
                <ol className="ed-step-list">
                  {schedule.map((s, i) => (
                    <li key={i}>
                      <span className="ed-step-idx">{String(i + 1).padStart(2, '0')}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {rules.length > 0 && (
              <section className="detail-block">
                <span className="ed-eyebrow">Guidelines</span>
                <h2>Rules & format</h2>
                <ol className="ed-step-list">
                  {rules.map((r, i) => (
                    <li key={i}>
                      <span className="ed-step-idx">{String(i + 1).padStart(2, '0')}</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>

          <aside className="summary">
            <span className="summary-heading">Event details</span>
            <dl>
              <div>
                <dt>Date</dt>
                <dd>{formatDate(event.date)}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{formatTime(event.date)}</dd>
              </div>
              {event.venue && (
                <div>
                  <dt>Venue</dt>
                  <dd>{event.venue}</dd>
                </div>
              )}
              <div>
                <dt>Entry fee</dt>
                <dd>{formatFee(event.fee, event.team_size)}</dd>
              </div>
              <div>
                <dt>Team size</dt>
                <dd>{formatTeam(event.team_size)}</dd>
              </div>
            </dl>

            {event.status === 'past' ? (
              <span className="btn-pill-disabled">Event ended</span>
            ) : event.registration_url ? (
              <a
                href={event.registration_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pill-primary btn-full"
              >
                Register now <span className="btn-arrow" aria-hidden="true">↗</span>
              </a>
            ) : (
              <span className="btn-pill-disabled">Registration opens soon</span>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
