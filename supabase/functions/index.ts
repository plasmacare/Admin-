// Supabase Edge Function: razorpay-webhook
//
// Lets Razorpay ("Gateway") payments auto-confirm without any manual
// "Mark as paid" click. Configure this as a Webhook URL in your Razorpay
// Dashboard (Settings → Webhooks) subscribed to the `payment_link.paid`
// event, and set RAZORPAY_WEBHOOK_SECRET as an Edge Function secret to
// the same secret you set for that webhook in the Razorpay Dashboard —
// this is a DIFFERENT value from RAZORPAY_KEY_SECRET.
//
//   supabase functions deploy razorpay-webhook --no-verify-jwt
//   supabase secrets set RAZORPAY_WEBHOOK_SECRET=whsec_...
//
// Webhook URL to paste into Razorpay's dashboard:
//   https://<your-project-ref>.supabase.co/functions/v1/razorpay-webhook
//
// Razorpay signs each delivery with HMAC-SHA256 of the raw request body,
// sent in the X-Razorpay-Signature header — this function verifies that
// before trusting anything in the payload.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function verifySignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(RAZORPAY_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('')
  // Constant-time-ish comparison.
  if (expected.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('x-razorpay-signature')

  const valid = await verifySignature(rawBody, signature)
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
  }

  let event
  try {
    event = JSON.parse(rawBody)
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  if (event.event === 'payment_link.paid') {
    const paymentLinkId = event.payload?.payment_link?.entity?.id
    if (paymentLinkId) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      await supabase
        .from('bookings')
        .update({ payment_status: 'paid' })
        .eq('razorpay_payment_link_id', paymentLinkId)
    }
  }

  // Always 200 quickly — Razorpay retries on non-2xx, and we've already
  // done the work (or there was nothing to do for this event type).
  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
