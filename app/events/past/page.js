import { redirect } from 'next/navigation';

// Past events now live in the single scroll on /events; keep old links working.
export default function PastEventsPage() {
  redirect('/events');
}
