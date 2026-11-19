// Opis pól: bloki edytora wizualnego i sekcje danych (bilety, program, wystawcy…).
// Z tych opisów panel sam buduje formularze i tabele.
import type { T } from '../i18n'
import type { Block } from '../content/types'

export type Field = {
  name: string
  label: string
  /** t = tekst PL/EN, tarea = dłuższy tekst PL/EN, str/area = bez tłumaczenia */
  type: 't' | 'tarea' | 'str' | 'area' | 'num' | 'bool' | 'img' | 'link' | 'select' | 'list' | 'group' | 'date' | 'datetime' | 'slot' | 'slots'
  options?: { value: string | number; label: string }[] | 'zones' | 'emails'
  fields?: Field[]
  /** podpis pozycji listy */
  title?: (item: any, i: number) => string
  make?: () => any
  help?: string
  half?: boolean
  /** lista prostych tekstów PL/EN (bez pól wewnętrznych) */
  plainT?: boolean
  placeholder?: string
}

const T0 = (): T => ({ pl: '', en: '' })
const TT = (pl: string, en: string): T => ({ pl, en })
const btn = (name: string, label: string): Field => ({
  name,
  label,
  type: 'group',
  fields: [
    { name: 'label', label: 'Napis', type: 't', half: true },
    { name: 'link', label: 'Prowadzi do', type: 'link', half: true },
  ],
})
const HEAD: Field[] = [
  { name: 'title', label: 'Tytuł sekcji (duży)', type: 't', help: 'Najlepiej jedno słowo — tytuł zajmuje całą szerokość.' },
  { name: 'eyebrow', label: 'Nadtytuł', type: 't' },
  { name: 'text', label: 'Krótki opis po prawej', type: 't' },
  { name: 'more', label: 'Link po prawej', type: 'group', fields: [{ name: 'label', label: 'Napis', type: 't', half: true }, { name: 'link', label: 'Prowadzi do', type: 'link', half: true }] },
]
const head0 = (pl = 'Tytuł', en = 'Title') => ({ title: TT(pl, en), eyebrow: T0(), text: T0(), more: { label: T0(), link: '' } })
const TINT: Field = { name: 'tint', label: 'Tło w odcieniu beżu', type: 'bool' }
const ANCHOR: Field = { name: 'anchor', label: 'Kotwica (do linków #…)', type: 'str', help: 'Np. „bilety” — wtedy link „#bilety” przewija do tej sekcji.' }

export type BlockDef = {
  label: string
  group: 'Podstawowe' | 'Treść' | 'Targi' | 'Formularze i reklama'
  icon: string
  desc: string
  /** skąd blok bierze dane, jeśli nie z własnych pól */
  source?: { label: string; to: string }
  fields: Field[]
  make: () => Record<string, any>
}

export const BLOCK_DEFS: Record<string, BlockDef> = {
  pageHero: {
    label: 'Nagłówek strony', group: 'Podstawowe', icon: 'heading', desc: 'Duży tytuł, opis i szerokie zdjęcie',
    fields: [{ name: 'title', label: 'Tytuł', type: 't' }, { name: 'eyebrow', label: 'Nadtytuł', type: 't' }, { name: 'lead', label: 'Opis', type: 'tarea' }, { name: 'img', label: 'Zdjęcie', type: 'img', help: 'Zostaw puste, aby pokazać sam tytuł.' }, btn('btn', 'Przycisk')],
    make: () => ({ title: TT('Nowa strona', 'New page'), eyebrow: T0(), lead: T0(), img: '', btn: { label: T0(), link: '' } }),
  },
  split: {
    label: 'Tekst + zdjęcie', group: 'Podstawowe', icon: 'split', desc: 'Tekst z jednej strony, duże zdjęcie z drugiej',
    fields: [
      { name: 'kicker', label: 'Nadtytuł', type: 't' },
      { name: 'title', label: 'Tytuł', type: 't', help: 'Słowo w *gwiazdkach* zostanie wyróżnione kursywą.' },
      { name: 'text', label: 'Tekst', type: 'tarea', help: 'Pusta linia = nowy akapit.' },
      { name: 'list', label: 'Lista punktów', type: 'list', plainT: true, make: T0 },
      { name: 'facts', label: 'Fakty (etykieta + wartość)', type: 'list', fields: [{ name: 'k', label: 'Etykieta', type: 't', half: true }, { name: 'v', label: 'Wartość', type: 't', half: true }], title: (x) => x.k?.pl, make: () => ({ k: T0(), v: T0() }) },
      { name: 'img', label: 'Zdjęcie', type: 'img' },
      { name: 'reverse', label: 'Zdjęcie po lewej', type: 'bool' },
      { name: 'btn', label: 'Przycisk', type: 'group', fields: [{ name: 'label', label: 'Napis', type: 't', half: true }, { name: 'link', label: 'Prowadzi do', type: 'link', half: true }, { name: 'variant', label: 'Styl', type: 'select', options: [{ value: 'dark', label: 'Ciemny' }, { value: 'gold', label: 'Złoty' }, { value: 'outline', label: 'Obrys' }] }] },
      btn('more', 'Link tekstowy'),
    ],
    make: () => ({ kicker: T0(), title: TT('Tytuł sekcji', 'Section title'), text: TT('Tekst sekcji.', 'Section text.'), list: [], facts: [], img: 'event-stage', reverse: false, btn: { label: T0(), link: '', variant: 'dark' }, more: { label: T0(), link: '' } }),
  },
  text: {
    label: 'Tekst', group: 'Podstawowe', icon: 'text', desc: 'Tytuł i dłuższy tekst (regulaminy, artykuły)',
    fields: [{ name: 'title', label: 'Tytuł', type: 't' }, { name: 'body', label: 'Treść', type: 'tarea', help: 'Pusta linia = nowy akapit. Linia zaczynająca się od „## ” to śródtytuł.' }],
    make: () => ({ title: TT('Tytuł', 'Title'), body: TT('Treść…', 'Content…') }),
  },
  band: {
    label: 'Złoty pas z hasłem', group: 'Podstawowe', icon: 'band', desc: 'Pas na całą szerokość: hasło i dwa przyciski',
    fields: [{ name: 'kicker', label: 'Nadtytuł', type: 't' }, { name: 'text', label: 'Hasło', type: 'tarea' }, btn('btn1', 'Przycisk 1'), btn('btn2', 'Przycisk 2')],
    make: () => ({ kicker: T0(), text: TT('Hasło, które zostaje w głowie.', 'A line that sticks.'), btn1: { label: TT('Kup bilet', 'Buy a ticket'), link: 'page:tickets' }, btn2: { label: T0(), link: '' } }),
  },
  photoStrip: {
    label: 'Pas ze zdjęciem', group: 'Podstawowe', icon: 'image', desc: 'Wąskie zdjęcie na całą szerokość',
    fields: [{ name: 'img', label: 'Zdjęcie', type: 'img', help: 'Najlepiej szerokie, min. 2400 px.' }],
    make: () => ({ img: 'strip-show' }),
  },
  buttons: {
    label: 'Przyciski', group: 'Podstawowe', icon: 'button', desc: 'Jeden lub kilka przycisków na środku',
    fields: [{ name: 'items', label: 'Przyciski', type: 'list', title: (x) => x.label?.pl, make: () => ({ label: TT('Przycisk', 'Button'), link: '', variant: 'dark' }), fields: [{ name: 'label', label: 'Napis', type: 't', half: true }, { name: 'link', label: 'Prowadzi do', type: 'link', half: true }, { name: 'variant', label: 'Styl', type: 'select', options: [{ value: 'dark', label: 'Ciemny' }, { value: 'gold', label: 'Złoty' }, { value: 'outline', label: 'Obrys' }, { value: 'link', label: 'Link tekstowy' }] }] }],
    make: () => ({ items: [{ label: TT('Przycisk', 'Button'), link: '', variant: 'dark' }] }),
  },
  tiles: {
    label: 'Kafle ze zdjęciami', group: 'Treść', icon: 'grid', desc: 'Siatka 4 zdjęć z podpisami i linkami',
    fields: [{ name: 'items', label: 'Kafle', type: 'list', title: (x) => x.name?.pl, make: () => ({ img: 'event-booth', name: TT('Nazwa', 'Name'), meta: T0(), link: '' }), fields: [{ name: 'img', label: 'Zdjęcie', type: 'img' }, { name: 'name', label: 'Nazwa', type: 't', half: true }, { name: 'meta', label: 'Dopisek', type: 't', half: true }, { name: 'link', label: 'Prowadzi do', type: 'link' }] }],
    make: () => ({ items: [0, 1, 2, 3].map(() => ({ img: 'event-booth', name: TT('Nazwa', 'Name'), meta: T0(), link: '' })) }),
  },
  imageCards: {
    label: 'Karty ze zdjęciem', group: 'Treść', icon: 'cards', desc: 'Nagłówek + zdjęcia z tytułami („Dla kogo”)',
    fields: [...HEAD, { name: 'items', label: 'Karty', type: 'list', title: (x) => x.title?.pl, make: () => ({ img: 'salon-pink', title: TT('Tytuł', 'Title') }), fields: [{ name: 'img', label: 'Zdjęcie', type: 'img' }, { name: 'title', label: 'Tytuł', type: 't' }] }],
    make: () => ({ ...head0(), items: [0, 1, 2, 3].map(() => ({ img: 'salon-pink', title: TT('Tytuł', 'Title') })) }),
  },
  cards: {
    label: 'Karty tekstowe', group: 'Treść', icon: 'list', desc: 'Pakiety lub numerowana oferta: tytuł + opis',
    fields: [...HEAD, { name: 'style', label: 'Wygląd', type: 'select', options: [{ value: 'packs', label: 'Karty (pakiety)' }, { value: 'offer', label: 'Numerowana lista (oferta)' }] }, TINT, { name: 'items', label: 'Karty', type: 'list', title: (x) => x.title?.pl, make: () => ({ title: TT('Tytuł', 'Title'), text: TT('Opis', 'Description') }), fields: [{ name: 'title', label: 'Tytuł', type: 't' }, { name: 'text', label: 'Opis', type: 'tarea' }] }],
    make: () => ({ ...head0(), style: 'packs', tint: false, items: [0, 1, 2].map(() => ({ title: TT('Tytuł', 'Title'), text: TT('Opis', 'Description') })) }),
  },
  facts: {
    label: 'Fakty', group: 'Treść', icon: 'facts', desc: 'Siatka „etykieta + opis” (dojazd, godziny…)',
    fields: [{ name: 'items', label: 'Fakty', type: 'list', title: (x) => x.k?.pl, make: () => ({ k: TT('Etykieta', 'Label'), v: TT('Opis', 'Text') }), fields: [{ name: 'k', label: 'Etykieta', type: 't' }, { name: 'v', label: 'Opis', type: 'tarea' }] }],
    make: () => ({ items: [0, 1, 2].map(() => ({ k: TT('Etykieta', 'Label'), v: TT('Opis', 'Text') })) }),
  },
  faq: {
    label: 'FAQ', group: 'Treść', icon: 'faq', desc: 'Pytania i odpowiedzi', source: { label: 'Pytania edytujesz w „FAQ”', to: 'c/faq' },
    fields: [...HEAD, TINT, { name: 'noteKicker', label: 'Notka pod spodem — nadtytuł', type: 't' }, { name: 'noteText', label: 'Notka pod spodem — tekst', type: 'tarea' }],
    make: () => ({ ...head0('FAQ', 'FAQ'), tint: false, noteKicker: T0(), noteText: T0() }),
  },
  map: {
    label: 'Mapa', group: 'Treść', icon: 'map', desc: 'Mapa dojazdu (OpenStreetMap lub Google)',
    fields: [{ name: 'src', label: 'Adres mapy do osadzenia', type: 'str', help: 'Wklej adres z opcji „Udostępnij → Umieść mapę” (sam link z src="…").' }],
    make: () => ({ src: 'https://www.openstreetmap.org/export/embed.html?bbox=21.98%2C50.09%2C22.07%2C50.13&layer=mapnik&marker=50.1115%2C22.0225' }),
  },
  hero: {
    label: 'Ekran powitalny', group: 'Targi', icon: 'star', desc: 'Logo, data i miejsce, dwa przyciski, odliczanie', source: { label: 'Logo: „Ustawienia strony”, data i miejsce: „Dane wydarzenia”', to: 'c/event' },
    fields: [btn('btn1', 'Przycisk główny'), btn('btn2', 'Drugi przycisk'), { name: 'countdownLabel', label: 'Podpis odliczania', type: 't' }],
    make: () => ({ countdownLabel: TT('Do otwarcia', 'Opens in'), btn1: { label: TT('Kup bilet', 'Buy a ticket'), link: 'page:tickets' }, btn2: { label: TT('Zostań wystawcą', 'Become an exhibitor'), link: 'page:exhibit' } }),
  },
  tickets: {
    label: 'Bilety — karty', group: 'Targi', icon: 'ticket', desc: 'Karty biletów z cenami', source: { label: 'Ceny i rodzaje edytujesz w „Bilety”', to: 'c/tickets' },
    fields: [...HEAD, ANCHOR], make: () => ({ ...head0('Bilety', 'Tickets'), anchor: '' }),
  },
  ticketShop: {
    label: 'Bilety — konfigurator i koszyk', group: 'Targi', icon: 'cart', desc: 'Wybór biletu, dnia, cateringu i koszyk', source: { label: 'Bilety, dni i catering edytujesz w „Bilety”', to: 'c/tickets' },
    fields: [{ name: 'groupNote', label: 'Dopisek o grupach', type: 't' }, { name: 'payNotice', label: 'Komunikat po kliknięciu „Przejdź do płatności”', type: 'tarea' }],
    make: () => ({ groupNote: TT('Grupa powyżej 10 osób? Napisz na', 'A group of more than 10? E-mail'), payNotice: TT('Płatność online uruchomimy wkrótce.', 'Online payment is coming soon.') }),
  },
  faces: {
    label: 'Twarze wydarzenia', group: 'Targi', icon: 'users', desc: 'Ambasadorki ze zdjęciami', source: { label: 'Osoby edytujesz w „Twarze”', to: 'c/faces' },
    fields: [...HEAD, { name: 'sample', label: 'Pokaż etykietę „Zdjęcie przykładowe”', type: 'bool' }], make: () => ({ ...head0('Twarze', 'Faces'), sample: false }),
  },
  stats: { label: 'Liczby', group: 'Targi', icon: 'chart', desc: 'Wiersz dużych liczb', source: { label: 'Liczby edytujesz w „Liczby”', to: 'c/stats' }, fields: [], make: () => ({}) },
  zones: { label: 'Strefy', group: 'Targi', icon: 'grid', desc: 'Kafle stref tematycznych', source: { label: 'Strefy edytujesz w „Strefy”', to: 'c/zones' }, fields: HEAD, make: () => head0('Strefy', 'Zones') },
  masterclasses: {
    label: 'Masterclass', group: 'Targi', icon: 'cap', desc: 'Warsztaty z limitem miejsc', source: { label: 'Warsztaty edytujesz w „Masterclass”', to: 'c/masterclasses' },
    fields: [...HEAD, TINT, ANCHOR], make: () => ({ ...head0('Masterclass', 'Masterclass'), tint: false, anchor: '' }),
  },
  experts: {
    label: 'Eksperci', group: 'Targi', icon: 'users', desc: 'Prelegenci ze zdjęciami', source: { label: 'Osoby edytujesz w „Eksperci”', to: 'c/experts' },
    fields: [...HEAD, { name: 'limit', label: 'Ile osób pokazać (0 = wszystkie)', type: 'num' }, ANCHOR], make: () => ({ ...head0('Eksperci', 'Speakers'), limit: 4, anchor: '' }),
  },
  schedule: { label: 'Program — harmonogram', group: 'Targi', icon: 'calendar', desc: 'Program z podziałem na dni i strefy', source: { label: 'Program edytujesz w „Program”', to: 'c/program' }, fields: [], make: () => ({}) },
  partners: {
    label: 'Partnerzy — logotypy', group: 'Targi', icon: 'heart', desc: 'Logotypy partnerów według poziomów', source: { label: 'Partnerów edytujesz w „Partnerzy”', to: 'c/partners' },
    fields: [...HEAD, { name: 'compact', label: 'Tylko trzy pierwsze poziomy', type: 'bool' }], make: () => ({ ...head0('Partnerzy', 'Partners'), compact: true }),
  },
  catalog: {
    label: 'Katalog wystawców', group: 'Targi', icon: 'book', desc: 'Lista wystawców z wyszukiwarką', source: { label: 'Wystawców edytujesz w „Wystawcy”', to: 'c/exhibitors' },
    fields: [{ name: 'slot', label: 'Miejsce reklamowe w katalogu', type: 'slot' }], make: () => ({ slot: 'catalog-inline' }),
  },
  feed: {
    label: 'Aktualności — siatka 2×2', group: 'Targi', icon: 'news', desc: 'Dwa najnowsze wpisy, hasło i kafel reklamowy', source: { label: 'Wpisy edytujesz w „Aktualności”', to: 'c/posts' },
    fields: [{ name: 'kicker', label: 'Nadtytuł', type: 't' }, { name: 'title', label: 'Tytuł', type: 't' }, btn('more', 'Link'), { name: 'quoteTitle', label: 'Kafel tekstowy — pierwsza linia', type: 't' }, { name: 'quoteText', label: 'Kafel tekstowy — druga linia', type: 't' }, { name: 'slot', label: 'Miejsce reklamowe (kafel)', type: 'slot' }],
    make: () => ({ kicker: TT('Aktualności', 'News'), title: TT('Z życia targów', 'From the expo'), more: { label: TT('Wszystkie wpisy', 'All posts'), link: 'page:news' }, quoteTitle: T0(), quoteText: T0(), slot: '' }),
  },
  news: { label: 'Aktualności — lista', group: 'Targi', icon: 'news', desc: 'Karty wpisów', source: { label: 'Wpisy edytujesz w „Aktualności”', to: 'c/posts' }, fields: [{ name: 'limit', label: 'Ile wpisów pokazać (0 = wszystkie)', type: 'num' }], make: () => ({ limit: 3 }) },
  form: {
    label: 'Formularz kontaktowy', group: 'Formularze i reklama', icon: 'mail', desc: 'Tekst po lewej, formularz po prawej',
    fields: [
      { name: 'kind', label: 'Rodzaj formularza', type: 'select', options: [{ value: 'contact', label: 'Kontakt' }, { value: 'partner', label: 'Partnerzy / reklama' }, { value: 'media', label: 'Media (akredytacja)' }, { value: 'exhibitor', label: 'Wystawcy' }], help: 'Zgłoszenia trafiają do „Zgłoszenia” w panelu.' },
      { name: 'kicker', label: 'Nadtytuł', type: 't' }, { name: 'title', label: 'Tytuł', type: 't' }, { name: 'text', label: 'Tekst', type: 'tarea' },
      { name: 'email', label: 'Pokaż adres e-mail', type: 'select', options: 'emails' }, btn('btn', 'Przycisk pod tekstem'),
      { name: 'submit', label: 'Napis na przycisku wysyłki', type: 't' }, { name: 'success', label: 'Komunikat po wysłaniu', type: 't' },
    ],
    make: () => ({ kind: 'contact', kicker: T0(), title: TT('Napisz do nas', 'Write to us'), text: T0(), email: 'kontakt', btn: { label: T0(), link: '' }, submit: TT('Wyślij', 'Send'), success: TT('Dziękujemy! Odezwiemy się wkrótce.', 'Thank you! We’ll be in touch soon.') }),
  },
  exhibitForm: {
    label: 'Zgłoszenie wystawcy', group: 'Formularze i reklama', icon: 'mail', desc: 'Duży tytuł + formularz dla wystawców',
    fields: [{ name: 'title', label: 'Tytuł', type: 't' }, { name: 'lead', label: 'Opis', type: 'tarea' }, { name: 'img', label: 'Zdjęcie', type: 'img' }, { name: 'submit', label: 'Napis na przycisku', type: 't' }, { name: 'success', label: 'Komunikat po wysłaniu', type: 't' }, ANCHOR],
    make: () => ({ title: TT('Zostań wystawcą', 'Exhibit with us'), lead: T0(), img: 'event-booth', submit: TT('Wyślij zgłoszenie', 'Send application'), success: TT('Dziękujemy! Zgłoszenie dotarło.', 'Thank you! We’ve received your application.'), anchor: '' }),
  },
  newsletter: {
    label: 'Zapis na newsletter', group: 'Formularze i reklama', icon: 'send', desc: 'Tytuł + formularz zapisu z wyborem grupy',
    fields: [{ name: 'title', label: 'Tytuł', type: 't' }, { name: 'text', label: 'Opis', type: 't' }], make: () => ({ title: TT('Bądź na bieżąco', 'Stay in the loop'), text: T0() }),
  },
  ad: {
    label: 'Miejsce reklamowe', group: 'Formularze i reklama', icon: 'ad', desc: 'Pasek partnera, baner szeroki lub kafel', source: { label: 'Kreacje i terminy ustawiasz w „Reklama”', to: 'ads' },
    fields: [{ name: 'slot', label: 'Nazwa miejsca', type: 'slot' }, { name: 'format', label: 'Format', type: 'select', options: [{ value: 'wide', label: 'Baner szeroki 1200 × 300' }, { value: 'bar', label: 'Pasek partnera głównego' }, { value: 'tile', label: 'Kafel 600 × 600' }] }],
    make: () => ({ slot: `miejsce-${Math.random().toString(36).slice(2, 6)}`, format: 'wide' }),
  },
  banners: {
    label: 'Banery partnerów', group: 'Formularze i reklama', icon: 'ad', desc: 'Rząd banerów z tłem (złoty, ciemny, zdjęcie)', source: { label: 'Kreacje i terminy ustawiasz w „Reklama”', to: 'ads' },
    fields: [{ name: 'items', label: 'Miejsca na banery', type: 'list', title: (x) => x.slot, make: () => ({ slot: `baner-${Math.random().toString(36).slice(2, 6)}`, wide: false }), fields: [{ name: 'slot', label: 'Nazwa miejsca', type: 'slot', half: true }, { name: 'wide', label: 'Na całą szerokość', type: 'bool', half: true }] }],
    make: () => ({ items: [{ slot: `baner-${Math.random().toString(36).slice(2, 6)}`, wide: true }] }),
  },
}

export const newBlock = (type: string): Block => ({ id: `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, type, props: BLOCK_DEFS[type].make() })

/* ───────────── Sekcje danych ───────────── */

export type Collection = {
  key: string
  title: string
  one: string
  desc: string
  /** list = tabela pozycji, single = jeden formularz */
  kind: 'list' | 'single'
  fields: Field[]
  cols?: { label: string; get: (x: any) => string | number | boolean | undefined; img?: boolean; w?: string }[]
  make?: () => any
  name?: (x: any) => string
}

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export { slug }
const zl = (n: number) => `${n} zł`

export const COLLECTIONS: Record<string, Collection> = {
  event: {
    key: 'event', title: 'Dane wydarzenia', one: 'wydarzenie', kind: 'single', desc: 'Nazwa, termin, miejsce i adresy e-mail. Pojawiają się w wielu miejscach strony.',
    fields: [
      { name: 'brand', label: 'Nazwa marki', type: 'str', half: true }, { name: 'edition', label: 'Nazwa edycji', type: 'str', half: true },
      { name: 'startsAt', label: 'Otwarcie (do odliczania)', type: 'datetime', half: true }, { name: 'hours', label: 'Godziny otwarcia', type: 'str', half: true },
      { name: 'dates', label: 'Termin słownie', type: 't', half: true }, { name: 'datesShort', label: 'Termin skrótem', type: 'str', half: true },
      { name: 'venue', label: 'Obiekt', type: 'str', half: true }, { name: 'city', label: 'Miejscowość', type: 't', half: true },
      { name: 'address', label: 'Adres', type: 'str', half: true }, { name: 'organizer', label: 'Organizator', type: 'str', half: true },
      { name: 'emails', label: 'Adresy e-mail', type: 'group', fields: [
        { name: 'kontakt', label: 'Kontakt ogólny', type: 'str', half: true }, { name: 'wystawcy', label: 'Wystawcy', type: 'str', half: true }, { name: 'bilety', label: 'Bilety', type: 'str', half: true },
        { name: 'partnerzy', label: 'Partnerzy', type: 'str', half: true }, { name: 'media', label: 'Media', type: 'str', half: true }, { name: 'vip', label: 'Goście VIP', type: 'str', half: true },
      ] },
    ],
  },
  tickets: {
    key: 'tickets', title: 'Bilety', one: 'bilet', kind: 'list', desc: 'Rodzaje biletów, ceny, limity i terminy sprzedaży. Kolejność = kolejność na stronie.',
    name: (x) => x.name?.pl,
    cols: [{ label: 'Bilet', get: (x) => x.name?.pl }, { label: 'Cena', get: (x) => zl(x.price), w: '90px' }, { label: 'Dni', get: (x) => x.days, w: '60px' }, { label: 'Limit', get: (x) => x.limit || '—', w: '80px' }, { label: 'Sprzedaż', get: (x) => (x.saleFrom || x.saleTo ? `${x.saleFrom ?? '…'} → ${x.saleTo ?? '…'}` : 'bez ograniczeń') }, { label: 'Aktywny', get: (x) => x.active !== false, w: '80px' }],
    make: () => ({ id: `bilet-${Math.random().toString(36).slice(2, 6)}`, name: TT('Nowy bilet', 'New ticket'), price: 0, note: T0(), perks: [], days: 1, active: true, reentry: true }),
    fields: [
      { name: 'name', label: 'Nazwa', type: 't', half: true }, { name: 'note', label: 'Dopisek pod nazwą', type: 't', half: true },
      { name: 'price', label: 'Cena (zł)', type: 'num', half: true }, { name: 'days', label: 'Ważność', type: 'select', half: true, options: [{ value: 1, label: '1 dzień (kupujący wybiera dzień)' }, { value: 2, label: 'Oba dni' }] },
      { name: 'cateringIncluded', label: 'Catering w cenie', type: 'bool', half: true }, { name: 'reentry', label: 'Ponowne wejście tego samego dnia (skaner wpuści drugi raz)', type: 'bool', half: true }, { name: 'featured', label: 'Wyróżniony („Najczęściej wybierany”)', type: 'bool', half: true },
      { name: 'perks', label: 'Co zawiera', type: 'list', plainT: true, make: T0 },
      { name: 'limit', label: 'Limit sztuk (0 = bez limitu)', type: 'num', half: true, help: 'Będzie pilnowany po podłączeniu płatności.' }, { name: 'active', label: 'Widoczny na stronie', type: 'bool', half: true },
      { name: 'saleFrom', label: 'Sprzedaż od', type: 'date', half: true }, { name: 'saleTo', label: 'Sprzedaż do', type: 'date', half: true },
      { name: 'id', label: 'Identyfikator (do linków ?t=…)', type: 'str', help: 'Nie zmieniaj po starcie sprzedaży.' },
    ],
  },
  ticketDays: {
    key: 'ticketDays', title: 'Dni targów', one: 'dzień', kind: 'list', desc: 'Dni do wyboru przy bilecie jednodniowym.', name: (x) => x.label?.pl,
    cols: [{ label: 'Dzień', get: (x) => x.label?.pl }, { label: 'Data', get: (x) => x.date }],
    make: () => ({ id: `d${Math.random().toString(36).slice(2, 5)}`, label: TT('Dzień', 'Day'), date: '' }),
    fields: [{ name: 'label', label: 'Nazwa dnia', type: 't', half: true }, { name: 'date', label: 'Data (np. 19.02.2028)', type: 'str', half: true }],
  },
  catering: {
    key: 'catering', title: 'Catering', one: 'catering', kind: 'single', desc: 'Dodatek do biletu w konfiguratorze.',
    fields: [{ name: 'pricePerDay', label: 'Cena za dzień (zł)', type: 'num', half: true }, { name: 'name', label: 'Nazwa', type: 't', half: true }, { name: 'desc', label: 'Opis', type: 't' }],
  },
  promoCodes: {
    key: 'promoCodes', title: 'Kody rabatowe', one: 'kod', kind: 'list', desc: 'Kody zaczną działać po podłączeniu płatności. Nie są publikowane na stronie.', name: (x) => x.code,
    cols: [{ label: 'Kod', get: (x) => x.code }, { label: 'Rabat', get: (x) => (x.kind === 'percent' ? `${x.value}%` : zl(x.value)) }, { label: 'Limit użyć', get: (x) => x.limit || '—' }, { label: 'Ważny', get: (x) => (x.from || x.to ? `${x.from ?? '…'} → ${x.to ?? '…'}` : 'zawsze') }, { label: 'Aktywny', get: (x) => x.active !== false, w: '80px' }],
    make: () => ({ code: 'BEAUTY28', kind: 'percent', value: 10, active: true }),
    fields: [
      { name: 'code', label: 'Kod', type: 'str', half: true }, { name: 'kind', label: 'Rodzaj', type: 'select', half: true, options: [{ value: 'percent', label: 'Procent' }, { value: 'amount', label: 'Kwota (zł)' }] },
      { name: 'value', label: 'Wartość', type: 'num', half: true }, { name: 'limit', label: 'Limit użyć (0 = bez limitu)', type: 'num', half: true },
      { name: 'from', label: 'Ważny od', type: 'date', half: true }, { name: 'to', label: 'Ważny do', type: 'date', half: true }, { name: 'active', label: 'Aktywny', type: 'bool' },
    ],
  },
  masterclasses: {
    key: 'masterclasses', title: 'Masterclass', one: 'warsztat', kind: 'list', desc: 'Warsztaty z osobnymi biletami i limitem miejsc.', name: (x) => x.title?.pl,
    cols: [{ label: '', get: (x) => x.img, img: true, w: '56px' }, { label: 'Warsztat', get: (x) => x.title?.pl }, { label: 'Prowadzi', get: (x) => x.host }, { label: 'Termin', get: (x) => `${x.day?.pl} ${x.time}` }, { label: 'Cena', get: (x) => zl(x.price), w: '80px' }, { label: 'Miejsca', get: (x) => `${x.left}/${x.seats}`, w: '80px' }],
    make: () => ({ id: `mc-${Math.random().toString(36).slice(2, 6)}`, title: TT('Nowy warsztat', 'New workshop'), host: '', day: TT('Sobota', 'Saturday'), time: '10:00–12:00', price: 0, seats: 20, left: 20, img: 'mc-seminar' }),
    fields: [
      { name: 'title', label: 'Tytuł', type: 't' }, { name: 'host', label: 'Prowadzi', type: 'str', half: true }, { name: 'img', label: 'Zdjęcie', type: 'img', half: true },
      { name: 'day', label: 'Dzień', type: 't', half: true }, { name: 'time', label: 'Godziny', type: 'str', half: true },
      { name: 'price', label: 'Cena (zł)', type: 'num', half: true }, { name: 'seats', label: 'Liczba miejsc', type: 'num', half: true }, { name: 'left', label: 'Wolnych miejsc', type: 'num', half: true, help: '0 = „Wyprzedane”. Po podłączeniu płatności liczy się samo.' },
    ],
  },
  stats: {
    key: 'stats', title: 'Liczby', one: 'liczbę', kind: 'list', desc: 'Duże liczby pokazywane na stronie głównej i „O targach”.', name: (x) => `${x.value} ${x.label?.pl}`,
    cols: [{ label: 'Liczba', get: (x) => x.value, w: '100px' }, { label: 'Podpis', get: (x) => x.label?.pl }], make: () => ({ value: '10', label: TT('podpis', 'label') }),
    fields: [{ name: 'value', label: 'Liczba', type: 'str', half: true }, { name: 'label', label: 'Podpis', type: 't', half: true }],
  },
  faces: {
    key: 'faces', title: 'Twarze wydarzenia', one: 'osobę', kind: 'list', desc: 'Ambasadorki pokazywane na stronie głównej.', name: (x) => x.name,
    cols: [{ label: '', get: (x) => x.img, img: true, w: '56px' }, { label: 'Imię i nazwisko', get: (x) => x.name }, { label: 'Rola', get: (x) => x.role?.pl }], make: () => ({ name: 'Imię Nazwisko', role: TT('Ambasadorka', 'Ambassador'), img: '' }),
    fields: [{ name: 'name', label: 'Imię i nazwisko', type: 'str', half: true }, { name: 'role', label: 'Rola', type: 't', half: true }, { name: 'img', label: 'Zdjęcie (pionowe)', type: 'img' }],
  },
  experts: {
    key: 'experts', title: 'Eksperci', one: 'eksperta', kind: 'list', desc: 'Prelegenci i trenerzy. Pierwsi czterej są widoczni na stronie głównej.', name: (x) => x.name,
    cols: [{ label: '', get: (x) => x.img, img: true, w: '56px' }, { label: 'Imię i nazwisko', get: (x) => x.name }, { label: 'Specjalizacja', get: (x) => x.role?.pl }], make: () => ({ name: 'Imię Nazwisko', role: TT('Specjalizacja', 'Speciality'), img: '' }),
    fields: [{ name: 'name', label: 'Imię i nazwisko', type: 'str', half: true }, { name: 'role', label: 'Specjalizacja', type: 't', half: true }, { name: 'img', label: 'Zdjęcie (pionowe)', type: 'img' }],
  },
  zones: {
    key: 'zones', title: 'Strefy', one: 'strefę', kind: 'list', desc: 'Strefy tematyczne. Każda ma własną podstronę z partnerem i wystawcami.', name: (x) => x.name?.pl,
    cols: [{ label: '', get: (x) => x.img, img: true, w: '56px' }, { label: 'Strefa', get: (x) => x.name?.pl }, { label: 'Partner', get: (x) => x.partner }, { label: 'Adres', get: (x) => `/strefy/${x.slug?.pl}` }],
    make: () => { const id = Math.random().toString(36).slice(2, 6); return { slug: TT(`strefa-${id}`, `zone-${id}`), short: `strefa-${id}`, name: TT('Nowa strefa', 'New zone'), img: 'zone-hair', lead: T0(), partner: '' } },
    fields: [
      { name: 'name', label: 'Nazwa', type: 't', half: true }, { name: 'partner', label: 'Partner strefy', type: 'str', half: true }, { name: 'lead', label: 'Opis', type: 'tarea' }, { name: 'img', label: 'Zdjęcie', type: 'img' },
      { name: 'slug', label: 'Adres podstrony (bez spacji)', type: 't', half: true }, { name: 'short', label: 'Krótki kod (filtry, program, wystawcy)', type: 'str', half: true, help: 'Nie zmieniaj, jeśli strefa ma już wystawców i punkty programu.' },
    ],
  },
  program: {
    key: 'program', title: 'Program', one: 'dzień', kind: 'list', desc: 'Harmonogram z podziałem na dni. Kliknij dzień, aby edytować jego punkty.', name: (x) => `${x.day?.pl} ${x.date}`,
    cols: [{ label: 'Dzień', get: (x) => x.day?.pl }, { label: 'Data', get: (x) => x.date }, { label: 'Punktów programu', get: (x) => x.items?.length ?? 0 }], make: () => ({ day: TT('Dzień', 'Day'), date: '', items: [] }),
    fields: [
      { name: 'day', label: 'Nazwa dnia', type: 't', half: true }, { name: 'date', label: 'Data', type: 'str', half: true },
      { name: 'items', label: 'Punkty programu', type: 'list', title: (x) => `${x.time} · ${x.title?.pl ?? ''}`, make: () => ({ time: '12:00', title: TT('Nowy punkt', 'New item'), stage: TT('Scena główna', 'Main stage'), host: '', zone: '' }),
        fields: [{ name: 'time', label: 'Godzina', type: 'str', half: true }, { name: 'stage', label: 'Scena / sala', type: 't', half: true }, { name: 'title', label: 'Tytuł', type: 't' }, { name: 'host', label: 'Prowadzi', type: 'str', half: true }, { name: 'zone', label: 'Strefa', type: 'select', options: 'zones', half: true }] },
    ],
  },
  exhibitors: {
    key: 'exhibitors', title: 'Wystawcy', one: 'wystawcę', kind: 'list', desc: 'Katalog wystawców na stronie „Wystawcy” i na podstronach stref.', name: (x) => x.name,
    cols: [{ label: '', get: (x) => x.logo, img: true, w: '56px' }, { label: 'Marka', get: (x) => x.name }, { label: 'Kategoria', get: (x) => x.category?.pl }, { label: 'Strefa', get: (x) => x.zone, w: '110px' }, { label: 'Stoisko', get: (x) => x.stand, w: '90px' }],
    make: () => ({ name: 'Nowa marka', category: T0(), stand: '', zone: '', logo: '', url: '' }),
    fields: [{ name: 'name', label: 'Marka', type: 'str', half: true }, { name: 'category', label: 'Kategoria', type: 't', half: true }, { name: 'zone', label: 'Strefa', type: 'select', options: 'zones', half: true }, { name: 'stand', label: 'Numer stoiska', type: 'str', half: true }, { name: 'url', label: 'Strona WWW lub profil', type: 'str' }, { name: 'logo', label: 'Logo', type: 'img', help: 'Bez logo pokażemy nazwę marki.' }],
  },
  partners: {
    key: 'partners', title: 'Partnerzy', one: 'poziom', kind: 'list', desc: 'Partnerzy i sponsorzy według poziomów. Trzy pierwsze poziomy trafiają też do paska na dole każdej strony.', name: (x) => x.tier?.pl,
    cols: [{ label: 'Poziom', get: (x) => x.tier?.pl }, { label: 'Partnerzy', get: (x) => (x.items ?? []).map((i: any) => i.name).join(', ') }], make: () => ({ tier: TT('Nowy poziom', 'New tier'), items: [] }),
    fields: [{ name: 'tier', label: 'Nazwa poziomu', type: 't' }, { name: 'items', label: 'Partnerzy', type: 'list', title: (x) => x.name, make: () => ({ name: 'Nazwa partnera', logo: '', url: '' }), fields: [{ name: 'name', label: 'Nazwa', type: 'str', half: true }, { name: 'url', label: 'Link (WWW / social media)', type: 'str', half: true }, { name: 'logo', label: 'Logo', type: 'img' }] }],
  },
  posts: {
    key: 'posts', title: 'Aktualności', one: 'wpis', kind: 'list', desc: 'Wpisy bloga. Najnowsze na górze — dwa pierwsze trafiają na stronę główną.', name: (x) => x.title?.pl,
    cols: [{ label: '', get: (x) => x.img, img: true, w: '56px' }, { label: 'Tytuł', get: (x) => x.title?.pl }, { label: 'Data', get: (x) => x.date, w: '110px' }, { label: 'Status', get: (x) => (x.draft ? 'Szkic' : 'Na stronie'), w: '100px' }],
    make: () => ({ slug: `wpis-${Date.now().toString(36)}`, title: TT('Nowy wpis', 'New post'), date: new Date().toISOString().slice(0, 10), img: 'event-stage', excerpt: T0(), body: T0(), draft: true }),
    fields: [
      { name: 'title', label: 'Tytuł', type: 't' }, { name: 'excerpt', label: 'Zajawka', type: 'tarea' }, { name: 'body', label: 'Treść', type: 'tarea', help: 'Pusta linia = nowy akapit. „## ” na początku linii = śródtytuł.' },
      { name: 'img', label: 'Zdjęcie', type: 'img' }, { name: 'date', label: 'Data', type: 'date', half: true }, { name: 'slug', label: 'Adres wpisu', type: 'str', half: true, help: 'Małe litery i myślniki. Nie zmieniaj po publikacji.' },
      { name: 'draft', label: 'Szkic (nie pokazuj na stronie)', type: 'bool' },
    ],
  },
  faq: {
    key: 'faq', title: 'FAQ', one: 'pytanie', kind: 'list', desc: 'Pytania i odpowiedzi pokazywane w blokach FAQ.', name: (x) => x.q?.pl,
    cols: [{ label: 'Pytanie', get: (x) => x.q?.pl }, { label: 'Odpowiedź', get: (x) => x.a?.pl }], make: () => ({ q: TT('Nowe pytanie?', 'New question?'), a: T0() }),
    fields: [{ name: 'q', label: 'Pytanie', type: 't' }, { name: 'a', label: 'Odpowiedź', type: 'tarea' }],
  },
  settings: {
    key: 'settings', title: 'Ustawienia strony', one: 'ustawienia', kind: 'single', desc: 'Logo, obraz do udostępnień, media społecznościowe. Kolory i kroje pisma są stałe — pilnują spójności marki.',
    fields: [
      { name: 'logoText', label: 'Logo — napis', type: 'str', half: true }, { name: 'logoSub', label: 'Logo — dopisek', type: 'str', half: true },
      { name: 'logoImg', label: 'Logo — plik (zastępuje napis na stronie głównej)', type: 'img', help: 'Najlepiej PNG z przezroczystym tłem lub SVG.' }, { name: 'ogImage', label: 'Obraz przy udostępnianiu linku (Facebook, Messenger…)', type: 'img', help: 'Puste = gotowa grafika ohtargi.pl (1200 × 630).' },
      { name: 'social', label: 'Media społecznościowe', type: 'list', title: (x) => x.name, make: () => ({ name: 'Instagram', url: 'https://' }), fields: [{ name: 'name', label: 'Nazwa', type: 'str', half: true }, { name: 'url', label: 'Adres profilu', type: 'str', half: true }] },
      { name: 'footerNote', label: 'Dopisek w stopce', type: 't', help: 'Np. informacja, że strona jest wersją roboczą. Zostaw puste, aby ukryć.' },
      { name: 'partnerStrip', label: 'Pasek partnerów na dole każdej strony', type: 'bool', half: true }, { name: 'tracking', label: 'Licznik odwiedzin (bez cookies)', type: 'bool', half: true },
    ],
  },
}

const navItem: Field[] = [{ name: 'label', label: 'Napis', type: 't', half: true }, { name: 'link', label: 'Prowadzi do', type: 'link', half: true }]
const navMake = () => ({ label: TT('Nowy link', 'New link'), link: '' })
export const NAV_FIELDS: Field[] = [
  { name: 'left', label: 'Menu — lewa strona', type: 'list', title: (x) => x.label?.pl, make: navMake, fields: navItem },
  { name: 'right', label: 'Menu — prawa strona', type: 'list', title: (x) => x.label?.pl, make: navMake, fields: navItem },
  { name: 'footer', label: 'Stopka — kolumny', type: 'list', title: (x) => x.title?.pl, make: () => ({ title: TT('Kolumna', 'Column'), links: [] }), fields: [{ name: 'title', label: 'Tytuł kolumny', type: 't' }, { name: 'links', label: 'Linki', type: 'list', title: (x) => x.label?.pl, make: navMake, fields: navItem }] },
]

export const BANNER_FIELDS: Field[] = [
  { name: 'brand', label: 'Marka / reklamodawca', type: 'str', half: true },
  { name: 'format', label: 'Format', type: 'select', half: true, options: [{ value: 'banner', label: 'Baner z tłem (720 lub 1440 × 360)' }, { value: 'wide', label: 'Baner szeroki 1200 × 300' }, { value: 'tile', label: 'Kafel 600 × 600' }, { value: 'bar', label: 'Pasek partnera głównego' }] },
  { name: 'style', label: 'Tło (tylko „baner z tłem”)', type: 'select', half: true, options: [{ value: 'gold', label: 'Złote' }, { value: 'dark', label: 'Ciemne' }, { value: 'photo', label: 'Zdjęcie' }] },
  { name: 'img', label: 'Zdjęcie / kreacja', type: 'img', half: true },
  { name: 'kicker', label: 'Nadtytuł', type: 't', half: true }, { name: 'cta', label: 'Napis przycisku', type: 't', half: true },
  { name: 'claim', label: 'Hasło', type: 't' },
  { name: 'url', label: 'Link po kliknięciu', type: 'link' },
  { name: 'slots', label: 'Gdzie wyświetlać', type: 'slots', help: 'Jeśli w jednym miejscu jest kilka aktywnych banerów, wyświetlają się na zmianę (rotacja wg wagi).' },
  { name: 'from', label: 'Emisja od', type: 'date', half: true }, { name: 'to', label: 'Emisja do', type: 'date', half: true },
  { name: 'weight', label: 'Waga w rotacji', type: 'num', half: true, help: '2 = pokazuje się dwa razy częściej niż baner z wagą 1.' }, { name: 'active', label: 'Aktywny', type: 'bool', half: true },
]
