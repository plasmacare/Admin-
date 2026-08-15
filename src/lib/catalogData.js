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

/* ---------- Margin-based package generation + approval ---------- */

export const PACKAGE_TYPES = [
  { value: 'weekday', label: 'Weekday Package' },
  { value: 'weekend', label: 'Weekend Package' },
  { value: 'occasional', label: 'Occasional Package' },
  { value: 'custom', label: 'Custom Package' },
]

/**
 * Given a set of tests and a target margin %, compute the sell price
 * from each test's cost_price. margin% is on price (not cost), i.e.
 * price = totalCost / (1 - margin/100). Falls back to test.price for
 * any test missing a cost_price, in which case that test's margin
 * can't be guaranteed — flagged in the returned object.
 */
export function computePackagePricing(tests, marginPercent) {
  let totalCost = 0
  let missingCost = false
  for (const t of tests) {
    if (t.cost_price == null) {
      missingCost = true
      totalCost += Number(t.price) || 0
    } else {
      totalCost += Number(t.cost_price) || 0
    }
  }
  const margin = Math.max(0, Math.min(95, Number(marginPercent) || 0))
  const price = margin > 0 ? totalCost / (1 - margin / 100) : totalCost
  return {
    totalCost: Math.round(totalCost * 100) / 100,
    suggestedPrice: Math.round(price * 100) / 100,
    marginPercent: margin,
    missingCost, // true if some included tests have no cost_price set — margin is an estimate
  }
}

/**
 * Creates a new package from selected tests + a margin target.
 * Always saved as 'pending_approval' (or 'draft' if not ready) so it
 * never appears on the customer site until an admin approves it.
 */
export async function generatePackage({ name, packageType, testIds, tests, marginPercent, description, submitForApproval = true }) {
  const selected = tests.filter((t) => testIds.includes(t.id))
  const { suggestedPrice } = computePackagePricing(selected, marginPercent)
  const { error } = await supabase.from('packages').insert({
    name,
    price: suggestedPrice,
    description: description || null,
    included_tests: testIds,
    is_active: true,
    package_type: packageType,
    margin_percent: marginPercent,
    auto_generated: true,
    status: submitForApproval ? 'pending_approval' : 'draft',
  })
  if (error) throw error
}

export async function submitPackageForApproval(id) {
  const { error } = await supabase.from('packages').update({ status: 'pending_approval' }).eq('id', id)
  if (error) throw error
}

export async function approvePackage(id, approvedBy) {
  const { error } = await supabase
    .from('packages')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: approvedBy || null })
    .eq('id', id)
  if (error) throw error
}

export async function rejectPackage(id) {
  const { error } = await supabase
    .from('packages')
    .update({ status: 'draft', approved_at: null, approved_by: null })
    .eq('id', id)
  if (error) throw error
}

/* ---------- Individual tests ---------- */
export async function fetchTests() {
  const { data, error } = await supabase.from('individual_tests').select('*').order('category').order('name')
  if (error) throw error
  return data || []
}
export async function addTest({ name, price, category, cost_price }) {
  const { error } = await supabase
    .from('individual_tests')
    .insert({ name, price, category, cost_price: cost_price ?? null, is_active: true })
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
