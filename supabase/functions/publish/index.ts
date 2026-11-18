// Publikacja: zapisuje migawkę treści (RPC publish_site) i uruchamia build strony w GitHub Actions.
// Sekrety: GH_DISPATCH_TOKEN (fine-grained, Actions: write), GH_REPO ("owner/repo"), GH_WORKFLOW (domyślnie deploy.yml).
import { caller, cors, json } from '../_shared/auth.ts'

const repo = () => Deno.env.get('GH_REPO') ?? 'damian-barabash/Targi'
const workflow = () => Deno.env.get('GH_WORKFLOW') ?? 'deploy.yml'
const gh = (path: string, init: RequestInit = {}) =>
  fetch(`https://api.github.com/repos/${repo()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${Deno.env.get('GH_DISPATCH_TOKEN')}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'expo-admin',
      ...(init.headers ?? {}),
    },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { db, role } = await caller(req)
    if (!role) return json({ error: 'forbidden' }, 403)
    const body = await req.json().catch(() => ({}))
    const hasToken = Boolean(Deno.env.get('GH_DISPATCH_TOKEN'))

    if (body.action === 'status') {
      if (!hasToken) return json({ configured: false, runs: [] })
      const res = await gh(`/actions/workflows/${workflow()}/runs?per_page=5`)
      if (!res.ok) return json({ configured: true, error: `github ${res.status}`, runs: [] })
      const data = await res.json()
      return json({
        configured: true,
        runs: (data.workflow_runs ?? []).map((r: Record<string, unknown>) => ({
          id: r.id,
          status: r.status,
          conclusion: r.conclusion,
          event: r.event,
          created_at: r.created_at,
          updated_at: r.updated_at,
          url: r.html_url,
        })),
      })
    }

    if (role === 'reports') return json({ error: 'forbidden' }, 403)
    const { data: snapshot, error } = await db.rpc('publish_site', { p_note: body.note ?? null })
    if (error) return json({ error: error.message }, 400)
    if (!hasToken) return json({ snapshot, dispatched: false, reason: 'no_token' })
    const res = await gh(`/actions/workflows/${workflow()}/dispatches`, { method: 'POST', body: JSON.stringify({ ref: 'main' }) })
    return json({ snapshot, dispatched: res.ok, reason: res.ok ? null : `github ${res.status}: ${(await res.text()).slice(0, 200)}` })
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500)
  }
})
