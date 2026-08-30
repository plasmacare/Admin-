import { supabase } from './supabase'

export async function fetchViewStats() {
  const { data, error } = await supabase.rpc('page_view_stats').single()
  if (error) throw error
  return data
}

export async function fetchViewsByCity() {
  const { data, error } = await supabase.rpc('page_views_by_city')
  if (error) throw error
  return data || []
}

export async function fetchTotalBookingsCount() {
  const { count, error } = await supabase.from('bookings').select('id', { count: 'exact', head: true })
  if (error) throw error
  return count || 0
}

/** Subscribes to the customer site's "site-viewers" Presence channel and reports the live count whenever it changes. Returns an unsubscribe function. */
export function subscribeLiveViewerCount(onCount) {
  const channel = supabase.channel('site-viewers', { config: { presence: {} } })
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      onCount(Object.keys(state).length)
    })
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

export async function fetchSiteSettings() {
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single()
  if (error) throw error
  return data
}

export async function updateSiteSettings(fields) {
  const { error } = await supabase.from('site_settings').update(fields).eq('id', 1)
  if (error) throw error
}
