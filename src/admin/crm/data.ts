// CRM: typy, etykiety i drobne funkcje wspólne dla ekranów.
export type Contact = {
  id: string; created_at: string; updated_at: string; email: string | null; name: string; phone: string | null; position: string | null
  company_id: string | null; stage: string; tags: string[]; sources: string[]; newsletter: boolean; newsletter_segments: string[]
  orders_count: number; orders_total: number; locale: string; owner: string | null; notes: string | null
  next_action_at: string | null; next_action: string | null; last_activity_at: string
}
export type Company = {
  id: string; created_at: string; name: string; nip: string | null; kind: string; website: string | null; email: string | null; phone: string | null
  city: string | null; address: string | null; tags: string[]; owner: string | null; notes: string | null; last_activity_at: string
}
export type Activity = {
  id: string; created_at: string; contact_id: string | null; company_id: string | null; type: string; outcome: string | null; body: string | null
  due_at: string | null; done_at: string | null; assigned_to: string | null; created_by: string | null; created_email: string | null; ref: string | null
}

export const STAGE: Record<string, [string, 'gray' | 'blue' | 'gold' | 'green' | 'red']> = {
  new: ['Nowy', 'gray'],
  contacted: ['W kontakcie', 'blue'],
  interested: ['Zainteresowany', 'gold'],
  client: ['Klient', 'green'],
  inactive: ['Nieaktywny', 'red'],
}
export const TAG: Record<string, string> = {
  newsletter: 'Newsletter',
  kupujacy: 'Kupujący',
  wystawca: 'Wystawca',
  partner: 'Partner',
  media: 'Media',
  kontakt: 'Kontakt',
  vip: 'VIP',
}
export const tagLabel = (t: string) => TAG[t] ?? t
export const COMPANY_KIND: Record<string, string> = {
  exhibitor: 'Wystawca',
  partner: 'Partner / sponsor',
  media: 'Media',
  salon: 'Salon',
  supplier: 'Dostawca',
  other: 'Inna',
}
export const SEGMENT: Record<string, string> = { visitor: 'Odwiedzający', professional: 'Specjaliści beauty', exhibitor: 'Wystawcy' }
export const SOURCE: Record<string, string> = {
  'form:exhibitor': 'Formularz wystawcy',
  'form:partner': 'Formularz partnera',
  'form:media': 'Akredytacja mediów',
  'form:contact': 'Formularz kontaktowy',
  newsletter: 'Newsletter',
  order: 'Zakup biletu',
  manual: 'Dodano ręcznie',
}
export const OUTCOME: Record<string, string> = {
  talked: 'Rozmawialiśmy',
  no_answer: 'Nie odebrał(a)',
  callback: 'Prosi o kontakt później',
  voicemail: 'Poczta głosowa',
  wrong_number: 'Błędny numer',
}
export const ACT: Record<string, { label: string; icon: string; tone: string }> = {
  note: { label: 'Notatka', icon: 'note', tone: 'ink' },
  call: { label: 'Rozmowa telefoniczna', icon: 'call', tone: 'green' },
  email: { label: 'E-mail', icon: 'mail', tone: 'blue' },
  meeting: { label: 'Spotkanie', icon: 'users', tone: 'violet' },
  task: { label: 'Zadanie', icon: 'clock', tone: 'gold' },
  lead: { label: 'Zgłoszenie z formularza', icon: 'inbox', tone: 'gold' },
  newsletter: { label: 'Newsletter', icon: 'send', tone: 'blue' },
  order: { label: 'Zamówienie', icon: 'cart', tone: 'green' },
  stage: { label: 'Zmiana etapu', icon: 'layers', tone: 'mute' },
  system: { label: 'System', icon: 'info', tone: 'mute' },
}

/** Czytelny opis wpisów, które tworzy baza (newsletter, etap, połączenie kart). */
export function actText(a: Activity): string {
  const b = a.body ?? ''
  if (a.type === 'newsletter') {
    const [k, seg] = b.split(':')
    return k === 'unsubscribe' ? `Wypis z newslettera (${SEGMENT[seg] ?? seg})` : `Zapis do newslettera · grupa: ${SEGMENT[seg] ?? seg}`
  }
  if (a.type === 'stage') {
    const [from, to] = b.split('→')
    return `${STAGE[from]?.[0] ?? from} → ${STAGE[to]?.[0] ?? to}`
  }
  if (a.type === 'system' && b.startsWith('merge:')) return `Połączono z drugą kartą: ${b.slice(6)}`
  return b
}

export const initials = (s: string) =>
  (s || '?')
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]!.toUpperCase())
    .join('') || '?'

/* ───────── daty zadań ───────── */
const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export function dueGroup(iso: string | null): 'none' | 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' {
  if (!iso) return 'none'
  const t = Date.parse(iso)
  const d0 = startOfDay().getTime()
  if (t < d0) return 'overdue'
  if (t < d0 + 86400e3) return 'today'
  if (t < d0 + 2 * 86400e3) return 'tomorrow'
  if (t < d0 + 7 * 86400e3) return 'week'
  return 'later'
}
export function dueText(iso: string | null): string {
  if (!iso) return 'bez terminu'
  const d = new Date(iso)
  const g = dueGroup(iso)
  const hm = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  if (g === 'today') return `dziś, ${hm}`
  if (g === 'tomorrow') return `jutro, ${hm}`
  const days = Math.round((startOfDay(d).getTime() - startOfDay().getTime()) / 86400e3)
  if (g === 'overdue') return days === -1 ? `wczoraj, ${hm}` : `${-days} dni temu`
  return d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' }) + `, ${hm}`
}
/** Szybkie terminy: jutro rano, za 3 dni, za tydzień… */
export function quickDue(k: 'today' | 'tomorrow' | 'd3' | 'week' | 'month'): string {
  const d = new Date()
  if (k === 'today') {
    d.setHours(Math.min(d.getHours() + 2, 19), 0, 0, 0)
  } else {
    d.setDate(d.getDate() + ({ tomorrow: 1, d3: 3, week: 7, month: 30 } as const)[k])
    d.setHours(10, 0, 0, 0)
  }
  return toLocalInput(d)
}
export const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
export const fromLocalInput = (s: string) => (s ? new Date(s).toISOString() : null)

export function dayLabel(iso: string) {
  const g = dueGroup(iso)
  const d = new Date(iso)
  const diff = Math.round((startOfDay().getTime() - startOfDay(d).getTime()) / 86400e3)
  if (g === 'today') return 'Dziś'
  if (diff === 1) return 'Wczoraj'
  return d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
}
