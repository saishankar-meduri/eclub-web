import Link from 'next/link';
import EventCard from './EventCard';
import EventMarquee from './EventMarquee';
import { getEvents } from '../lib/data';

export default async function EventsView({ past = false }) {
  const events = past
    ? await getEvents({ statuses: ['past'], ascending: false })
    : await getEvents({ statuses: ['live', 'upcoming'] });

  return (
    <div className="page-shell">
      <EventMarquee events={events} />

      <section className="container ed-page-section">
        <header className="modern-page-header events-header-clean">
          <div className="modern-kicker">
            <span className="modern-kicker-idx">01</span>
            <span className="modern-kicker-rule" aria-hidden="true" />
            <span>Club Calendar</span>
          </div>
          <h1 className="events-dual-heading">
            <Link
              href="/events"
              className="events-heading-link"
              aria-current={!past ? 'page' : undefined}
            >
              Upcoming events
            </Link>
            <Link
              href="/events/past"
              className="events-heading-link"
              aria-current={past ? 'page' : undefined}
            >
              Past events
            </Link>
          </h1>
        </header>

        {events.length ? (
          <div className="grid">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <p className="events-empty-text">
            {past ? 'No past events' : 'No upcoming events'}
          </p>
        )}
      </section>
    </div>
  );
}
