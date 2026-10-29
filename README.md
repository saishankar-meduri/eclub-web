# E-Club website V2 (V1 public site + recruitment)

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
## V2 setup (recruitment)
npm install  (adds firebase-admin + server-only)

## Setup
1. Copy `.env.example` → `.env.local`, fill it (same vars in Vercel).
2. Firebase console → Auth → enable Google; add your prod domain under Authorized domains.
3. Deploy rules + indexes: `firebase deploy --only firestore:rules,firestore:indexes`
4. Seed the first superadmin: `npm run seed:admin`
5. Sign in at /admin/superadmin → create domains → assign heads by email.
6. Heads sign in at /admin/recruitment → add questions, set WhatsApp link, open applications.

## Firestore structure
users/{lowercase email}            { email, role: "superadmin"|"domainHead", domainId }
domains/{slug}                     { name, slug, description, open }
domains/{slug}/private/settings    { whatsappLink }            <- not public
domains/{slug}/questions/{id}      { label, type: short|long|mcq|link, options[], required, order }
applications/{SRN}_{domainId}      { name, srn, email, phone, year, branch, domainId, answers{qId:string},
                                     status: applied|shortlisted|rejected, createdAt, shortlistedAt }

## Env vars
NEXT_PUBLIC_FIREBASE_API_KEY / _AUTH_DOMAIN / _PROJECT_ID / _APP_ID
FIREBASE_ADMIN_PROJECT_ID / _CLIENT_EMAIL / _PRIVATE_KEY (server only)
SUPERADMIN_EMAIL (seed script only)

## Test checklist
[ ] Seed script creates users/<your email> as superadmin; /admin/superadmin loads
[ ] Create 2 domains (A, B): both start closed and are NOT in the /join dropdown
[ ] Assign head1@ → A, head2@ → B
[ ] head1: add questions (one of each type), reorder, edit, delete one; set WhatsApp link; open A
[ ] /join: A appears, B hidden; pick A → step 2 shows A's questions in order
[ ] Submit with a required field empty / bad link / bad phone → blocked
[ ] Submit valid → confirmation; doc id is SRN_A in Firestore
[ ] Submit same SRN + A again → "already applied" error (works with different casing of SRN)
[ ] Same SRN + B (after opening B) → allowed
[ ] Switch domain on step 1 after reaching step 2 → questions reload, answers reset
[ ] Close A → vanishes from dropdown; direct submit to A fails
[ ] /status with right SRN + wrong email → "No application found"; right pair → status "applied", no WhatsApp link
[ ] head1 shortlists one (single) and two (bulk) → status + shortlistedAt update; sendShortlistEmail stub called (no-op)
[ ] /status for shortlisted applicant shows the WhatsApp link; rejected one shows no link
[ ] head1 sees only A's applicants; filter by status + search work; detail shows labelled answers
[ ] head1 CANNOT see B: Firestore query for domainId==B → permission-denied; POST /api/admin/applications/status with a B id → 403; /admin/superadmin → no access
[ ] head1 cannot change domain name or other domains' questions/WhatsApp link (rules emulator)
[ ] Signed-out / random Google account: /admin/* shows no access; reading /applications from console is denied
[ ] Superadmin: counts per domain correct, "Manage" opens that domain, CSV downloads (answers use question labels)
[ ] Rules unit test: unauthenticated create with status "shortlisted" is denied

## V3: events management
- /admin/events — superadmin or the head of the domain with slug `events` can add/edit/delete events.
- Create a domain named "Events" (slug becomes `events`) in /admin/superadmin and assign its head. Keep it closed if it is not recruiting.
- Images upload to Cloudinary (signed, role-checked server route) or can be pasted as https URLs. Set the three CLOUDINARY_* env vars locally and on Vercel.
- Superadmins can add/remove other superadmins in /admin/superadmin.
- Republish firestore.rules (events write rules changed).
