import Link from 'next/link';
import { notFound } from 'next/navigation';
import StatusBadge from '../../../components/StatusBadge';
import { getEventBySlug } from '../../../lib/data';
import { formatDate, formatTime, formatFee, formatTeam, lines } from '../../../lib/format';

export const revalidate = 60;

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

  return (
    <div className="container section">
      <Link href="/events" className="text-link">Back to events</Link>

      <div className="detail-head">
        <StatusBadge status={event.status} />
        <h1>{event.title}</h1>
      </div>

      {event.banner_url && (
        <div className="banner banner-large">
          <img className="cover" src={event.banner_url} alt="" />
        </div>
      )}

      <div className="detail">
        <div className="prose">
          {event.description && (
            <>
              <h2>About</h2>
              <p className="body-text">{event.description}</p>
            </>
          )}
          {schedule.length > 0 && (
            <>
              <h2>Schedule</h2>
              <ul className="list">{schedule.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </>
          )}
          {rules.length > 0 && (
            <>
              <h2>Rules</h2>
              <ul className="list">{rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </>
          )}
        </div>

        <aside className="summary">
          <dl>
            <div><dt>Date</dt><dd>{formatDate(event.date)}</dd></div>
            <div><dt>Time</dt><dd>{formatTime(event.date)}</dd></div>
            {event.venue && <div><dt>Venue</dt><dd>{event.venue}</dd></div>}
            <div><dt>Fee</dt><dd>{formatFee(event.fee, event.team_size)}</dd></div>
            <div><dt>Team size</dt><dd>{formatTeam(event.team_size)}</dd></div>
          </dl>
          {event.status === 'past' ? (
            <span className="btn btn-disabled">Event ended</span>
          ) : event.registration_url ? (
            <a
              href={event.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-solid"
            >
              Register
            </a>
          ) : (
            <span className="btn btn-disabled">Registration opens soon</span>
          )}
        </aside>
      </div>
    </div>
  );
}
