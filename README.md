# E-Club website V1

Public, read-only site. Next.js 15 (App Router) + Firebase Firestore.

## Setup
1. Firebase console: create a project, add a Web app, enable Firestore (production mode).
2. Firestore > Rules: paste `firestore.rules` and publish.
3. `cp .env.example .env.local` and fill in the web app config values.
4. Sample data (optional): publish `firestore.seed.rules` in the Rules tab, run `npm run seed`,
   then publish `firestore.rules` again right away. Or add the documents by hand in the console.
5. `npm install && npm run dev`
6. Deploy: import the repo in Vercel and add the same four env vars.

## Data
- Collections: `events` (doc id = slug) and `announcements`.
- Event fields: title, slug, description, schedule, rules, date (timestamp), venue, fee,
  team_size, banner_url, registration_url, status, published.
- Announcement fields: title, body, created_at (timestamp), published.
- A doc only shows when `published` is true. `status` is `upcoming`, `live` or `past`.
- `schedule` and `rules` take one item per line.
- Pages refresh every 60 seconds. Core team: `lib/team.js`. Socials: `lib/site.js`.
