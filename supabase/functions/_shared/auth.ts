// Wspólne: CORS + sprawdzenie, kim jest wywołujący (rola z tabeli profiles).
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** Klient działający w imieniu zalogowanego użytkownika + jego rola (null = brak dostępu). */
export async function caller(req: Request): Promise<{ db: SupabaseClient; role: string | null; id: string | null; email: string | null }> {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
  const { data: user } = await db.auth.getUser()
  const { data: role } = await db.rpc('my_role')
  return { db, role: (role as string | null) ?? null, id: user.user?.id ?? null, email: user.user?.email ?? null }
}

export const service = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
