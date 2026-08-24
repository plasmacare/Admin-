import { supabase } from './supabase'

export async function fetchPaymentSettings() {
  const { data, error } = await supabase.from('payment_settings').select('*').eq('id', 1).single()
  if (error) throw error
  return data
}

export async function updatePaymentSettings(fields) {
  const { error } = await supabase
    .from('payment_settings')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', 1)
  if (error) throw error
}

/** UPI deep-link QR — generated entirely client-side via a public QR image renderer, no API key needed. */
export function buildUpiQrUrl({ upiId, payeeName, amount, note }) {
  const upiLink =
    `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName || 'Plasma Care')}` +
    `&am=${encodeURIComponent(amount)}&cu=INR&tn=${encodeURIComponent(note || 'Plasma Care payment')}`
  return {
    upiLink,
    qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}`,
  }
}

export async function createRazorpayLink({ amount, customerName, customerPhone, description }) {
  const { data, error } = await supabase.functions.invoke('create-payment-link', {
    body: { amount, customerName, customerPhone, description },
  })
  if (error) throw error
  return data
}

/**
 * Set VITE_CUSTOMER_SITE_URL in this app's .env to the customer site's
 * deployed base URL (e.g. https://yourname.github.io/Plasma-Care-) so the
 * "share to customer" link points at the right place. Falls back to a
 * relative path (useful only when testing both apps on the same origin).
 */
export function buildPaymentPageUrl(bookingId) {
  const base = import.meta.env.VITE_CUSTOMER_SITE_URL || ''
  return `${base.replace(/\/$/, '')}/pay/${bookingId}`
}

export async function savePaymentRequest(bookingId, { amount, method, link, razorpayPaymentLinkId }) {
  const { error } = await supabase
    .from('bookings')
    .update({
      payment_requested_amount: amount,
      payment_method: method,
      payment_link: link,
      payment_status: 'requested',
      razorpay_payment_link_id: razorpayPaymentLinkId || null,
      payment_screenshot_url: null,
    })
    .eq('id', bookingId)
  if (error) throw error
}

export async function markPaymentReceived(bookingId) {
  const { error } = await supabase.from('bookings').update({ payment_status: 'paid' }).eq('id', bookingId)
  if (error) throw error
}
