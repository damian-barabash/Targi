// Dane aktualnej edycji (z wersji roboczej treści) i ustawienia powiadomień — dla e-maili i biletów.
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.118.0'

export type T = { pl: string; en: string }
export type TicketType = { id: string; name: T; price: number; days: 1 | 2; cateringIncluded?: boolean; reentry?: boolean; active?: boolean; note?: T }
export type TicketDay = { id: string; label: T; date: string }
export type EventData = { brand: string; edition: string; dates: T; datesShort: string; hours: string; venue: string; address: string; city: T; organizer: string; startsAt: string }
export type Site = { editionId: string | null; event: EventData; tickets: TicketType[]; ticketDays: TicketDay[]; catering: { pricePerDay: number; name: T } }
export type Notify = { ticket: string[]; lead: string[]; newsletter: string[]; welcome: boolean; replyTo: string }

export const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://ohtargi.pl').replace(/\/$/, '')
export const PANEL_URL = `${SITE_URL}/admin/`

const DEF_EVENT: EventData = {
  brand: 'Beauty & Hair Expo', edition: 'Rzeszów 2028', dates: { pl: '19-20 lutego 2028', en: '19-20 February 2028' }, datesShort: '19-20.02.2028',
  hours: '10:00-18:00', venue: 'ZEN.COM Expo', address: 'Jasionka 953, 36-002 Jasionka', city: { pl: 'Jasionka k. Rzeszowa', en: 'Jasionka near Rzeszów' },
  organizer: 'Fundacja Wielkie Serce dla Dzieci', startsAt: '2028-02-19T10:00:00+01:00',
}

export async function loadSite(db: SupabaseClient): Promise<Site> {
  const { data: ed } = await db.from('editions').select('id').eq('is_current', true).maybeSingle()
  const keys = ['event', 'tickets', 'ticketDays', 'catering']
  const { data } = ed ? await db.from('content').select('key,data').eq('scope', ed.id).in('key', keys) : { data: [] as { key: string; data: unknown }[] }
  const m = Object.fromEntries((data ?? []).map((r) => [r.key, r.data])) as Record<string, any>
  return {
    editionId: ed?.id ?? null,
    event: { ...DEF_EVENT, ...(m.event ?? {}) },
    tickets: m.tickets ?? [],
    ticketDays: m.ticketDays ?? [],
    catering: m.catering ?? { pricePerDay: 0, name: { pl: 'Catering', en: 'Catering' } },
  }
}

export async function loadNotify(db: SupabaseClient): Promise<Notify> {
  const { data } = await db.from('app_settings').select('value').eq('key', 'notify').maybeSingle()
  const v = (data?.value ?? {}) as Partial<Notify>
  const list = (x: unknown) => (Array.isArray(x) ? x.map(String).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) : [])
  return { ticket: list(v.ticket), lead: list(v.lead), newsletter: list(v.newsletter), welcome: v.welcome !== false, replyTo: v.replyTo || 'kontakt@ohtargi.pl' }
}

/** „19.02.2028” → „2028-02-19”. */
export const isoDate = (d: string) => {
  const m = d.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : d.slice(0, 10)
}
/** „2028-02-19” → „sobota, 19 lutego 2028”. */
export function dayText(iso: string, l: 'pl' | 'en', withYear = true) {
  const d = new Date(`${iso}T12:00:00Z`)
  return d.toLocaleDateString(l === 'pl' ? 'pl-PL' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: withYear ? 'numeric' : undefined, timeZone: 'Europe/Warsaw' })
}
export const money = (v: number, l: 'pl' | 'en' = 'pl') => (l === 'pl' ? `${v.toLocaleString('pl-PL', { minimumFractionDigits: v % 1 ? 2 : 0 })} zł` : `PLN ${v.toLocaleString('en-GB', { minimumFractionDigits: v % 1 ? 2 : 0 })}`)
export const tr = (x: T | string | undefined, l: 'pl' | 'en') => (typeof x === 'string' ? x : (x?.[l] || x?.pl || ''))
