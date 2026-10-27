import { getAnnouncements } from '../../lib/data';
import { formatShortDate } from '../../lib/format';

export const revalidate = 60;
export const metadata = { title: 'Announcements' };

export default async function AnnouncementsPage() {
  const announcements = await getAnnouncements();

  return (
    <div className="container section">
      <h1>Announcements</h1>
      <div className="post-list">
        {announcements.length ? (
          announcements.map((a) => (
            <article key={a.id} className="post">
              <time dateTime={a.created_at}>{formatShortDate(a.created_at)}</time>
              <h2>{a.title}</h2>
              <p className="body-text">{a.body}</p>
            </article>
          ))
        ) : (
          <p className="muted">No announcements yet.</p>
        )}
      </div>
    </div>
  );
}
