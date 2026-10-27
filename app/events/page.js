import EventsView from '../../components/EventsView';

export const revalidate = 60;
export const metadata = { title: 'Events' };

export default function EventsPage() {
  return <EventsView />;
}
