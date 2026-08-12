# Plasma Care — Admin Panel

Bookings dashboard for staff: view, filter, and update bookings that come in
through the customer booking site. Uses the **same Supabase project** as
`plasma-care-customer` — no separate backend needed.

## One-time setup

1. Open your Supabase project → **SQL Editor** → run `supabase/admin_setup.sql`,
   then `supabase/catalog_and_reports.sql`, then `supabase/fix_public_access.sql`,
   then `supabase/patient_details.sql`, then `supabase/enable_realtime.sql`,
   then `supabase/prescription_and_no_slots.sql`. Together these:
   - add `assigned_staff`, `call_status`, `is_spam`, `admin_notes`,
     `report_url`, `report_status` columns to `bookings`
   - let logged-in staff read/update bookings, and manage packages and
     individual tests
   - create a `reports` storage bucket for uploaded report files
   - `fix_public_access.sql` restores the public (anon key) access the
     customer app needs — RLS being on for admin access otherwise blocks
     the customer site entirely
   - `patient_details.sql` adds patient name/age/gender/blood group
     fields, filled in by the customer right after OTP verification
   - `enable_realtime.sql` turns on live database events for `bookings`,
     which powers the new-booking notification
   - `prescription_and_no_slots.sql` adds the prescription photo upload
     fields + storage bucket, and makes `slot_id` nullable now that
     booking is date-only (no more time slots)
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
  - For home collection: address **and a map with the customer's dropped
    pin**, with a link to open it in Google Maps
  - Upload a report file (PDF/image) or mark "Skip" if not applicable
  - Prescription review — if the customer uploaded a photo of their
    prescription instead of picking tests, it shows here with a notes
    field to jot down what it says
  - Internal admin notes (never shown to the customer)
  - Spam flag — bookings with a repeated phone number, an obviously fake
    name, or an invalid phone format get an automatic ⚠ warning; you can
    manually mark/unmark any booking as spam to hide it from the list and
    stats
  - "Export CSV" downloads the currently filtered list
- **Catalog tab** — add, edit, or delete Packages and Individual Tests
  (name, price, category, active toggle) — changes apply immediately to
  what customers see on the booking site.
- **Live new-booking alerts** — a browser notification pops up the moment
  a new booking comes in, as long as this tab is open (see limitations
  below). A banner at the top lets you turn notifications on, and tells
  you how to re-enable them if you accidentally blocked the site.
  **Requires `supabase/enable_realtime.sql` to be run** — without it,
  alerts still arrive but only via the 30-second backup poll, not instantly.

## Notification limitations (read this)

This uses the browser's built-in Notification API over a live database
subscription — it is **not** a true push notification service. That means:
- It only fires while the admin panel tab is open somewhere (can be in
  the background, another tab, or another app on the phone — just not
  fully closed).
- If the browser or phone is closed, you won't get an alert.
- If you deny the permission prompt, browsers block re-prompting — you'll
  need to manually allow it in the site's settings in your browser (the
  banner explains this when it detects you're blocked).

Getting alerts even when the site is fully closed needs a real push
setup (a backend, a service worker, and push subscriptions) — that's a
bigger addition than this. Worth doing later if this isn't enough.

## Not included yet (next steps)

- Staff panel (separate, simpler app for the person actually doing home
  visits — just their assigned jobs for the day).
- True push notifications that work even when the site/browser is closed.
