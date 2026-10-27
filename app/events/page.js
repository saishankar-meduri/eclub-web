import Link from 'next/link';
import EventCard from '../../components/EventCard';
import { getEvents } from '../../lib/data';

export const revalidate = 60;
export const metadata = { title: 'Events' };

export default async function EventsPage({ searchParams }) {
  const { tab } = await searchParams;
  const isPast = tab === 'past';

  const events = isPast
    ? await getEvents({ statuses: ['past'], ascending: false })
    : await getEvents({ statuses: ['live', 'upcoming'] });

  return (
    <div className="container section">
      <h1>Events</h1>
      <div className="tabs" role="navigation" aria-label="Event filter">
        <Link href="/events" className="tab" aria-current={!isPast ? 'page' : undefined}>Upcoming</Link>
        <Link href="/events?tab=past" className="tab" aria-current={isPast ? 'page' : undefined}>Past</Link>
      </div>
      {events.length ? (
        <div className="grid">
          {events.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      ) : (
        <p className="muted">
          {isPast ? 'No past events to show yet.' : 'No upcoming events right now. Check back soon.'}
        </p>
      )}
    </div>
  );
}
