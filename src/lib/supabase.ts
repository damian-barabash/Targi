// Zapisy z formularzy do Supabase przez REST (bez supabase-js — mniejszy bundle).
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export async function insertRow(table: 'leads' | 'newsletter_subscribers', row: Record<string, unknown>) {
  if (!URL || !KEY) throw new Error('Supabase is not configured')
  const res = await fetch(`${URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  })
  // 409 = ten e-mail jest już zapisany do tej grupy — traktujemy jako sukces
  if (!res.ok && res.status !== 409) throw new Error(`HTTP ${res.status}`)
}
