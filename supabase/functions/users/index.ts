// Konta panelu: tylko administrator. Konta tworzy się tutaj (rejestracja na stronie jest wyłączona).
import { caller, cors, json, service } from '../_shared/auth.ts'

const ROLES = ['admin', 'exhibitors', 'tickets', 'marketing', 'reports', 'scanner', 'sales']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const me = await caller(req)
    if (me.role !== 'admin') return json({ error: 'forbidden' }, 403)
    const b = await req.json().catch(() => ({}))
    const sv = service()
    const log = (action: string, key: string, summary: string) =>
      sv.from('audit_log').insert({ user_id: me.id, user_email: me.email, action, entity: 'user', entity_key: key, summary })

    if (b.action === 'create') {
      const email = String(b.email ?? '').trim().toLowerCase()
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !ROLES.includes(b.role) || String(b.password ?? '').length < 8)
        return json({ error: 'Podaj poprawny e-mail, rolę i hasło (min. 8 znaków).' }, 400)
      const { data, error } = await sv.auth.admin.createUser({ email, password: b.password, email_confirm: true })
      if (error) return json({ error: error.message }, 400)
      await sv.from('profiles').insert({ id: data.user.id, email, name: String(b.name ?? '').slice(0, 120), role: b.role })
      await log('create', email, `rola: ${b.role}`)
      return json({ id: data.user.id })
    }

    if (b.action === 'update') {
      const patch: Record<string, unknown> = {}
      if (typeof b.name === 'string') patch.name = b.name.slice(0, 120)
      if (ROLES.includes(b.role)) patch.role = b.role
      if (typeof b.active === 'boolean') patch.active = b.active
      if (b.id === me.id && (patch.role && patch.role !== 'admin' || patch.active === false))
        return json({ error: 'Nie możesz odebrać uprawnień własnemu kontu.' }, 400)
      const { data, error } = await sv.from('profiles').update(patch).eq('id', b.id).select('email').single()
      if (error) return json({ error: error.message }, 400)
      if (b.password) {
        if (String(b.password).length < 8) return json({ error: 'Hasło: min. 8 znaków.' }, 400)
        const r = await sv.auth.admin.updateUserById(b.id, { password: b.password })
        if (r.error) return json({ error: r.error.message }, 400)
      }
      await log('update', data.email, Object.entries(patch).map(([k, v]) => `${k}: ${v}`).join(', ') + (b.password ? ', nowe hasło' : ''))
      return json({ ok: true })
    }

    if (b.action === 'delete') {
      if (b.id === me.id) return json({ error: 'Nie możesz usunąć własnego konta.' }, 400)
      const { data } = await sv.from('profiles').select('email').eq('id', b.id).single()
      const { error } = await sv.auth.admin.deleteUser(b.id)
      if (error) return json({ error: error.message }, 400)
      await log('delete', data?.email ?? b.id, '')
      return json({ ok: true })
    }
    return json({ error: 'unknown action' }, 400)
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500)
  }
})
