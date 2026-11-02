const TZ = 'Asia/Kolkata';

export function formatDate(iso) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ,
  }).format(new Date(iso));
}

export function formatTime(iso) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ,
  }).format(new Date(iso)).toLowerCase();
}

export function formatShortDate(iso) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ,
  }).format(new Date(iso));
}

// Events store team_size_min / team_size_max. Older docs only have a single team_size.
export function teamRange(event) {
  const min = Number(event?.team_size_min ?? event?.team_size ?? 1) || 1;
  const max = Number(event?.team_size_max ?? event?.team_size ?? min) || min;
  return { min, max: Math.max(min, max) };
}

export function formatFee(fee, event) {
  if (!fee) return 'Free';
  return teamRange(event).max > 1 ? `₹${fee} per team` : `₹${fee}`;
}

export function formatTeam(event) {
  const { min, max } = teamRange(event);
  if (max <= 1) return 'Individual';
  return min === max ? `${max} members per team` : `${min}–${max} members per team`;
}

export function lines(text) {
  return (text || '').split('\n').map((s) => s.trim()).filter(Boolean);
}
