// Wystawienie zamówienia z biletami: zapis w bazie → CRM → e-mail z PDF i QR → powiadomienie zespołu.
// Używa tego panel (sprzedaż ręczna, zaproszenia), a później webhook płatności (Przelewy24 / PayU).
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.118.0'
import { FROM, send, staffMail, ticketMail, type MailOrder, type MailTicket } from './mail.ts'
import { ticketsPdf } from './pdf.ts'
import { b64, qrPng } from './qr.ts'
import { PANEL_URL, SITE_URL, isoDate, loadNotify, loadSite, money, tr, type Site } from './site.ts'

export type Buyer = { name: string; email: string; phone?: string; company?: string; nip?: string }
export type Item = { type: string; day?: string; catering?: boolean; qty: number; holders?: string[] }
export type IssueInput = { buyer: Buyer; items: Item[]; kind: 'sale' | 'manual' | 'invitation'; locale?: 'pl' | 'en'; note?: string; paymentRef?: string; send?: boolean; createdBy?: string | null }

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function newCode() {
  const r = crypto.getRandomValues(new Uint8Array(10))
  const s = Array.from(r, (b) => ALPHA[b % ALPHA.length]).join('')
  return `${s.slice(0, 5)}-${s.slice(5)}`
}

export async function issueOrder(db: SupabaseClient, input: IssueInput) {
  const site = await loadSite(db)
  const l = input.locale === 'en' ? 'en' : 'pl'
  const email = input.buyer.email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Nieprawidłowy e-mail kupującego.')
  if (!input.items?.length) throw new Error('Brak biletów w zamówieniu.')
  const free = input.kind === 'invitation'

  const lines: { label: string; qty: number; sum: number }[] = []
  const tRows: { type_id: string; type_name: string; valid_dates: string[]; catering: boolean; reentry: boolean; holder_name: string | null; price: number }[] = []
  for (const it of input.items) {
    const type = site.tickets.find((x) => x.id === it.type)
    if (!type) throw new Error(`Nieznany rodzaj biletu: ${it.type}`)
    const qty = Math.max(1, Math.min(50, Math.floor(it.qty || 1)))
    let dates: string[]
    let dayLabel = ''
    if (type.days === 2) dates = site.ticketDays.map((d) => isoDate(d.date))
    else {
      const d = site.ticketDays.find((x) => x.id === it.day) ?? site.ticketDays[0]
      if (!d) throw new Error('Brak dni targów w danych wydarzenia.')
      dates = [isoDate(d.date)]
      dayLabel = tr(d.label, l)
    }
    const catering = Boolean(type.cateringIncluded || it.catering)
    const unit = free ? 0 : type.price + (it.catering && !type.cateringIncluded ? site.catering.pricePerDay * dates.length : 0)
    const name = tr(type.name, l) + (dayLabel ? ` · ${dayLabel}` : '')
    lines.push({ label: name + (it.catering && !type.cateringIncluded ? ` + ${tr(site.catering.name, l)}` : ''), qty, sum: unit * qty })
    for (let i = 0; i < qty; i++)
      tRows.push({ type_id: type.id, type_name: name, valid_dates: dates, catering, reentry: type.reentry !== false, holder_name: it.holders?.[i]?.trim() || null, price: unit })
  }
  const total = lines.reduce((s, x) => s + x.sum, 0)

  const { data: order, error } = await db
    .from('orders')
    .insert({
      edition_id: site.editionId, status: 'paid', kind: input.kind, buyer_name: input.buyer.name?.trim() ?? '', buyer_email: email,
      buyer_phone: input.buyer.phone?.trim() || null, company: input.buyer.company?.trim() || null, nip: input.buyer.nip?.replace(/[^0-9A-Za-z]/g, '') || null,
      total, items: lines, locale: l, payment_ref: input.paymentRef ?? null, paid_at: new Date().toISOString(), note: input.note?.slice(0, 1000) || null, created_by: input.createdBy ?? null,
    })
    .select('*')
    .single()
  if (error) throw error

  // kody: losowe, przy kolizji nowa próba
  const tickets: (MailTicket & { id: string })[] = []
  for (const r of tRows) {
    for (let a = 0; a < 5; a++) {
      const { data, error: e } = await db.from('tickets').insert({ ...r, order_id: order.id, code: newCode() }).select('id,code,type_name,valid_dates,catering,holder_name,price').single()
      if (!e) {
        tickets.push(data as any)
        break
      }
      if (!/duplicate|23505/.test(e.message) || a === 4) throw e
    }
  }

  // CRM
  const summary = `${order.number}: ${lines.map((x) => `${x.qty} × ${x.label}`).join(', ')}${free ? ' (zaproszenie)' : ` · ${money(total)}`}`
  const { data: cid } = await db.rpc('crm_record_order', { p_email: email, p_name: input.buyer.name ?? '', p_phone: input.buyer.phone ?? null, p_company: input.buyer.company ?? null, p_nip: input.buyer.nip ?? null, p_total: total, p_ref: order.id, p_summary: summary, p_locale: l })
  if (cid) await db.from('orders').update({ contact_id: cid }).eq('id', order.id)

  const mo: MailOrder = { number: order.number, kind: order.kind, buyer_name: order.buyer_name, buyer_email: email, total, locale: l, items: lines }
  let mailed: { id?: string; error?: string } = {}
  if (input.send !== false) mailed = await sendTickets(db, site, mo, tickets, order.id)
  await notifyStaff(db, site, mo, tickets.length, order.id)
  return { order: { ...order, contact_id: cid ?? null }, tickets, mailed }
}

export async function sendTickets(db: SupabaseClient, site: Site, o: MailOrder, tickets: MailTicket[], orderId: string) {
  const notify = await loadNotify(db)
  const pdf = await ticketsPdf(site, o, tickets)
  const { subject, html } = ticketMail(site, o, tickets)
  const qrs = await Promise.all(tickets.map(async (t) => ({ filename: `qr-${t.code}.png`, content: b64(await qrPng(`${SITE_URL}/bilet/?k=${t.code}`, 8)), content_id: `qr-${t.code}`, content_type: 'image/png' })))
  const r = await send({
    from: FROM.tickets, to: [o.buyer_email], reply_to: notify.replyTo, subject, html,
    attachments: [{ filename: `${o.locale === 'pl' ? 'bilety' : 'tickets'}-${o.number}.pdf`, content: b64(pdf), content_type: 'application/pdf' }, ...qrs],
  })
  if (r.id) await db.from('orders').update({ emailed_at: new Date().toISOString() }).eq('id', orderId)
  return r
}

async function notifyStaff(db: SupabaseClient, site: Site, o: MailOrder, n: number, orderId: string) {
  const notify = await loadNotify(db)
  if (!notify.ticket.length) return
  const inv = o.kind === 'invitation'
  const m = staffMail(
    site,
    inv ? `Wystawiono zaproszenie: ${o.buyer_name || o.buyer_email}` : `Sprzedano ${n} ${n === 1 ? 'bilet' : n < 5 ? 'bilety' : 'biletów'} · ${money(o.total)}`,
    [
      ['Zamówienie', o.number],
      ['Kupujący', o.buyer_name],
      ['E-mail', o.buyer_email],
      ['Bilety', o.items.map((x) => `${x.qty} × ${x.label}`).join('\n')],
      ['Kwota', inv ? 'zaproszenie (0 zł)' : money(o.total)],
    ],
    { href: `${PANEL_URL}#/orders/${orderId}`, label: 'Zobacz w panelu' },
  )
  await send({ from: FROM.system, to: notify.ticket, ...m })
}
