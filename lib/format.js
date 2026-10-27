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

export function formatFee(fee, teamSize) {
  if (!fee) return 'Free';
  return teamSize > 1 ? `₹${fee} per team` : `₹${fee}`;
}

export function formatTeam(size) {
  return size > 1 ? `${size} members per team` : 'Individual';
}

export function lines(text) {
  return (text || '').split('\n').map((s) => s.trim()).filter(Boolean);
}
