import EventCard from './EventCard';
import EventMarquee from './EventMarquee';
import { getEvents } from '../lib/data';

// One horizontal scroll of every event: live/upcoming first (soonest first), then past
// (most recent first). The badge on each card (Upcoming / Live / Past) tells the status.
export default async function EventsView() {
  const all = await getEvents({ statuses: ['live', 'upcoming', 'past'] });
  const events = [
    ...all.filter((e) => e.status !== 'past'),
    ...all.filter((e) => e.status === 'past').reverse(),
  ];

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
          <h1 className="events-dual-heading">Events</h1>
        </header>

        {events.length ? (
          <div className="events-scroll" role="list" tabIndex={0} aria-label="All events, upcoming first">
            {events.map((e) => (
              <div key={e.id} role="listitem" className="events-scroll-item">
                <EventCard event={e} />
              </div>
            ))}
          </div>
        ) : (
          <p className="events-empty-text">No events yet</p>
        )}
      </section>
    </div>
  );
}
