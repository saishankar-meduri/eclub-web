const LABELS = { upcoming: 'Upcoming', live: 'Live', past: 'Past' };

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{LABELS[status] || status}</span>;
}
