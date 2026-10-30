import { collection, getDocs, limit as qLimit, query, where } from 'firebase/firestore';
import { db } from './firebase';

const isConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'missing-key' &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== 'demo-eclub'
);

const iso = (v) => (v && typeof v.toDate === 'function' ? v.toDate().toISOString() : v ?? null);

function mapDoc(d) {
  const data = d.data();
  return { ...data, id: d.id, date: iso(data.date), created_at: iso(data.created_at) };
}

// Rules only allow reading published docs, so every query filters on published == true.
// Filtering and sorting happen in code, which avoids needing composite indexes.
async function publishedDocs(name) {
  if (!isConfigured) return [];
  const snap = await getDocs(query(collection(db, name), where('published', '==', true)));
  return snap.docs.map(mapDoc);
}

export async function getEvents({ statuses, ascending = true, limit } = {}) {
  try {
    let list = await publishedDocs('events');
    if (statuses) list = list.filter((e) => statuses.includes(e.status));
    list.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!ascending) list.reverse();
    return limit ? list.slice(0, limit) : list;
  } catch (e) {
    console.error('getEvents failed:', e.message);
    return [];
  }
}

export async function getEventBySlug(slug) {
  try {
    if (!isConfigured) return null;
    const snap = await getDocs(
      query(
        collection(db, 'events'),
        where('published', '==', true),
        where('slug', '==', slug),
        qLimit(1)
      )
    );
    return snap.empty ? null : mapDoc(snap.docs[0]);
  } catch (e) {
    console.error('getEventBySlug failed:', e.message);
    return null;
  }
}

export async function getAnnouncements({ limit } = {}) {
  try {
    const list = await publishedDocs('announcements');
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return limit ? list.slice(0, limit) : list;
  } catch (e) {
    console.error('getAnnouncements failed:', e.message);
    return [];
  }
}
