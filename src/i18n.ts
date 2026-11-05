export type Locale = 'pl' | 'en'
export const LOCALES: Locale[] = ['pl', 'en']

/** Teksty w dwóch językach. */
export type T = { pl: string; en: string }
export const t = (v: T, l: Locale) => v[l]

export type PageKey =
  | 'home'
  | 'about'
  | 'program'
  | 'tickets'
  | 'exhibitors'
  | 'exhibit'
  | 'zone'
  | 'partners'
  | 'media'
  | 'news'
  | 'post'
  | 'visit'
  | 'contact'
  | 'terms'
  | 'privacy'

/** Adresy podstron w każdym języku. Nowy język = nowa kolumna. */
export const SLUGS: Record<PageKey, Record<Locale, string>> = {
  home: { pl: '', en: '' },
  about: { pl: 'o-targach', en: 'about' },
  program: { pl: 'program', en: 'programme' },
  tickets: { pl: 'bilety', en: 'tickets' },
  exhibitors: { pl: 'wystawcy', en: 'exhibitors' },
  exhibit: { pl: 'zostan-wystawca', en: 'exhibit' },
  zone: { pl: 'strefy', en: 'zones' },
  partners: { pl: 'partnerzy', en: 'partners' },
  media: { pl: 'media', en: 'media' },
  news: { pl: 'aktualnosci', en: 'news' },
  post: { pl: 'aktualnosci', en: 'news' },
  visit: { pl: 'informacje', en: 'visit' },
  contact: { pl: 'kontakt', en: 'contact' },
  terms: { pl: 'regulamin', en: 'terms' },
  privacy: { pl: 'polityka-prywatnosci', en: 'privacy' },
}

/** Ścieżka względem basename routera, np. href('en','zone','hair') -> /en/zones/hair */
export function href(l: Locale, key: PageKey, slug?: string): string {
  const parts = [l === 'pl' ? '' : l, SLUGS[key][l], slug].filter(Boolean)
  return '/' + parts.join('/')
}

export const ui = {
  nav: {
    about: { pl: 'O targach', en: 'About' },
    program: { pl: 'Program', en: 'Programme' },
    tickets: { pl: 'Bilety', en: 'Tickets' },
    exhibitors: { pl: 'Wystawcy', en: 'Exhibitors' },
    partners: { pl: 'Partnerzy', en: 'Partners' },
    news: { pl: 'Aktualności', en: 'News' },
    contact: { pl: 'Kontakt', en: 'Contact' },
  },
  buyTicket: { pl: 'Kup bilet', en: 'Buy a ticket' },
  becomeExhibitor: { pl: 'Zostań wystawcą', en: 'Become an exhibitor' },
  more: { pl: 'Zobacz więcej', en: 'See more' },
  readMore: { pl: 'Czytaj dalej', en: 'Read more' },
  seatsLeft: { pl: 'Zostało miejsc', en: 'Seats left' },
  soldOut: { pl: 'Wyprzedane', en: 'Sold out' },
  ad: { pl: 'Reklama', en: 'Advertisement' },
  menu: { pl: 'Menu', en: 'Menu' },
  close: { pl: 'Zamknij', en: 'Close' },
  days: { pl: 'dni', en: 'days' },
  hours: { pl: 'godz.', en: 'hrs' },
  minutes: { pl: 'min', en: 'min' },
  sample: {
    pl: 'Wersja robocza — teksty, ceny i zdjęcia są przykładowe.',
    en: 'Draft — texts, prices and photos are placeholders.',
  },
} satisfies Record<string, unknown>
