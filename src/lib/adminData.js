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

export function computeStats(bookings) {
  const stats = { total: bookings.length, pending: 0, confirmed: 0, revenue: 0 }
  for (const b of bookings) {
    if (b.status === 'pending') stats.pending += 1
    if (b.status === 'confirmed') stats.confirmed += 1
    if (b.status !== 'cancelled') stats.revenue += Number(b.total_amount || 0)
  }
  return stats
}
