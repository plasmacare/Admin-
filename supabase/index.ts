// Supabase Edge Function: generate-packages
// Admin-only (called from the admin panel). Takes the test catalog plus
// whatever margin/theme brief the admin typed, asks Claude to draft a
// few package ideas, and stores them as 'pending' in package_suggestions
// — nothing here ever becomes customer-visible until an admin approves
// it from the Admin panel, which copies it into the real `packages` table.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const MODEL = 'claude-sonnet-5'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { brief, tests } = await req.json()
    // brief: free-text from admin, e.g. "Weekend package, 40% margin,
    // built around our blood tests. Weekday package for office-goers,
    // fast turnaround, 25% margin."

    const catalogText = (tests || [])
      .map((t: { id: string; name: string; price: number; category?: string }) =>
        `${t.id}: ${t.name} — ₹${t.price}${t.category ? ` (${t.category})` : ''}`)
      .join('\n')

    const prompt = `You are helping a diagnostics lab design health test packages from their existing individual test catalog.

Catalog (id: name — price):
${catalogText}

Admin's brief:
${brief}

Design 1-4 packages based on the brief. For each, bundle sensible, related tests from the catalog above (using their real IDs — never invent an ID), and price the bundle with a reasonable discount vs. buying the tests separately, consistent with any margin guidance in the brief.

Respond with ONLY a JSON array (no markdown, no other text), each item shaped exactly like:
{
  "name": "<package name>",
  "description": "<one sentence, customer-facing>",
  "theme": "<short tag, e.g. weekend / weekday / occasional / seasonal>",
  "includedTestIds": [<catalog test IDs actually in this package>],
  "price": <number, final bundle price in INR>,
  "rationale": "<one sentence explaining the pricing/margin logic, for the admin only>"
}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'AI request failed', details: data }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const text = data?.content?.find((c: { type: string }) => c.type === 'text')?.text ?? '[]'
    let suggestions: Array<{
      name: string; description: string; theme: string
      includedTestIds: string[]; price: number; rationale: string
    }>
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      suggestions = JSON.parse(jsonMatch ? jsonMatch[0] : text)
    } catch {
      return new Response(JSON.stringify({ error: 'Could not parse AI response', raw: text }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const rows = suggestions.map((s) => ({
      name: s.name,
      description: s.description,
      price: s.price,
      included_tests: s.includedTestIds || [],
      theme: s.theme || null,
      ai_rationale: s.rationale || null,
      status: 'pending',
    }))

    const { data: inserted, error } = await supabase.from('package_suggestions').insert(rows).select()
    if (error) throw error

    return new Response(JSON.stringify({ success: true, suggestions: inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err instanceof Error ? err.message : err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
