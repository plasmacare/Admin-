# Plasma Care — Customer Booking App

React + Vite + Supabase. Pathology booking flow (home collection or lab visit),
date-only scheduling, and an optional prescription-photo upload for anyone
unsure which tests to pick. No OTP/phone verification — a name and phone
number are collected but not verified. Other 5 services are shown as
"Coming Soon".

## Run locally

```bash
npm install
npm run dev
```

Opens at http://localhost:5173

## Build for hosting

```bash
npm run build
```
This creates a `dist/` folder — upload/deploy that to Vercel, Netlify, Hostinger, etc.
(For Vercel/Netlify: just connect the repo, they auto-detect Vite and run `npm run build`.)

## Environment variables

Already filled in `.env` for this project. If you deploy to Vercel/Netlify, add the
same 3 variables in their dashboard's "Environment Variables" section:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MAPPLS_API_KEY`

## Database setup

Run these once in the Supabase SQL Editor, in this order (skip any you've
already run for the admin panel):

1. `supabase/fix_public_access.sql` — public (non-logged-in) read/write
   access this app needs on packages, tests, bookings, and addresses.
2. `supabase/patient_details.sql` — patient name/age/gender/blood group
   fields.
3. `supabase/prescription_and_no_slots.sql` — prescription photo upload
   fields + storage bucket, and makes `slot_id` nullable (booking is
   date-only now, no time slot).
4. `supabase/prescription_ai_fields.sql` — stores the AI's confidence
   score and summary for each uploaded prescription.
5. `supabase/pages_announcements_ai_packages.sql` — legal pages,
   announcements, and the AI package-suggestion queue.
6. `supabase/RUN_THIS_FIRST_prescriptions_fix.sql` — **run this if
   prescription uploads fail with "new row violates row-level security
   policy"**. Self-contained fix for when the original migration below
   never fully ran; safe to re-run.
6b. `supabase/fix_prescriptions_bucket_public.sql` — fixes a bug where
   uploaded prescription photos could silently fail to display (see
   "What's new" below). Safe to re-run.
7. `supabase/payment_v2_and_announcement_poster.sql` — adds the
   `/pay/:bookingId` payment page's storage bucket + columns, the
   announcement poster image column/bucket, and a column to record why a
   prescription upload failed (so it's visible to admin instead of just
   silently missing).

`supabase/slot_capacity_functions.sql` is no longer needed for new
setups — it's left in place only because older deployments may already
depend on it.

## What's new in this update

- **Blood-drop "glass wall" hero animation** — the home screen can now
  show falling blood-drop animation styled like the inner wall of a
  glass test tube, toggleable from the admin **Views** tab: **Off**,
  **Low** (CSS/SVG, no WebGL, safe on any phone), or **High** (real
  Three.js/WebGL glass-like drops). Changes apply live on the customer
  site with no redeploy. Auto-degrades to Low if a device has no WebGL
  even when High is selected, and turns off entirely if the visitor's
  OS has "reduce motion" on, regardless of the admin setting.
  Run `supabase/site_settings_and_analytics.sql` for this.
  New dependency: `three` — run `npm install` before building.
- **Page-view analytics** — every page load is now logged (session,
  path, and a rough city-level location from the visitor's IP), and a
  live-viewer "who's on the site right now" presence channel runs for
  as long as a tab is open. Feeds the new admin Views tab. Same SQL
  file as above adds this.

- **A blank page now shows a real message** — if a deployment is
  missing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, the site used
  to fail completely silently (a totally blank white page, with the
  only clue being a console error invisible on a phone with no
  devtools). It now shows an actual on-screen message explaining what's
  missing. This doesn't fix a missing env var for you — it just makes
  it visible instead of an unexplained blank page.

  **If you see a blank page (or this new message) on the live site**:
  this repo deploys via `.github/workflows/deploy.yml`, which reads
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (and
  `VITE_MAPPLS_API_KEY`) from **GitHub repo Secrets** — not from a
  `.env` file, which only matters for local dev. Check:
  1. GitHub repo → **Settings → Secrets and variables → Actions** —
     confirm those secrets still exist with correct values.
  2. GitHub repo → **Settings → Pages** — confirm **Source** is set to
     **GitHub Actions** (toggling the repo private/public can
     occasionally reset this).
  3. GitHub repo → **Actions** tab — open the latest "Deploy to GitHub
     Pages" run and check it succeeded. If nothing ran recently (e.g.
     after making the repo public again), click **Run workflow**
     manually, or push any small commit to `main` to trigger it.

- **Payment is now mandatory when admin has it on** — no more "I'll pay
  later" skip. UPI requires a screenshot upload before the flow can
  finish; Razorpay now polls in the background and only continues once
  the webhook confirms payment. A broken payment setup (e.g. a missing
  Razorpay secret) now shows a retry screen instead of silently letting
  the booking through unpaid.
- **Package details drawer** — tapping a package name in the Tests step
  now expands a drawer listing exactly which individual tests are
  included, instead of just showing a price with no breakdown.
- **Site-wide animation** — the flowing/pulsing animation used to only
  live behind the home page logo; it's now a subtle, continuous
  backdrop (drifting blood cells, pulsing neuron links, rising bubbles)
  behind every page, not just the home screen. Still pure CSS,
  low-opacity, and respects reduced-motion settings.
- **Payment page** — after admin requests payment for a booking, the
  customer can now see the QR (or a "Pay Now" button for gateway
  payments) at `/pay/:bookingId`, and upload a screenshot as proof for
  UPI payments. This used to only be visible inside the admin panel.
  **(Superseded below — payment is now collected inline during
  booking; this page is kept only as a fallback/resend link.)**
- **Prescription photo bug fix** — photos customers uploaded were
  sometimes not rendering anywhere (including for admin) because the
  storage bucket wasn't always created as public. Run
  `fix_prescriptions_bucket_public.sql` to fix existing deployments.
- **Announcement poster image** — the popup can now show an image at
  the top, if the admin uploaded one.
- **Animated hero** — the home screen now has a lightweight,
  continuously-looping heartbeat-line animation and a few soft drifting
  accents behind the logo (pure CSS, respects reduced-motion settings).
- **Date picker respects collection hours** — since collection hours end
  at 9 PM, "today" is no longer offered as a bookable date after 9 PM;
  the picker starts from tomorrow instead. Before this fix, a customer
  booking late at night could pick a same-day slot that had already
  passed.
- **Payment collected inline during booking (new)** — admin sets one
  global rule in the admin Payments tab (Full payment, or Partial — a
  fixed % of the total), and it applies the same way to every booking.
  Right after a customer taps "Confirm booking", if payment collection
  is on, they see a Payment step in the same flow: a UPI QR (scan, pay,
  upload a screenshot as proof) or a Razorpay "Pay Now" button —
  before reaching the "Booking Confirmed" screen. No separate step or
  link needed afterward. Run `supabase/payment_v3_integrated_flow.sql`
  for this (see the admin app's README for full setup).

## Edge Functions

Deploy `analyze-prescription`:
```bash
supabase functions deploy analyze-prescription
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```
Get a key at https://console.anthropic.com. This is separate from the
`generate-packages` function used by the admin panel — set the same
secret there too if you haven't already (see the admin README).

## No accounts, no verification

There's no OTP, no phone verification, and no "My Account"/login section
— all removed together since My Account only existed to show the
OTP-verified customer's own history. The booking flow now just collects
a name and phone number (unverified) and creates the booking directly.

`supabase/drop_otp_table_optional.sql` removes the now-unused
`otp_verifications` table if you want to clean it up.

## What's here

- **Booking flow order** — Patient details → Prescription upload (optional,
  AI-assisted) → Select tests/packages (with search) → Type → Location →
  Date → Contact details → Confirm.
- **Prescription photo + AI**: after compressing the photo in-browser, it's
  sent to Claude along with your live test/package catalog. If — and only
  if — the AI is ≥99% confident it read every test correctly, matching
  tests are pre-selected on the next screen (plus a couple of closely
  related tests it thinks might be relevant). Below that confidence, the
  photo still uploads and shows on the admin side for staff to read
  manually — nothing gets silently guessed into a customer's order.
  **Needs an `ANTHROPIC_API_KEY` secret** on the `analyze-prescription`
  edge function (get one at console.anthropic.com) — without it, the
  photo still uploads fine, the AI matching step just fails quietly and
  falls back to manual selection.
- **Date-only scheduling** — no time slot picker; the confirmation screen
  tells the customer the collection window (6:00 AM – 9:00 PM) and that
  staff will call to confirm an exact time.
- **Legal/policy pages** (`/pages/terms`, `/pages/privacy`, etc.) — only
  linked in the footer once an admin has actually written content for
  them; empty ones stay hidden.
- **Announcement popup** — shows once per browser session if an admin has
  an announcement marked active; skippable or auto-closes after 15s.

## Mappls note

If the address search box returns no results (401 error in browser console),
check your Mappls Console under "REST APIs" — Autosuggest sometimes needs a
separate REST key from the Web SDK key. Reverse geocode (the pin-drop address)
uses the same static key and should work as-is.

## A note on "hiding" API keys / blocking DevTools

This came up directly: there is no way to fully prevent someone from
opening browser DevTools and reading a web app's JS/network requests —
that's true of every website, not something specific to this one. What
actually matters:
- Supabase's anon key is *meant* to be public — it's safe to see, because
  real access control comes from the RLS policies already in place, not
  from hiding the key.
- The Ninza/2Factor/Anthropic keys never ship to the browser at all —
  they only exist as Edge Function secrets on Supabase's servers.
- Restricting the whole site to specific IP addresses is possible, but
  only at the hosting layer (e.g. Cloudflare Access in front of GitHub
  Pages), not from application code.

## What's next

1. Staff panel (separate app) — home-visit & in-store task views

## New in this update

- **Prescription upload errors are no longer silent** — if the upload
  fails, it's logged to the browser console and the confirmation screen
  tells the customer to WhatsApp it directly, instead of just vanishing.
- **Camera or gallery** — the prescription step now offers both as
  separate buttons, instead of one button that only opened the camera.
- **Save as image** — the confirmation screen has a button that
  downloads a screenshot of the booking confirmation (via html2canvas).
- **All 66 previously-English-only strings now have real translations**
  in Hindi, Odia, Bengali, Telugu, and Assamese — switching languages
  should no longer show a mix of translated and English text.
- **Full 220-test catalog** — run `supabase/seed_full_test_catalog.sql`
  to load every test from the price list PDF into `individual_tests`
  (safe to re-run, skips existing names).
- **Customer IP is now recorded** per booking (`supabase/customer_ip_tracking.sql`)
  — used by the admin panel's spam detection to flag unusually many
  bookings from the same IP.
