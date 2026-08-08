import { supabase } from './supabase'

/* ---------- Packages ---------- */
export async function fetchPackages() {
  const { data, error } = await supabase.from('packages').select('*').order('name')
  if (error) throw error
  return data || []
}
export async function addPackage({ name, price }) {
  const { error } = await supabase.from('packages').insert({ name, price, is_active: true })
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

/* ---------- Time slots ---------- */
export async function fetchSlots() {
  const { data, error } = await supabase.from('time_slots').select('*').order('start_time')
  if (error) throw error
  return data || []
}
export async function addSlot({ start_time, end_time, max_capacity }) {
  const { error } = await supabase.from('time_slots').insert({ start_time, end_time, max_capacity, is_active: true })
  if (error) throw error
}
export async function addSlotsBulk(slots) {
  const { error } = await supabase.from('time_slots').insert(slots)
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
 * Builds an array of {start_time, end_time, max_capacity} slots between
 * two times at a fixed interval, e.g. 08:00–18:00 every 60 min.
 */
export function generateSlotRange({ startTime, endTime, intervalMinutes, capacity }) {
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
  const slots = []
  for (let t = start; t + intervalMinutes <= end; t += intervalMinutes) {
    slots.push({ start_time: toTime(t), end_time: toTime(t + intervalMinutes), max_capacity: capacity, is_active: true })
  }
  return slots
}
