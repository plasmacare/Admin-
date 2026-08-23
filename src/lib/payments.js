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

export async function savePaymentRequest(bookingId, { amount, method, link }) {
  const { error } = await supabase
    .from('bookings')
    .update({ payment_requested_amount: amount, payment_method: method, payment_link: link, payment_status: 'requested' })
    .eq('id', bookingId)
  if (error) throw error
}

export async function markPaymentReceived(bookingId) {
  const { error } = await supabase.from('bookings').update({ payment_status: 'paid' }).eq('id', bookingId)
  if (error) throw error
}
