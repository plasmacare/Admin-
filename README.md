# Plasma Care — Admin Panel

Bookings dashboard for staff: view, filter, and update bookings that come in
through the customer booking site. Uses the **same Supabase project** as
`plasma-care-customer` — no separate backend needed.

## One-time setup

1. Open your Supabase project → **SQL Editor** → run `supabase/admin_setup.sql`,
   then `supabase/catalog_and_reports.sql`, then `supabase/fix_public_access.sql`,
   then `supabase/patient_details.sql`, then `supabase/enable_realtime.sql`,
   then `supabase/prescription_and_no_slots.sql`, then
   `supabase/prescription_ai_fields.sql`, then
   `supabase/pages_announcements_ai_packages.sql`. Together these:
   - add `assigned_staff`, `call_status`, `is_spam`, `admin_notes`,
     `report_url`, `report_status` columns to `bookings`
   - let logged-in staff read/update bookings, and manage packages and
     individual tests
   - create a `reports` storage bucket for uploaded report files
   - `fix_public_access.sql` restores the public (anon key) access the
     customer app needs — RLS being on for admin access otherwise blocks
     the customer site entirely
   - `patient_details.sql` adds patient name/age/gender/blood group fields
   - `enable_realtime.sql` turns on live database events for `bookings`,
     which powers the new-booking notification
   - `prescription_and_no_slots.sql` adds the prescription photo upload
     fields + storage bucket, and makes `slot_id` nullable now that
     booking is date-only (no more time slots)
   - `prescription_ai_fields.sql` stores the AI's confidence score and
     summary for each uploaded prescription
   - `pages_announcements_ai_packages.sql` adds legal pages, the
     announcement popup, and the AI package-suggestion queue
2. Supabase Dashboard → **Authentication → Users → Add user**. Create an
   email + password for each staff member who should have admin access.
   (No sign-up screen exists in this app on purpose — accounts are created
   by you, manually, so random people can't get in.)
3. Deploy the `generate-packages` edge function and set its secret:
   ```bash
   supabase functions deploy generate-packages
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
   Get a key at https://console.anthropic.com. If you already set this
   secret for the customer app's `analyze-prescription` function on the
   same Supabase project, it's shared — no need to set it twice.

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
- **AI Packages tab** — type a brief (themes, margin targets, which tests
  to build around) and Claude drafts 1-4 package ideas from your real
  test catalog. Nothing goes live automatically — each suggestion sits in
  a pending queue until you tap "Approve & publish" (which adds it to the
  real, customer-visible `packages` table) or "Reject" (discards it).
  Needs an `ANTHROPIC_API_KEY` secret (see setup above).
- **Pages tab** — edit Terms & Conditions, Privacy Policy, Refund Policy,
  or add custom pages. A page only appears on the customer site (linked
  in the footer) once it has actual content — leave it blank and it stays
  hidden.
- **Announcements tab** — write a popup announcement/offer; only one can
  be "Live" at a time. Shows to customers once per browser session,
  skippable or auto-closing after 15 seconds.
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

## New in this update

**Setup — run these SQL files too** (Supabase SQL Editor):
- `supabase/seed_full_test_catalog.sql` — inserts all 220 tests from the
  price list PDF into `individual_tests`. Safe to re-run (skips names
  that already exist).
- `supabase/customer_ip_tracking.sql` — adds `customer_ip` to `bookings`.
- `supabase/payment_settings.sql` — admin-only payment settings + per-
  booking payment request fields.

**Spam detection** now also flags a booking if 4+ bookings share the same
IP address (on top of the existing phone/name checks) — visible in the
⚠ banner same as before.

**Report sharing** — when a report is uploaded, WhatsApp/Telegram/Copy
buttons appear right under it to send the link straight to the customer.

**Payments tab (new)** — off by default. Turn it on and set either your
own UPI ID (generates a QR per request, no third-party account needed)
or Razorpay. When on, each booking gets a "Request payment" control —
Full / Partial (50%) / Custom amount — that generates a QR or payment
link to share, and a manual "Mark as paid" once you've confirmed it in
your own UPI/Razorpay app (there's no automatic payment-confirmation
webhook in this version — that would be the next thing to add if you
end up leaning on this a lot).

For Razorpay: deploy the function and set both secrets (the secret key
must never go in the settings form, only here):
```bash
supabase functions deploy create-payment-link
supabase secrets set RAZORPAY_KEY_ID=rzp_live_...
supabase secrets set RAZORPAY_KEY_SECRET=...
```

## New in this update — payment collection is now compulsory (when on)

Two fixes here:
1. **Payment is now mandatory when enabled** — the customer's booking
   flow no longer has an "I'll pay later" skip option. For UPI, they
   must upload a payment screenshot before the booking flow finishes.
   For Razorpay, the flow now polls in the background and only
   continues once the webhook confirms the payment — there's no way to
   click past it.
2. **Fixed a bug where a broken Razorpay setup silently skipped
   payment entirely** — previously, if creating the Razorpay payment
   link failed (e.g. `RAZORPAY_KEY_SECRET` not set as an Edge Function
   secret yet), the customer's booking would complete as if payment
   collection were off. Now it shows an error with a "Retry payment
   setup" button instead — payment being enabled means it can't be
   silently bypassed. If you're testing with a Razorpay test key and
   see this error, double check both `RAZORPAY_KEY_ID` (in the Payments
   tab) and `RAZORPAY_KEY_SECRET` (Edge Function secret — never in the
   form) are set for the **same** Razorpay account/mode (test vs live).

## New in this update — admin notifications, spam booking delete

- **Notifications fixed for mobile Chrome** — "enabled" previously
  didn't reliably fire once the admin tab was backgrounded, because
  plain `new Notification()` is unreliable on Android Chrome in that
  state. Fixed by adding a minimal service worker (`public/sw.js`) and
  routing notifications through it. No setup needed — it registers
  itself automatically. If you already had notifications "on" from
  before this update, reload the page once so the service worker can
  register.
- **Delete a booking** — the Bookings tab now has a "Delete booking"
  button (next to "Mark as spam") for permanently removing fake/spam/
  test bookings, including their uploaded files. This can't be undone.
  Run `supabase/allow_booking_delete.sql` once — there was no delete
  policy on `bookings`/`addresses` before, so deletes would otherwise
  fail silently.

## New in this update — payment is now one unitary rule, collected inline during booking

Payment collection changed from "admin manually requests an amount per
booking, then shares a QR/link" to: admin sets **one global rule** in
the **Payments** tab — Full payment, or Partial (a fixed % of the
total) — and it applies to every booking automatically. The customer
pays it as part of the same booking flow itself (right after they tap
"Confirm booking"), so there's no separate share-the-QR step afterward.

- **UPI ("Dynamic QR")** — the customer sees the QR right there in the
  booking flow and uploads a screenshot once they've paid, before
  moving on to the confirmation screen. That screenshot shows up here
  in the Bookings tab for you to review and tap "Confirm — mark as
  paid".
- **Razorpay ("Gateway")** — no screenshot needed. Set up the webhook
  below once and matching bookings get marked paid automatically.

The per-booking "Request payment" button/QR is gone from the Bookings
tab — you'll only see a read-only payment status there now, plus a
small "Create payment request" fallback button for the rare case a
booking exists from before payment collection was turned on.

**Setup — run this SQL file too** (Supabase SQL Editor):
- `supabase/payment_v3_integrated_flow.sql` — adds `payment_type` /
  `partial_percentage` to payment settings, and lets the customer site
  read payment settings (needed so it can build the QR/gateway button
  during booking).
- `supabase/payment_v2_and_announcement_poster.sql` — adds the
  `payment-proofs` storage bucket, `payment_screenshot_url` /
  `razorpay_payment_link_id` columns, the announcement poster column +
  bucket, and `prescription_upload_error`.

**If prescription uploads fail with "new row violates row-level security
policy"** — run `supabase/RUN_THIS_FIRST_prescriptions_fix.sql` instead.
It's a complete, standalone fix (bucket + both upload/read policies) for
when the original `prescription_and_no_slots.sql` never fully ran on
this project — safe to run repeatedly, includes a couple of verification
queries at the bottom.

- `supabase/fix_prescriptions_bucket_public.sql` — fixes an existing bug
  where uploaded prescription photos could silently fail to display (the
  storage bucket wasn't always marked public — see below). Safe to
  re-run.

**New env var** — add to this app's `.env`:
```
VITE_CUSTOMER_SITE_URL=https://yourname.github.io/Plasma-Care-
```
This is the customer site's deployed base URL. It's now mostly used for
the `/pay/:bookingId` fallback page (useful if you ever need to resend
a payment link manually) rather than the main flow, but is still worth
setting.

**Razorpay auto-tracking webhook (new)** — makes Gateway payments mark
themselves paid automatically instead of needing a manual click:
```bash
supabase functions deploy razorpay-webhook --no-verify-jwt
supabase secrets set RAZORPAY_WEBHOOK_SECRET=whsec_...
```
Then in the Razorpay Dashboard → Settings → Webhooks → Add New Webhook:
- URL: `https://<your-project-ref>.supabase.co/functions/v1/razorpay-webhook`
- Secret: same value as `RAZORPAY_WEBHOOK_SECRET` above (this is a
  *different* secret from `RAZORPAY_KEY_SECRET`)
- Active events: `payment_link.paid`

Without this webhook, Razorpay payments still work — you'll just need
to check back and tap "Mark as paid" yourself once you see the payment
land in your Razorpay dashboard.

## New in this update — why prescription photos weren't showing

If prescription photos uploaded fine on the customer side but never
appeared here, it was a real bug: the original setup script created the
`prescriptions` storage bucket with `on conflict do nothing`, which
meant it could stay non-public if a bucket with that name already
existed from an earlier run. A non-public bucket's "public URL" doesn't
actually load — so the photo silently failed to render for everyone,
not just admin. Run `supabase/fix_prescriptions_bucket_public.sql` once
to fix it (safe to re-run any time). Going forward, if a customer's
upload fails for any reason (bad connection, etc.), you'll now see a
banner here explaining what went wrong instead of the booking just
missing a photo with no explanation.

## New in this update — announcement poster image

Announcements can now include a poster image, shown at the top of the
popup card on the customer site. Upload it when creating the
announcement in the **Announcements** tab — optional, leave it blank for
a text-only popup like before.

## New in this update — notifications toggle

The notification banner used to disappear once dismissed or once
permission was granted, with no way to turn alerts back off short of
digging into browser settings. There's now a persistent on/off switch
at the top of the Bookings tab (once browser permission has been
granted at least once) so you can mute/unmute new-booking alerts
whenever you like.

**On "AI auto-integrating any payment gateway"** — that specific ask
isn't something I built, and I don't think it's buildable honestly:
every gateway (Razorpay, PayU, Cashfree, Stripe...) has its own API
shape, so nothing can safely wire up an arbitrary provider from just a
key and a name. What's here is a real, working Razorpay integration —
adding another named gateway later is possible but needs its own
specific implementation, not a generic "put in any key" flow.
