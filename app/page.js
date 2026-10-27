import Link from 'next/link';
import EventCard from '../components/EventCard';
import { getEvents, getAnnouncements } from '../lib/data';
import { formatShortDate } from '../lib/format';
import { SITE } from '../lib/site';

export const revalidate = 60;

export default async function Home() {
  const [events, announcements] = await Promise.all([
    getEvents({ statuses: ['live', 'upcoming'], limit: 3 }),
    getAnnouncements({ limit: 3 }),
  ]);

  return (
    <>
      <section className="container hero">
        <div>
          <h1>{SITE.name} of PES University</h1>
          <p className="lead">{SITE.tagline}</p>
          <Link href="/events" className="btn btn-solid">See events</Link>
        </div>
        <div className="hero-logo">
          <img src="/logo.jpg" alt="E-Club logo: a stick figure leaning on a light bulb" />
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <h2>Upcoming events</h2>
          <Link href="/events" className="text-link">All events</Link>
        </div>
        {events.length ? (
          <div className="grid">
            {events.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        ) : (
          <p className="muted">No upcoming events right now. Check back soon.</p>
        )}
      </section>

      <section className="container section">
        <div className="section-head">
          <h2>Latest announcements</h2>
          <Link href="/announcements" className="text-link">All announcements</Link>
        </div>
        {announcements.length ? (
          <div>
            {announcements.map((a) => (
              <article key={a.id} className="post">
                <time dateTime={a.created_at}>{formatShortDate(a.created_at)}</time>
                <h3>{a.title}</h3>
                <p className="body-text">{a.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No announcements yet.</p>
        )}
      </section>
    </>
  );
}
