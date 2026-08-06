# Plasma Care — Admin Panel

Bookings dashboard for staff: view, filter, and update bookings that come in
through the customer booking site. Uses the **same Supabase project** as
`plasma-care-customer` — no separate backend needed.

## One-time setup

1. Open your Supabase project → **SQL Editor** → run `supabase/admin_setup.sql`.
   This adds an `assigned_staff` column to `bookings` and lets logged-in
   staff read/update bookings.
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

## What it does

- **Login** — email/password (Supabase Auth).
- **Dashboard** — today's bookings by default, filter by date/status, search
  by name or phone, quick stats (total, pending, confirmed, revenue).
- **Booking detail (tap a row)** — full test/package list, address for home
  collection, phone-verified flag, change status, assign a staff member,
  one-tap "Call customer".

## Not included yet (next steps)

- Staff panel (separate, simpler app for the person actually doing home
  visits — just their assigned jobs for the day).
- Push/SMS notification to staff on new assignment.
- CSV export of bookings.
