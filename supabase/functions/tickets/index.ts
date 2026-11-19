// Bilety z panelu: wystawienie (sprzedaż ręczna / zaproszenie), ponowna wysyłka, PDF do pobrania, e-maile testowe.
import { caller, cors, json, service } from '../_shared/auth.ts'
import { issueOrder, sendTickets } from '../_shared/issue.ts'
import { FROM, send, staffMail, ticketMail, welcomeMail, type MailOrder, type MailTicket } from '../_shared/mail.ts'
import { ticketsPdf } from '../_shared/pdf.ts'
import { b64, qrPng } from '../_shared/qr.ts'
import { PANEL_URL, SITE_URL, isoDate, loadSite, tr } from '../_shared/site.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const me = await caller(req)
    if (!me.role) return json({ error: 'forbidden' }, 403)
    const b = await req.json()
    const db = service()
    const sell = ['admin', 'tickets'].includes(me.role)

    if (b.action === 'issue') {
      if (!sell) return json({ error: 'forbidden' }, 403)
      const kind = b.kind === 'invitation' ? 'invitation' : 'manual'
      const r = await issueOrder(db, { buyer: b.buyer, items: b.items, kind, locale: b.locale, note: b.note, send: b.send !== false, createdBy: me.id })
      await db.from('audit_log').insert({ user_id: me.id, user_email: me.email, action: 'create', entity: 'order', entity_key: r.order.number, summary: `${kind === 'invitation' ? 'Zaproszenie' : 'Bilety'}: ${r.tickets.length} szt. dla ${r.order.buyer_email}` })
      return json({ order: r.order, tickets: r.tickets, mailed: r.mailed })
    }

    if (b.action === 'resend' || b.action === 'pdf') {
      if (!(sell || (b.action === 'pdf' && ['reports', 'sales'].includes(me.role)))) return json({ error: 'forbidden' }, 403)
      const { data: o } = await db.from('orders').select('*').eq('id', b.id).single()
      if (!o) return json({ error: 'Nie ma takiego zamówienia.' }, 404)
      const { data: ts } = await db.from('tickets').select('code,type_name,valid_dates,catering,holder_name,price').eq('order_id', o.id).eq('status', 'valid').order('created_at')
      const site = await loadSite(db)
      const mo: MailOrder = { number: o.number, kind: o.kind, buyer_name: o.buyer_name, buyer_email: b.to || o.buyer_email, total: Number(o.total), locale: o.locale, items: o.items ?? [] }
      if (b.action === 'pdf') return json({ pdf: b64(await ticketsPdf(site, mo, (ts ?? []) as MailTicket[])), filename: `bilety-${o.number}.pdf` })
      const r = await sendTickets(db, site, mo, (ts ?? []) as MailTicket[], o.id)
      return r.error ? json({ error: r.error }, 502) : json({ ok: true })
    }

    // Podgląd wszystkich e-maili na adres osoby zalogowanej (bez zapisu w bazie).
    if (b.action === 'test') {
      if (me.role !== 'admin') return json({ error: 'forbidden' }, 403)
      const to = me.email!
      const site = await loadSite(db)
      const t0 = site.tickets.find((t) => t.days === 2) ?? site.tickets[0]
      const sample: MailTicket[] = [
        { code: 'TEST1-PODGL', type_name: tr(t0?.name, 'pl') || 'Bilet dwudniowy', valid_dates: site.ticketDays.map((d) => isoDate(d.date)), catering: true, holder_name: 'Anna Nowak', price: 129 },
      ]
      const mo: MailOrder = { number: 'BH-TEST', kind: 'manual', buyer_name: 'Anna Nowak', buyer_email: to, total: sample[0].price, locale: 'pl', items: [{ label: sample[0].type_name + ' + Catering', qty: 1, sum: sample[0].price }] }
      const which: string[] = b.which ?? ['ticket', 'welcome', 'staff']
      const out: Record<string, string> = {}
      if (which.includes('ticket')) {
        const m = ticketMail(site, mo, sample)
        const pdf = await ticketsPdf(site, mo, sample)
        const r = await send({ from: FROM.tickets, to: [to], subject: `[TEST] ${m.subject}`, html: m.html, attachments: [{ filename: 'bilety-BH-TEST.pdf', content: b64(pdf), content_type: 'application/pdf' }, { filename: 'qr.png', content: b64(await qrPng(`${SITE_URL}/bilet/?k=${sample[0].code}`, 8)), content_id: `qr-${sample[0].code}`, content_type: 'image/png' }] })
        out.ticket = r.error ?? 'ok'
      }
      if (which.includes('welcome')) {
        const m = welcomeMail(site, 'pl', 'professional', `${SITE_URL}/`)
        out.welcome = (await send({ from: FROM.hello, to: [to], subject: `[TEST] ${m.subject}`, html: m.html })).error ?? 'ok'
      }
      if (which.includes('staff')) {
        const m = staffMail(site, '[TEST] Sprzedano 1 bilet · 129 zł', [['Zamówienie', 'BH-TEST'], ['Kupujący', 'Anna Nowak'], ['Bilety', '1 × Bilet dwudniowy']], { href: `${PANEL_URL}#/orders`, label: 'Zobacz w panelu' })
        out.staff = (await send({ from: FROM.system, to: [to], ...m })).error ?? 'ok'
      }
      return json({ to, ...out })
    }
    return json({ error: 'unknown action' }, 400)
  } catch (e) {
    console.error(e)
    return json({ error: String((e as Error).message ?? e) }, 500)
  }
})
