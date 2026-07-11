# The Colony Register

A digitized worker log book for a residential colony of 34 villas
(villa-073 through villa-106). Each villa signs in with its own account,
raises plumbing / electrical / pest / carpentry / general issues from a
phone, watches a live "time open" clock, and sees a shared community log —
no more messaging a caretaker and wondering if anyone saw it. A dashboard
shows tickets raised by month and average fix time by issue type.

Built mobile-first with React + Vite, backed by Supabase (Postgres, Auth,
and Realtime), deployable for free on Vercel or Netlify.

## Features

- **Login per villa.** Every villa (073–106) has its own account. Default
  username and password are both the villa id, e.g. `villa-106` / `villa-106`.
- **Forced password change on first login**, before anything else.
- **Forced resident setup on first login**: after changing the password,
  the villa adds household member names and WhatsApp numbers once. These
  are stored in a `residents` table and auto-fill the reporter field on
  every future ticket.
- One-tap intake form: issue type, urgency, description, villa, reporter
- Live elapsed-time clock on every open ticket
- Resolve flow with optional resolution notes, worker/vendor name, and an
  optional staff PIN gate
- Dashboard: totals, average fix time, tickets-by-month chart,
  average-fix-time-by-category chart
- Realtime sync — everyone's app updates live as tickets are raised/resolved
- Manual "Notify on WhatsApp" tap-to-send link on resolved tickets (no
  backend required), plus an optional automated path via the WhatsApp Cloud
  API (see below)

## Tech stack

- **Frontend:** React 18 + Vite, [recharts](https://recharts.org) for
  charts, [lucide-react](https://lucide.dev) for icons
- **Backend:** [Supabase](https://supabase.com) (Postgres, Auth, Row Level
  Security, Realtime, Edge Functions) — free tier
- **Hosting:** [Vercel](https://vercel.com) or [Netlify](https://netlify.com)
  free tier

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste in the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates
   `profiles`, `residents`, and `issues`, plus Row Level Security policies
   and realtime.
3. Go to **Authentication > Providers > Email** and **turn off "Allow new
   users to sign up"**. Accounts for this app are only ever created by the
   seed script below — residents should never be able to self-register.
4. Go to **Settings > API** and copy your **Project URL**, **anon public
   key**, and **service role key** (the service role key is only used by
   the seed script below — never put it in `.env` or ship it to the
   browser).

## 2. Create the 34 villa accounts

Run this once, from your own machine, after the schema is in place:

```bash
npm install
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
npm run seed
```

This creates a Supabase Auth account for villa-073 through villa-106, each
with username = password = its own villa id (e.g. `villa-106` / `villa-106`),
and a matching row in `profiles` with `must_change_password = true`. It's
safe to re-run — it skips villas that already have an account.

> Only 34 villas, not 35: the range 073–106 inclusive is exactly 34. If
> your actual numbering is different, edit the `FIRST`/`LAST` constants in
> both `scripts/seed-users.mjs` and `src/lib/villas.js`.

## 3. First login, per villa

1. Go to the app, enter the villa number (e.g. `106`) and the default
   password (`villa-106`).
2. **Change password** — required before doing anything else.
3. **Add residents** — required once: enter the name (and, ideally,
   WhatsApp number) of everyone in the household. This list is what
   auto-fills the reporter field when raising a ticket later, and can't be
   skipped on first login, but more residents can be added later by asking
   whoever manages the register to insert rows directly (there's no separate
   "add resident" screen after onboarding in this version — see the
   Possible extensions section below if you want one).
4. After that, the villa lands on the normal app.

## 4. Run it locally

```bash
cp .env.example .env
# edit .env with your Supabase URL and anon key (NOT the service role key)
npm run dev
```

Open the local URL it prints, ideally on your phone (same Wi-Fi, use the
"Network" URL Vite prints) since this is designed mobile-first.

## 5. Deploy for free

**Vercel**

```bash
npm install -g vercel
vercel
```

Or connect the GitHub repo at [vercel.com/new](https://vercel.com/new) —
it auto-detects Vite. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
(optionally) `VITE_STAFF_PIN` under Project Settings > Environment
Variables, then redeploy. Never add the service role key here — it's only
used locally, once, by the seed script.

**Netlify** works the same way: connect the repo, build command
`npm run build`, publish directory `dist`, same env vars.

## 6. WhatsApp notifications (three options, cheapest first)

**Option A — manual tap-to-send (already built in, free, zero setup).**
Every resolved ticket shows a "Notify on WhatsApp" link that opens a
pre-filled `wa.me` message to the resident.

**Option B — CallMeBot (free, hobby-grade).** A well-known free API for
sending WhatsApp messages from a personal number. Fine for very low volume;
it's an unofficial personal-use tool, not built for guaranteed delivery or
scale.

**Option C — Meta WhatsApp Cloud API (official, automatic).** Code is in
[`supabase/functions/notify-whatsapp`](supabase/functions/notify-whatsapp).
API access itself is free; Utility messages like "your issue is resolved"
are billed per message at low, country-specific rates. To wire it up:

1. Create a Meta Business Account and WhatsApp Business Account, connect a
   phone number to the Cloud API.
2. Submit a Utility template for approval, e.g.:
   `Hi {{1}}, your {{2}} issue (ticket {{3}}) has been resolved. Thanks for your patience.`
3. Deploy the function and set secrets:
   ```bash
   supabase functions deploy notify-whatsapp
   supabase secrets set META_WHATSAPP_TOKEN=xxxxx
   supabase secrets set META_PHONE_NUMBER_ID=xxxxx
   supabase secrets set META_TEMPLATE_NAME=issue_resolved
   supabase secrets set META_TEMPLATE_LANG=en
   ```
4. In the Supabase dashboard: **Database > Webhooks > Create a new webhook**
   — table `issues`, event `Update`, type `HTTP Request`, target the
   deployed function's URL (optionally filter to fire only when `status`
   changes to `resolved`).

## Security notes

- There's no self-signup — accounts only come from the seed script, which
  is the point: only real villas can log in.
- Every signed-in villa can read and write every ticket (a shared community
  log, matching the original WhatsApp-group workflow). Resolving a ticket
  can additionally be gated behind a shared `VITE_STAFF_PIN` — a soft
  deterrent, not real access control.
- `residents` rows are only readable/writable by the villa they belong to
  (enforced by Row Level Security), so one villa can't see another's
  resident list or phone numbers.
- The service role key used by the seed script must never be committed,
  put in `.env`, or shipped to the frontend — it bypasses Row Level
  Security entirely.

## Free-tier limits worth knowing

| Service | Free tier |
|---|---|
| Supabase | 500 MB database, 1 GB file storage, 5 GB egress, 50,000 monthly active users, up to 2 active projects. Projects pause after 7 days with no API requests — a free uptime pinger (e.g. UptimeRobot) keeps it awake if usage is bursty. |
| Vercel / Netlify | Static hosting, free subdomain, generous bandwidth for a site this size. |
| Meta WhatsApp Cloud API | API access is free; user-initiated Service conversations are free and unlimited; Utility template messages (used here) are billed per message at low, country-specific rates. |

## Testing checklist

- Log in as `villa-106` / `villa-106` — confirm you're forced to change the
  password before seeing anything else.
- Confirm you're then forced to add at least one resident before reaching
  the main app.
- Log out and back in with the new password — confirm you land straight on
  the main app (no gates re-triggering).
- Raise a ticket — confirm the villa and reporter fields are pre-filled
  correctly, and both are editable (villa for common-area issues, reporter
  for guests).
- Resolve a ticket (enter the staff PIN if set) and confirm it moves to
  Resolved with your notes attached.
- Check the Dashboard: totals, average fix time, and both charts update.
- Log in as a different villa in a second browser/device and confirm you
  see the same shared ticket list update live (realtime sync), but each
  villa's own resident list stays private to them.

## Possible extensions

- A settings screen for adding/removing residents after first login
  (currently only possible via the Supabase dashboard).
- A dedicated "admin" role (e.g. facility manager) instead of the shared
  staff PIN, using Supabase Auth roles/claims.
- Push notifications instead of/alongside WhatsApp.

## License

MIT — use, modify, and adapt freely for your own colony, building, or
community.
