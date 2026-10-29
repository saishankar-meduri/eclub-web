import Link from 'next/link';
import EventCard from './EventCard';
import EventMarquee from './EventMarquee';
import { getEvents } from '../lib/data';

export default async function EventsView({ past = false }) {
  const events = past
    ? await getEvents({ statuses: ['past'], ascending: false })
    : await getEvents({ statuses: ['live', 'upcoming'] });

  return (
    <>
      <EventMarquee events={events} />
      <div className="container section">
        <h1>Events</h1>
        <div className="tabs" role="navigation" aria-label="Event filter">
          <Link href="/events" className="tab" aria-current={!past ? 'page' : undefined}>Upcoming</Link>
          <Link href="/events/past" className="tab" aria-current={past ? 'page' : undefined}>Past</Link>
        </div>
        {events.length ? (
          <div className="grid">
            {events.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        ) : (
          <p className="muted">
            {past ? 'No past events to show yet.' : 'No upcoming events right now. Check back soon.'}
          </p>
        )}
      </div>
    </>
  );
}
