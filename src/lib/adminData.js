import { supabase } from './supabase'

export const STATUSES = ['pending', 'confirmed', 'sample_collected', 'report_ready', 'completed', 'cancelled']

export async function fetchLookups() {
  const [{ data: packages }, { data: tests }, { data: slots }] = await Promise.all([
    supabase.from('packages').select('id, name, price'),
    supabase.from('individual_tests').select('id, name, price'),
    supabase.from('time_slots').select('id, start_time, end_time'),
  ])
  return {
    packagesById: Object.fromEntries((packages || []).map((p) => [p.id, p])),
    testsById: Object.fromEntries((tests || []).map((t) => [t.id, t])),
    slotsById: Object.fromEntries((slots || []).map((s) => [s.id, s])),
  }
}

export async function fetchBookings({ date, status } = {}) {
  let query = supabase.from('bookings').select('*').order('created_at', { ascending: false })
  if (date) query = query.eq('scheduled_date', date)
  if (status) query = query.eq('status', status)
  const { data: bookings, error } = await query
  if (error) throw error

  const ids = (bookings || []).map((b) => b.id)
  let addressesByBooking = {}
  if (ids.length) {
    const { data: addresses } = await supabase.from('addresses').select('*').in('booking_id', ids)
    addressesByBooking = Object.fromEntries((addresses || []).map((a) => [a.booking_id, a]))
  }

  return (bookings || []).map((b) => ({ ...b, address: addressesByBooking[b.id] || null }))
}

export async function updateBookingStatus(id, status) {
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
  if (error) throw error
}

export async function updateBookingStaff(id, assignedStaff) {
  const { error } = await supabase.from('bookings').update({ assigned_staff: assignedStaff }).eq('id', id)
  if (error) throw error
}

export async function updateCallStatus(id, callStatus) {
  const { error } = await supabase.from('bookings').update({ call_status: callStatus }).eq('id', id)
  if (error) throw error
}

export async function updateAdminNotes(id, notes) {
  const { error } = await supabase.from('bookings').update({ admin_notes: notes }).eq('id', id)
  if (error) throw error
}

export async function setSpamFlag(id, isSpam) {
  const { error } = await supabase.from('bookings').update({ is_spam: isSpam }).eq('id', id)
  if (error) throw error
}

export async function uploadReport(bookingId, file) {
  const path = `${bookingId}/${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase.storage.from('reports').upload(path, file, { upsert: true })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from('reports').getPublicUrl(path)
  const { error } = await supabase
    .from('bookings')
    .update({ report_url: data.publicUrl, report_status: 'uploaded' })
    .eq('id', bookingId)
  if (error) throw error
  return data.publicUrl
}

export async function skipReport(bookingId) {
  const { error } = await supabase.from('bookings').update({ report_status: 'skipped', report_url: null }).eq('id', bookingId)
  if (error) throw error
}

export async function resetReport(bookingId) {
  const { error } = await supabase.from('bookings').update({ report_status: 'pending', report_url: null }).eq('id', bookingId)
  if (error) throw error
}

/**
 * Lightweight, no-infra spam heuristic computed over whatever bookings are
 * currently loaded: flags a booking if the same phone number shows up 3+
 * times, or the name looks like a placeholder (all digits, single
 * repeated character, or too short to be a real name).
 */
export function computeSpamFlags(bookings) {
  const phoneCounts = {}
  for (const b of bookings) {
    if (!b.customer_phone) continue
    phoneCounts[b.customer_phone] = (phoneCounts[b.customer_phone] || 0) + 1
  }
  return bookings.map((b) => {
    const reasons = []
    if (b.customer_phone && phoneCounts[b.customer_phone] >= 3) {
      reasons.push(`Same number used ${phoneCounts[b.customer_phone]}x`)
    }
    const name = (b.customer_name || '').trim()
    if (name && /^(\d+|(.)\2{2,}|test|xxx+|asdf)$/i.test(name.replace(/\s+/g, ''))) {
      reasons.push('Suspicious name')
    }
    if (b.customer_phone && !/^[6-9]\d{9}$/.test(b.customer_phone.replace(/\D/g, '').slice(-10))) {
      reasons.push('Invalid phone format')
    }
    return { ...b, spamReasons: reasons }
  })
}

export function computeStats(bookings) {
  const stats = { total: bookings.length, pending: 0, confirmed: 0, revenue: 0 }
  for (const b of bookings) {
    if (b.status === 'pending') stats.pending += 1
    if (b.status === 'confirmed') stats.confirmed += 1
    if (b.status !== 'cancelled') stats.revenue += Number(b.total_amount || 0)
  }
  return stats
}
