// Kształt treści strony. Ten sam JSON: wersja robocza w panelu → migawka po publikacji → build.
import type { T } from '../i18n'

export type Btn = { label: T; link: string; variant?: 'dark' | 'light' | 'outline' | 'gold' }

export type EventInfo = {
  brand: string
  edition: string
  startsAt: string
  dates: T
  datesShort: string
  hours: string
  venue: string
  city: T
  address: string
  organizer: string
  emails: Record<'kontakt' | 'wystawcy' | 'bilety' | 'partnerzy' | 'media' | 'vip', string>
}

export type TicketType = {
  id: string
  name: T
  price: number
  note: T
  perks: T[]
  featured?: boolean
  /** ile dni obejmuje bilet (1 = wybór dnia w konfiguratorze) */
  days: 1 | 2
  cateringIncluded?: boolean
  /** czy skaner wpuszcza ponownie tego samego dnia (domyślnie tak) */
  reentry?: boolean
  active?: boolean
  /** limit sztuk i okno sprzedaży — egzekwowane po podłączeniu płatności */
  limit?: number
  saleFrom?: string
  saleTo?: string
}
export type TicketDay = { id: string; label: T; date: string }
export type Catering = { pricePerDay: number; name: T; desc: T }
export type PromoCode = { code: string; kind: 'percent' | 'amount'; value: number; limit?: number; from?: string; to?: string; active?: boolean }
export type Face = { name: string; role: T; img: string }
export type Zone = { slug: T; name: T; short: string; img: string; lead: T; partner: string }
export type Masterclass = { id: string; title: T; host: string; day: T; time: string; price: number; seats: number; left: number; img: string }
export type Expert = { name: string; role: T; img: string }
export type ProgramItem = { time: string; title: T; stage: T; host?: string; zone?: string }
export type ProgramDay = { day: T; date: string; items: ProgramItem[] }
export type Exhibitor = { name: string; category: T; stand: string; zone: string; logo?: string; url?: string; desc?: T }
export type PartnerTier = { tier: T; items: { name: string; logo?: string; url?: string }[] }
export type Post = { slug: string; title: T; date: string; img: string; excerpt: T; body: T; draft?: boolean; /** fraza kluczowa (tylko do oceny SEO w panelu) */ keyword?: T }
export type Faq = { q: T; a: T }
export type Stat = { value: string; label: T }

/** Kreacja reklamowa. format: bar = pasek partnera, wide = 1200×300, tile = 600×600, banner = baner z tłem. */
export type Banner = {
  id: string
  brand: string
  format: 'bar' | 'wide' | 'tile' | 'banner'
  style?: 'gold' | 'dark' | 'photo'
  kicker: T
  claim: T
  cta: T
  url: string
  img?: string
  slots: string[]
  from?: string
  to?: string
  active?: boolean
  weight?: number
}

export type NavItem = { label: T; link: string }
export type Nav = {
  left: NavItem[]
  right: NavItem[]
  footer: { title: T; links: NavItem[] }[]
}

export type Settings = {
  logoText: string
  logoSub: string
  logoImg?: string
  ogImage: string
  social: { name: string; url: string }[]
  footerNote: T
  partnerStrip: boolean
  tracking: boolean
}

export type Block = { id: string; type: string; hidden?: boolean; props: Record<string, any> }
export type PageDoc = {
  id: string
  system?: boolean
  slug: T
  title: T
  seo: { title: T; description: T; image?: string }
  plain?: boolean
  order: number
  blocks: Block[]
}

export type SiteData = {
  event: EventInfo
  stats: Stat[]
  tickets: TicketType[]
  ticketDays: TicketDay[]
  catering: Catering
  promoCodes?: PromoCode[]
  faces: Face[]
  zones: Zone[]
  masterclasses: Masterclass[]
  experts: Expert[]
  program: ProgramDay[]
  exhibitors: Exhibitor[]
  partners: PartnerTier[]
  posts: Post[]
  faq: Faq[]
  banners: Banner[]
  nav: Nav
  settings: Settings
  pages: PageDoc[]
  edition?: { id: string; name: string; year: number } | null
  publishedAt?: string
}

/** Sekcje zależne od edycji (reszta jest wspólna). */
export const EDITION_KEYS = ['event', 'stats', 'tickets', 'ticketDays', 'catering', 'promoCodes', 'faces', 'zones', 'masterclasses', 'experts', 'program', 'exhibitors', 'partners'] as const
export const GLOBAL_KEYS = ['posts', 'faq', 'banners', 'nav', 'settings'] as const
