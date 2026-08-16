import { supabase } from './supabase'

export async function generatePackageSuggestions(brief) {
  const { data: tests } = await supabase
    .from('individual_tests')
    .select('id, name, price, category')
    .eq('is_active', true)
  const { data, error } = await supabase.functions.invoke('generate-packages', {
    body: { brief, tests: tests || [] },
  })
  if (error) throw error
  return data
}

export async function fetchPendingSuggestions() {
  const { data, error } = await supabase
    .from('package_suggestions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

/** Approving copies the suggestion into the real, customer-visible packages table. */
export async function approveSuggestion(suggestion) {
  const { error: insertError } = await supabase.from('packages').insert({
    name: suggestion.name,
    description: suggestion.description,
    price: suggestion.price,
    included_tests: suggestion.included_tests,
    is_active: true,
  })
  if (insertError) throw insertError

  const { error: updateError } = await supabase
    .from('package_suggestions')
    .update({ status: 'approved' })
    .eq('id', suggestion.id)
  if (updateError) throw updateError
}

export async function rejectSuggestion(id) {
  const { error } = await supabase.from('package_suggestions').update({ status: 'rejected' }).eq('id', id)
  if (error) throw error
}
