// Supabase Edge Function: create-payment-link
// Admin-only. Creates a Razorpay Payment Link for a specific amount and
// returns the shareable URL. The Razorpay secret key never leaves this
// function — set both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET as Edge
// Function secrets (Key ID is also stored in payment_settings for
// display, but the secret that actually authorizes requests lives only here).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')!
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, customerName, customerPhone, description } = await req.json()
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'A positive amount is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
    const res = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // paise
        currency: 'INR',
        description: description || 'Plasma Care — diagnostic booking payment',
        customer: {
          name: customerName || undefined,
          contact: customerPhone ? `+91${customerPhone.replace(/\D/g, '').slice(-10)}` : undefined,
        },
        notify: { sms: false, email: false },
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Razorpay request failed', details: data }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ link: data.short_url, id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err instanceof Error ? err.message : err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
