# Handoff: The Colony Register

This document is for whoever (human or agent) picks this project up next.
It covers what exists, what infrastructure it depends on, what secrets need
to be set up, and what has and hasn't been verified.

## 1. What this project is

A mobile-first maintenance-ticket app for a residential colony of 34 villas
(villa-073 through villa-106). Each villa has its own login. Residents raise
plumbing/electrical/pest/carpentry/general issues, watch a live "time open"
clock, and see a shared community log. A dashboard shows tickets by month
and average fix time by category. WhatsApp notification is tap-to-send by
default, with an optional automated path via Meta's WhatsApp Cloud API.

**Full feature and setup documentation lives in [`README.md`](README.md) —
read that first for user-facing setup steps. This document is the
higher-level "what's built, what's wired to what, what's left" summary.**

## 2. Current status: code-complete, infra NOT yet provisioned

Important: **no Supabase project, Vercel deployment, or GitHub repo has
actually been created for this yet.** Everything below is source code sitting
in a local project folder. It has been checked for:
- Balanced brackets/syntax by static inspection (the build sandbox that
  produced this code has no network access, so `npm install`, `vite build`,
  and any real Supabase connection have **not** been run or tested).
- Logical consistency of imports/exports across files (verified by grep).

It has **not** been:
- Installed (`npm install` never run)
- Built (`vite build` never run)
- Run against a live Supabase project
- Tested end-to-end (login → change password → add residents → raise/resolve
  a ticket → dashboard) against real infrastructure
- Deployed anywhere

**First priority for whoever takes this over: actually provision the infra
below and run through the testing checklist in README.md.** Treat this as
a strong first draft that needs a real integration pass, not a finished,
verified product.

## 3. Infrastructure this code assumes

| Piece | Service | Status |
|---|---|---|
| Frontend hosting | Vercel or Netlify (free tier) | Not deployed |
| Database + Auth + Realtime | Supabase (free tier) | Not created |
| Edge function (optional, WhatsApp automation) | Supabase Edge Functions | Not deployed |
| Keep-alive ping | GitHub Actions (this repo) | Workflow written, not yet running (needs the repo to exist and secrets to be set) |
| WhatsApp (manual) | wa.me links | No setup needed, works as soon as the app is deployed |
| WhatsApp (automated, optional) | Meta WhatsApp Cloud API | Not set up — this is the most involved optional piece, skip it initially |

## 4. Every secret / credential this project needs, and where it's used

| Name | Where it's used | Where it comes from | Sensitivity |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Frontend `.env`, Vercel/Netlify env vars | Supabase project Settings > API | Safe to expose client-side |
| `VITE_SUPABASE_ANON_KEY` | Frontend `.env`, Vercel/Netlify env vars | Supabase project Settings > API | Safe to expose client-side (RLS protects data) |
| `VITE_STAFF_PIN` | Frontend `.env`, Vercel/Netlify env vars | Anyone sets this, it's just a shared string | Soft deterrent only, not real security — treat as low-sensitivity but don't advertise it |
| `SUPABASE_SERVICE_ROLE_KEY` | **Only** `scripts/seed-users.mjs`, run locally, once | Supabase project Settings > API | **High sensitivity — bypasses all RLS. Never commit it, never put it in `.env`, never put it in Vercel/Netlify, never put it in GitHub Actions.** |
| `SUPABASE_URL` (bare, no `VITE_` prefix) | `scripts/seed-users.mjs` (as an env var when running the script) AND the GitHub Actions keep-alive workflow (as a repo secret) | Same as above | Same value as `VITE_SUPABASE_URL`, just under a different variable name for the two different consumers |
| `SUPABASE_ANON_KEY` (bare, GitHub Actions secret) | `.github/workflows/keep-alive.yml` | Same as `VITE_SUPABASE_ANON_KEY` | Safe-ish, but keep as a secret anyway for hygiene |
| `META_WHATSAPP_TOKEN`, `META_PHONE_NUMBER_ID`, `META_TEMPLATE_NAME`, `META_TEMPLATE_LANG` | Supabase Edge Function `notify-whatsapp` only (set via `supabase secrets set`) | Meta Business Manager / WhatsApp Cloud API setup | High sensitivity, only needed if pursuing Option C for WhatsApp — skip until the rest is working |

**Where these do NOT go:** the service role key and Meta tokens must never
appear in `.env`, in any file committed to the repo, or in Vercel/Netlify
environment variables. `.gitignore` already excludes `.env`, but double
check before any commit that nothing sensitive got hardcoded during
development.

## 5. Setup order (see README.md for full detail)

1. Create the Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Turn off public sign-ups in Supabase Auth settings.
4. Run `scripts/seed-users.mjs` locally with `SUPABASE_URL` +
   `SUPABASE_SERVICE_ROLE_KEY` env vars to create the 34 villa accounts.
5. Copy `.env.example` to `.env`, fill in `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY`, run `npm install && npm run dev` and actually
   click through the app for the first time.
6. Push to GitHub, deploy to Vercel/Netlify with the same two `VITE_*` env
   vars (plus `VITE_STAFF_PIN` if wanted).
7. Set the two GitHub Actions repo secrets (`SUPABASE_URL`,
   `SUPABASE_ANON_KEY`) so `.github/workflows/keep-alive.yml` can run.
8. Only after all of the above works: consider the WhatsApp Cloud API path
   (Option C in the README) if manual tap-to-send isn't enough.

## 6. Data model

- **`profiles`** — one row per villa (`villa-073` .. `villa-106`), 1:1 with
  a Supabase Auth user created by the seed script. Has
  `must_change_password` (drives the forced-password-change gate).
- **`residents`** — household members per villa (name, phone), added on
  first login after the password change. Drives the reporter-name dropdown
  on the ticket form. RLS restricts each villa to only its own residents.
- **`issues`** — the ticket log itself: category, urgency, description,
  `location` (a villa id or `common-area`), `reported_by_villa` (who was
  logged in when it was raised), reporter name/phone, status, timestamps,
  resolution notes. Any signed-in villa can read/insert/update — this is a
  shared community log by design, matching the original WhatsApp-group
  workflow it's replacing.

Full column definitions and RLS policies are in `supabase/schema.sql`,
which is the source of truth — read it directly rather than relying on this
summary if precision matters.

## 7. Frontend architecture

- `src/App.jsx` — auth orchestrator. Watches Supabase session state and
  routes between `Login` → `ChangePasswordGate` → `AddResidentsGate` →
  `MainApp` based on session + profile + residents state.
- `src/components/MainApp.jsx` — the actual app (new issue / tickets /
  dashboard tabs), only rendered once a villa is fully onboarded.
- `src/components/NewIssueForm.jsx`, `TicketsTab.jsx`, `ResolveModal.jsx`,
  `Dashboard.jsx`, `Shared.jsx` — UI pieces, split out for readability.
- `src/lib/villas.js` — the 34-villa list (073–106). If the real villa
  range ever changes, this is one of two places to update (the other is
  `scripts/seed-users.mjs` — they must stay in sync).
- `src/lib/auth.js` — maps villa ids to the synthetic emails Supabase Auth
  needs under the hood (`villa-106@colonyregister.app`) since residents log
  in with just a villa number, not an email.
- `src/lib/format.js` — shared formatting helpers and category/urgency
  constants.
- `src/lib/supabaseClient.js` — the Supabase client, reads `VITE_*` env vars.

Design system: CSS custom properties in `src/index.css` (`--paper`, `--ink`,
`--brass`, `--rust`, `--amber`, `--slate`, `--moss`, plus font variables for
Space Grotesk / IBM Plex Sans / IBM Plex Mono). Reuse these tokens rather
than introducing new colors/fonts if extending the UI.

## 8. Known gaps / things flagged but not built

- **No in-app way to add residents after first login.** If a household
  changes, someone has to insert a row into `residents` directly via the
  Supabase dashboard. A settings screen for this would be a natural next
  feature.
- **No admin/facility-manager role.** Resolving a ticket is gated by a
  single shared `VITE_STAFF_PIN` (optional, weak deterrent), not real
  per-user permissions. If real access control matters, add role claims via
  Supabase Auth and update the RLS policies in `supabase/schema.sql`
  accordingly.
- **WhatsApp Cloud API (Option C) is unverified.** The Edge Function code
  in `supabase/functions/notify-whatsapp` has never been deployed or
  called against a real Meta Business account. Treat it as a well-commented
  starting point, not a tested integration.
- **No automated tests, no CI for build/lint.** Consider adding a basic
  GitHub Actions workflow that runs `npm run build` on push, separate from
  the keep-alive workflow, to catch regressions.
- **Villa count was corrected mid-project**: it's confirmed 34 villas,
  `villa-073` through `villa-106`. Both `src/lib/villas.js` and
  `scripts/seed-users.mjs` hardcode `FIRST = 73` / `LAST = 106` — if this is
  ever wrong, fix both files together.

## 9. Suggested next steps, in order

1. Provision the real Supabase project and run through setup steps 1–5
   above yourself — don't assume the code works until you've clicked
   through the login → password change → add residents → raise/resolve
   ticket → dashboard flow for real.
2. Fix whatever breaks (this is the first real integration test the auth
   flow has had).
3. Deploy to Vercel/Netlify and repeat the test on an actual phone.
4. Wire up the GitHub Actions keep-alive secrets and confirm it runs
   (`workflow_dispatch` it manually from the Actions tab rather than
   waiting a week).
5. Only then consider the WhatsApp Cloud API path or a residents-management
   screen, if the colony actually wants them.
