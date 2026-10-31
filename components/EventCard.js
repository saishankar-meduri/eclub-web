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
          <img className="fallback logo-mark" src="/logo.jpg" alt="" />
        )}
      </div>
      <div className="card-body">
        <div className="card-top">
          <StatusBadge status={event.status} />
          <span className="card-date">
            {formatDate(event.date)} · {formatTime(event.date)}
          </span>
        </div>
        <h3 className="card-title">{event.title}</h3>
        {event.venue && <p className="card-venue">{event.venue}</p>}
        <div className="card-footer">
          <span className="card-fee">{formatFee(event.fee, event.team_size)}</span>
          <span className="card-cta" aria-hidden="true">
            Details <span className="btn-arrow">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
