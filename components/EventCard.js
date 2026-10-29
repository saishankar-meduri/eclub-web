import Link from 'next/link';
import StatusBadge from './StatusBadge';
import { formatDate, formatTime, formatFee } from '../lib/format';
import { optimize } from '../lib/images';

export default function EventCard({ event }) {
  return (
    <Link href={`/events/${event.slug}`} className="card">
      <div className="banner">
        {event.banner_url ? (
          <img className="cover" src={optimize(event.banner_url, 700)} alt="" loading="lazy" />
        ) : (
          <img className="fallback" src="/logo.jpg" alt="" />
        )}
      </div>
      <div className="card-body">
        <StatusBadge status={event.status} />
        <h3>{event.title}</h3>
        <p className="muted">{formatDate(event.date)}, {formatTime(event.date)}</p>
        {event.venue && <p className="muted">{event.venue}</p>}
        <p className="muted">{formatFee(event.fee, event.team_size)}</p>
      </div>
    </Link>
  );
}
