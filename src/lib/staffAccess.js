import { supabase } from './supabase'

export async function fetchStaffProfiles() {
  const { data, error } = await supabase
    .from('staff_profiles')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function updateStaffProfile(id, updates) {
  const { error } = await supabase.from('staff_profiles').update(updates).eq('id', id)
  if (error) throw error
}
