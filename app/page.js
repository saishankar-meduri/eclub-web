import Link from 'next/link';
import EventCard from '../components/EventCard';
import DeferredVisual from '../components/DeferredVisual';
import HeroTypewriter from '../components/HeroTypewriter';
import { getEvents, getAnnouncements } from '../lib/data';
import { formatShortDate } from '../lib/format';
import { SITE } from '../lib/site';

export const revalidate = 60;

const PILLARS = [
  {
    num: '01',
    title: 'Question defaults',
    desc: 'Spot real-world friction, challenge standard assumptions, and frame problems worth solving.',
  },
  {
    num: '02',
    title: 'Ship experiments',
    desc: 'Move from raw concepts to tangible prototypes through workshops, sprints, and flagship events.',
  },
  {
    num: '03',
    title: 'Build together',
    desc: 'Collaborate across engineering, design, operations, marketing, and venture innovation.',
  },
];

export default async function Home() {
  const [events, announcements] = await Promise.all([
    getEvents({ statuses: ['live', 'upcoming'], limit: 3 }),
    getAnnouncements({ limit: 3 }),
  ]);

  return (
    <div className="page-shell">
      {/* HERO */}
      <section className="container ed-hero" aria-labelledby="home-hero-title">
        <div className="ed-hero-grid">
          <div>
            <div className="modern-kicker">
              <span className="ed-dot" aria-hidden="true" />
              <span>{SITE.campus}</span>
            </div>
            <HeroTypewriter />
            <p className="ed-hero-lead">{SITE.tagline}</p>

            <div className="ed-actions">
              <Link href="/join" className="btn-pill-primary">
                Join the club <span className="btn-arrow" aria-hidden="true">→</span>
              </Link>
              <Link href="/events" className="btn-pill-secondary">
                Explore events
              </Link>
            </div>

            <div className="ed-meta-row">
              <div className="ed-meta-item">
                <span className="ed-meta-val">0 to 1</span>
                <span className="ed-meta-label">Ideation to execution</span>
              </div>
              <div className="ed-meta-item">
                <span className="ed-meta-val">6 Domains</span>
                <span className="ed-meta-label">Cross-functional teams</span>
              </div>
              <div className="ed-meta-item">
                <span className="ed-meta-val">PESU EC</span>
                <span className="ed-meta-label">Electronic City Campus</span>
              </div>
            </div>
          </div>

          <DeferredVisual kind="bulb" />
        </div>

        <div className="ed-pillars">
          {PILLARS.map((p) => (
            <div key={p.num} className="ed-pillar">
              <span className="ed-pillar-num">{p.num}</span>
              <h2 className="ed-pillar-title">{p.title}</h2>
              <p className="ed-pillar-desc">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* UPCOMING EVENTS */}
      <section className="container ed-section" aria-labelledby="home-events-heading">
        <div className="ed-section-top">
          <div>
            <div className="modern-kicker">
              <span className="modern-kicker-idx">01</span>
              <span className="modern-kicker-rule" aria-hidden="true" />
              <span>On the calendar</span>
            </div>
            <h2 id="home-events-heading" className="ed-section-title">
              Upcoming <span className="modern-title-dim">events</span>
            </h2>
          </div>
          <Link href="/events" className="btn-pill-secondary btn-pill-sm">
            All events <span className="btn-arrow" aria-hidden="true">→</span>
          </Link>
        </div>

        {events.length ? (
          <div className="grid">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <p className="events-empty-text">No upcoming events</p>
        )}
      </section>

      {/* LATEST ANNOUNCEMENTS */}
      <section className="container ed-section" aria-labelledby="home-dispatches-heading">
        <div className="ed-section-top">
          <div>
            <div className="modern-kicker">
              <span className="modern-kicker-idx">02</span>
              <span className="modern-kicker-rule" aria-hidden="true" />
              <span>Club dispatches</span>
            </div>
            <h2 id="home-dispatches-heading" className="ed-section-title">
              Latest <span className="modern-title-dim">announcements</span>
            </h2>
          </div>
          <Link href="/announcements" className="btn-pill-secondary btn-pill-sm">
            All announcements <span className="btn-arrow" aria-hidden="true">→</span>
          </Link>
        </div>

        {announcements.length ? (
          <div className="dispatch-list">
            {announcements.map((a, idx) => (
              <article key={a.id} className="dispatch-row">
                <div className="dispatch-meta">
                  <span className="dispatch-index">{String(idx + 1).padStart(2, '0')}</span>
                  <time dateTime={a.created_at}>{formatShortDate(a.created_at)}</time>
                </div>
                <div className="dispatch-content">
                  <h3>{a.title}</h3>
                  <p className="body-text">{a.body}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-panel">
            <div>
              <p className="empty-title">No announcements published yet.</p>
              <p className="muted">Check back soon for club updates and recruitment notices.</p>
            </div>
          </div>
        )}
      </section>

      {/* CLOSING CTA */}
      <section className="container ed-cta-section" aria-labelledby="home-cta-heading">
        <div className="ed-cta-inner">
          <div className="modern-kicker">
            <span className="modern-kicker-idx">03</span>
            <span className="modern-kicker-rule" aria-hidden="true" />
            <span>Get involved</span>
          </div>
          <h2 id="home-cta-heading" className="ed-cta-title">
            Ready to turn ambition <span className="modern-title-dim">into action?</span>
          </h2>
          <p className="ed-cta-lead">
            Join a community of builders, designers, and operators shaping what comes next at PESU.
          </p>
          <div className="ed-actions">
            <Link href="/join" className="btn-pill-primary">
              Apply to join <span className="btn-arrow" aria-hidden="true">→</span>
            </Link>
            <Link href="/about" className="btn-pill-secondary">
              Read our philosophy
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
