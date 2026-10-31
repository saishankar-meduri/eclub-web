const LABELS = { upcoming: 'Upcoming', live: 'Live now', past: 'Archive' };

export default function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      {status === 'live' && <span className="badge-dot" aria-hidden="true" />}
      {LABELS[status] || status}
    </span>
  );
}
