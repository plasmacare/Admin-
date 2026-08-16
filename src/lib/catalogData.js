import { supabase } from './supabase'

/* ---------- Packages ---------- */
export async function fetchPackages() {
  const { data, error } = await supabase.from('packages').select('*').order('name')
  if (error) throw error
  return data || []
}
export async function addPackage({ name, price, description, includedTests }) {
  const { error } = await supabase
    .from('packages')
    .insert({ name, price, description: description || null, included_tests: includedTests || [], is_active: true })
  if (error) throw error
}
export async function updatePackage(id, fields) {
  const { error } = await supabase.from('packages').update(fields).eq('id', id)
  if (error) throw error
}
export async function deletePackage(id) {
  const { error } = await supabase.from('packages').delete().eq('id', id)
  if (error) throw error
}

/* ---------- Individual tests ---------- */
export async function fetchTests() {
  const { data, error } = await supabase.from('individual_tests').select('*').order('category').order('name')
  if (error) throw error
  return data || []
}
export async function addTest({ name, price, category }) {
  const { error } = await supabase.from('individual_tests').insert({ name, price, category, is_active: true })
  if (error) throw error
}
export async function updateTest(id, fields) {
  const { error } = await supabase.from('individual_tests').update(fields).eq('id', id)
  if (error) throw error
}
export async function deleteTest(id) {
  const { error } = await supabase.from('individual_tests').delete().eq('id', id)
  if (error) throw error
}

/* ---------- Time slots ----------
 * Real schema: id, slot_date, start_time, end_time, max_capacity,
 * booked_count, created_at. Slots are per-date (not a reusable daily
 * template) and have no is_active flag — a slot is "closed" simply by
 * not existing for that date, or by setting max_capacity to 0.
 */
export async function fetchSlots({ fromDate } = {}) {
  let query = supabase.from('time_slots').select('*').order('slot_date').order('start_time')
  if (fromDate) query = query.gte('slot_date', fromDate)
  const { data, error } = await query
  if (error) throw error
  return data || []
}
export async function addSlot({ slot_date, start_time, end_time, max_capacity }) {
  const { error } = await supabase.from('time_slots').insert({ slot_date, start_time, end_time, max_capacity, booked_count: 0 })
  if (error) throw error
}
export async function addSlotsBulk(slots) {
  const { error } = await supabase.from('time_slots').insert(slots.map((s) => ({ ...s, booked_count: 0 })))
  if (error) throw error
}
export async function updateSlot(id, fields) {
  const { error } = await supabase.from('time_slots').update(fields).eq('id', id)
  if (error) throw error
}
export async function deleteSlot(id) {
  const { error } = await supabase.from('time_slots').delete().eq('id', id)
  if (error) throw error
}

/**
 * Builds an array of {slot_date, start_time, end_time, max_capacity}
 * rows for every day in [startDate, endDate] at a fixed time interval,
 * e.g. 08:00–18:00 every 60 min, for 2026-08-10 through 2026-08-12.
 */
export function generateSlotRange({ startDate, endDate, startTime, endTime, intervalMinutes, capacity }) {
  const toMinutes = (t) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const toTime = (mins) => {
    const h = String(Math.floor(mins / 60) % 24).padStart(2, '0')
    const m = String(mins % 60).padStart(2, '0')
    return `${h}:${m}:00`
  }
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)
  const timeSlots = []
  for (let t = start; t + intervalMinutes <= end; t += intervalMinutes) {
    timeSlots.push({ start_time: toTime(t), end_time: toTime(t + intervalMinutes) })
  }

  const slots = []
  const cursor = new Date(`${startDate}T00:00:00`)
  const last = new Date(`${endDate}T00:00:00`)
  while (cursor <= last) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const d = String(cursor.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`
    for (const t of timeSlots) {
      slots.push({ slot_date: dateStr, start_time: t.start_time, end_time: t.end_time, max_capacity: capacity })
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return slots
}
