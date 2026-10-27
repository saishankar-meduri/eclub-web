// Sample data. Run once: npm run seed
// Uses your web config from .env.local. Needs rules that allow writes TEMPORARILY (see README).
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(app);

const events = [
  {
    title: 'Venture Wars',
    slug: 'venture-wars',
    description: 'An auction-themed event for teams of two. Bid, build and outsmart the other teams.',
    schedule: '8:30 am: Check-in\n9:00 am: Rules briefing\n9:15 am: Auction rounds\n11:15 am: Final lot and results',
    rules: "Teams of 2 members\nRegistration fee is paid per team\nOrganizers' decisions are final",
    date: '2026-11-14T08:30:00+05:30',
    venue: 'CIE, 4th floor',
    fee: 250,
    team_size: 2,
    banner_url: null,
    registration_url: 'https://forms.gle/REPLACE_ME',
    status: 'upcoming',
    published: true,
  },
  {
    title: 'Pitch Night',
    slug: 'pitch-night',
    description: 'Pitch a startup idea in three minutes and get feedback from founders and seniors.',
    schedule: '5:00 pm: Doors open\n5:30 pm: Pitches\n7:00 pm: Feedback and networking',
    rules: 'One idea per participant\nPitches are capped at 3 minutes\nSlides are optional',
    date: '2026-12-05T17:00:00+05:30',
    venue: 'Seminar hall, EC Campus',
    fee: 0,
    team_size: 1,
    banner_url: null,
    registration_url: 'https://forms.gle/REPLACE_ME',
    status: 'upcoming',
    published: true,
  },
  {
    title: 'Founders Fireside',
    slug: 'founders-fireside',
    description: 'An open conversation with a founder about the first year of building a company.',
    schedule: '4:00 pm: Talk\n5:00 pm: Audience Q&A',
    rules: null,
    date: '2026-09-12T16:00:00+05:30',
    venue: 'Auditorium, EC Campus',
    fee: 0,
    team_size: 1,
    banner_url: null,
    registration_url: null,
    status: 'past',
    published: true,
  },
];

const announcements = [
  {
    id: 'venture-wars-open',
    title: 'Venture Wars registrations are open',
    body: 'Teams of two can now register for Venture Wars. Slots are limited, so register early from the event page.',
    created_at: '2026-10-25T18:00:00+05:30',
    published: true,
  },
  {
    id: 'core-applications-2027',
    title: 'Core applications for 2027',
    body: 'Applications for the 2027 core team are open. Watch this page for the form and the interview schedule.',
    created_at: '2026-10-20T12:00:00+05:30',
    published: true,
  },
];

for (const e of events) {
  await setDoc(doc(db, 'events', e.slug), { ...e, date: Timestamp.fromDate(new Date(e.date)) });
}
for (const { id, ...a } of announcements) {
  await setDoc(doc(db, 'announcements', id), { ...a, created_at: Timestamp.fromDate(new Date(a.created_at)) });
}
console.log(`Seeded ${events.length} events and ${announcements.length} announcements.`);
process.exit(0);
