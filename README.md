# Plasma Care — Admin Panel

Bookings dashboard for staff: view, filter, and update bookings that come in
through the customer booking site. Uses the **same Supabase project** as
`plasma-care-customer` — no separate backend needed.

## One-time setup

1. Open your Supabase project → **SQL Editor** → run `supabase/admin_setup.sql`,
   then run `supabase/catalog_and_reports.sql`. Together these:
   - add `assigned_staff`, `call_status`, `is_spam`, `admin_notes`,
     `report_url`, `report_status` columns to `bookings`
   - let logged-in staff read/update bookings, and manage packages,
     individual tests, and time slots
   - create a `reports` storage bucket for uploaded report files
2. Supabase Dashboard → **Authentication → Users → Add user**. Create an
   email + password for each staff member who should have admin access.
   (No sign-up screen exists in this app on purpose — accounts are created
   by you, manually, so random people can't get in.)

## Run locally

```bash
npm install
npm run dev
```

`.env` is already filled in with the same Supabase URL/anon key as the
customer app.

## Build for hosting

```bash
npm run build
```

Creates `dist/` — deploy to GitHub Pages, Vercel, Netlify, etc., same as the
customer app. If you deploy to GitHub Pages, update the `base` in
`vite.config.js` to match your repo name (e.g. `/plasma-care-admin/`)
before building.

### Auto-deploy to GitHub Pages (already set up)

`.github/workflows/deploy.yml` builds and deploys on every push to `main`.
One-time setup in your GitHub repo:

1. Push this project to a new repo (e.g. `plasma-care-admin`).
2. Repo → **Settings → Pages → Source → GitHub Actions**.
3. Repo → **Settings → Secrets and variables → Actions → New repository
   secret** — add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same
   values as your local `.env`).
4. Push to `main` — the Action builds and publishes automatically. Check
   progress under the repo's **Actions** tab.

## What it does

- **Login** — email/password (Supabase Auth).
- **Bookings tab** — today's bookings by default, filter by date/status,
  search by name or phone, quick stats (total, pending, confirmed,
  revenue). Tap a row for full detail:
  - Change status, assign a staff member, one-tap "Call customer"
  - Call status tracker (not called / called / didn't answer / callback later)
  - Upload a report file (PDF/image) or mark "Skip" if not applicable
  - Internal admin notes (never shown to the customer)
  - Spam flag — bookings with a repeated phone number, an obviously fake
    name, or an invalid phone format get an automatic ⚠ warning; you can
    manually mark/unmark any booking as spam to hide it from the list and
    stats
  - "Export CSV" downloads the currently filtered list
- **Catalog tab** — add, edit, or delete Packages and Individual Tests
  (name, price, category, active toggle) — changes apply immediately to
  what customers see on the booking site.
- **Slots tab** — add a single time slot, or bulk-generate a whole day's
  worth (e.g. 08:00–18:00 every 60 min) with a preview before confirming.
  Edit capacity or deactivate/delete any slot.

## Not included yet (next steps)

- Staff panel (separate, simpler app for the person actually doing home
  visits — just their assigned jobs for the day).
- Push/SMS notification to staff on new assignment.
