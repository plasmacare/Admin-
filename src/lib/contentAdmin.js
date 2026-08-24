import { supabase } from './supabase'

/* ---------- Legal pages ---------- */
export async function fetchLegalPages() {
  const { data, error } = await supabase.from('legal_pages').select('*').order('slug')
  if (error) throw error
  return data || []
}
export async function updateLegalPage(id, fields) {
  const { error } = await supabase.from('legal_pages').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
export async function addLegalPage({ slug, title }) {
  const { error } = await supabase.from('legal_pages').insert({ slug, title, content: '' })
  if (error) throw error
}

/* ---------- Announcements ---------- */
export async function fetchAnnouncements() {
  const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
export async function addAnnouncement({ title, message, ctaText, ctaLink, imageUrl }) {
  const { error } = await supabase.from('announcements').insert({
    title, message, cta_text: ctaText || null, cta_link: ctaLink || null, image_url: imageUrl || null, is_active: false,
  })
  if (error) throw error
}
/** Uploads a poster image for an announcement popup and returns its public URL. */
export async function uploadAnnouncementPoster(file) {
  const path = `${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase.storage.from('announcement-posters').upload(path, file, { upsert: true })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from('announcement-posters').getPublicUrl(path)
  return data.publicUrl
}
export async function updateAnnouncement(id, fields) {
  const { error } = await supabase.from('announcements').update(fields).eq('id', id)
  if (error) throw error
}
export async function deleteAnnouncement(id) {
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) throw error
}
/** Only one announcement should be live at a time — activating one turns the others off. */
export async function setActiveAnnouncement(id) {
  const { error: offError } = await supabase.from('announcements').update({ is_active: false }).neq('id', id)
  if (offError) throw offError
  const { error: onError } = await supabase.from('announcements').update({ is_active: true }).eq('id', id)
  if (onError) throw onError
}
