import EventsView from '../../../components/EventsView';

export const revalidate = 60;
export const metadata = { title: 'Past events' };

export default function PastEventsPage() {
  return <EventsView past />;
}
