// Sends an FCM push notification AND an email to admins on every new booking.
// Triggered by the `on_booking_insert_notify_admins` DB trigger, but you can
// call it from anywhere (e.g. a "mark as urgent" button) with the same body:
//   { "title": "...", "body": "...", "booking_id": "..." }
//
// Required secrets (set with `supabase secrets set NAME=value`):
//   FCM_PROJECT_ID           — Firebase project ID
//   FCM_SERVICE_ACCOUNT_JSON — full contents of the Firebase service-account JSON key
//   RESEND_API_KEY           — from resend.com (free tier: 100 emails/day, 3000/month)
//   ADMIN_EMAILS             — comma-separated list, e.g. "you@gmail.com,partner@gmail.com"
//   FROM_EMAIL                — must be on a domain verified in Resend, e.g. "alerts@yourdomain.com"
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase
//
// Push and email failures are independent — if one fails the other still
// goes through, and the response reports both outcomes separately.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const FCM_PROJECT_ID = Deno.env.get('FCM_PROJECT_ID')
const SERVICE_ACCOUNT_RAW = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON')
const SERVICE_ACCOUNT = SERVICE_ACCOUNT_RAW ? JSON.parse(SERVICE_ACCOUNT_RAW) : null

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ADMIN_EMAILS = (Deno.env.get('ADMIN_EMAILS') ?? '')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean)
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'alerts@resend.dev'

async function sendEmail(title: string, body: string, booking_id?: string) {
  if (!RESEND_API_KEY || !ADMIN_EMAILS.length) {
    return { skipped: true, reason: 'RESEND_API_KEY or ADMIN_EMAILS not set' }
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: ADMIN_EMAILS,
      subject: title,
      html: `<p>${body}</p>${booking_id ? `<p>Booking ID: ${booking_id}</p>` : ''}`,
    }),
  })
  return { ok: res.ok, status: res.status }
}

async function getAccessToken() {
  const jwtHeader = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const jwtClaim = {
    iss: SERVICE_ACCOUNT.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }
  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  const unsigned = `${enc(jwtHeader)}.${enc(jwtClaim)}`

  const keyData = SERVICE_ACCOUNT.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')
  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsigned)
  )
  const encodedSig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  const jwt = `${unsigned}.${encodedSig}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  const data = await res.json()
  return data.access_token as string
}

async function sendPush(title: string, body: string, booking_id?: string) {
  if (!FCM_PROJECT_ID || !SERVICE_ACCOUNT) {
    return { skipped: true, reason: 'FCM_PROJECT_ID or FCM_SERVICE_ACCOUNT_JSON not set' }
  }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const { data: tokens, error } = await supabase.from('admin_push_tokens').select('fcm_token')
  if (error) throw error
  if (!tokens?.length) return { sent: 0, total: 0 }

  const accessToken = await getAccessToken()
  const results = await Promise.all(
    tokens.map((row) =>
      fetch(`https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: row.fcm_token,
            notification: { title, body },
            data: booking_id ? { booking_id: String(booking_id) } : {},
            android: { priority: 'high' },
          },
        }),
      })
    )
  )
  return { sent: results.filter((r) => r.ok).length, total: results.length }
}

Deno.serve(async (req) => {
  const { title, body, booking_id } = await req.json()

  // Independent — one failing doesn't block the other.
  const [pushResult, emailResult] = await Promise.allSettled([
    sendPush(title, body, booking_id),
    sendEmail(title, body, booking_id),
  ])

  return new Response(
    JSON.stringify({
      push: pushResult.status === 'fulfilled' ? pushResult.value : { error: String(pushResult.reason) },
      email: emailResult.status === 'fulfilled' ? emailResult.value : { error: String(emailResult.reason) },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
