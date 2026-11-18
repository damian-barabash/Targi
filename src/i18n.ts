export type Locale = 'pl' | 'en'
export const LOCALES: Locale[] = ['pl', 'en']

/** Teksty w dwóch językach. */
export type T = { pl: string; en: string }
export const t = (v: T, l: Locale) => v[l]

export const ui = {
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
