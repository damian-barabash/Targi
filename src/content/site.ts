// Treści robocze (przykładowe). Docelowo przyjdą z panelu / Supabase —
// kształt danych jest już taki, jaki będzie w bazie.
import type { T } from '../i18n'

export const EVENT = {
  brand: 'Beauty & Hair Expo',
  edition: 'Rzeszów 2028',
  startsAt: '2028-02-19T10:00:00+01:00',
  dates: { pl: '19–20 lutego 2028', en: '19–20 February 2028' } as T,
  datesShort: '19–20.02.2028',
  venue: 'ZEN.COM Expo',
  city: { pl: 'Jasionka k. Rzeszowa', en: 'Jasionka near Rzeszów' } as T,
  address: 'Jasionka 953, 36-002 Jasionka',
  organizer: 'Fundacja Wielkie Serce dla Dzieci',
  emails: {
    kontakt: 'kontakt@targibeautyhair.pl',
    wystawcy: 'wystawcy@targibeautyhair.pl',
    bilety: 'bilety@targibeautyhair.pl',
    partnerzy: 'partnerzy@targibeautyhair.pl',
    media: 'media@targibeautyhair.pl',
    vip: 'vip@targibeautyhair.pl',
  },
  social: [
    { name: 'Instagram', url: 'https://instagram.com/' },
    { name: 'Facebook', url: 'https://facebook.com/' },
    { name: 'TikTok', url: 'https://tiktok.com/' },
  ],
}

export const STATS: { value: string; label: T }[] = [
  { value: '120+', label: { pl: 'wystawców', en: 'exhibitors' } },
  { value: '40', label: { pl: 'ekspertów i prelegentów', en: 'experts & speakers' } },
  { value: '25', label: { pl: 'masterclass i warsztatów', en: 'masterclasses & workshops' } },
  { value: '2', label: { pl: 'dni inspiracji', en: 'days of inspiration' } },
]

export type TicketType = {
  id: string
  name: T
  price: number
  note: T
  perks: T[]
  featured?: boolean
  dark?: boolean
}

export const TICKETS: TicketType[] = [
  {
    id: 'day',
    name: { pl: 'Bilet jednodniowy', en: 'One-day ticket' },
    price: 79,
    note: { pl: 'sobota lub niedziela', en: 'Saturday or Sunday' },
    perks: [
      { pl: 'Wstęp na halę wystawców', en: 'Access to the exhibition hall' },
      { pl: 'Pokazy na scenie głównej', en: 'Main stage shows' },
      { pl: 'Ponowne wejście tego samego dnia', en: 'Same-day re-entry' },
    ],
  },
  {
    id: 'weekend',
    name: { pl: 'Bilet dwudniowy', en: 'Two-day ticket' },
    price: 129,
    note: { pl: 'oba dni targów', en: 'both days' },
    perks: [
      { pl: 'Wstęp w sobotę i niedzielę', en: 'Entry on Saturday and Sunday' },
      { pl: 'Pokazy i panele dyskusyjne', en: 'Shows and panel talks' },
      { pl: 'Ponowne wejście w oba dni', en: 'Re-entry on both days' },
    ],
    featured: true,
  },
  {
    id: 'vip',
    name: { pl: 'Bilet VIP', en: 'VIP ticket' },
    price: 349,
    note: { pl: 'oba dni + strefa VIP', en: 'both days + VIP lounge' },
    perks: [
      { pl: 'Strefa VIP z poczęstunkiem', en: 'VIP lounge with catering' },
      { pl: 'Miejsca w pierwszych rzędach', en: 'Front-row seats' },
      { pl: 'Pakiet upominków od partnerów', en: 'Partner gift bag' },
      { pl: 'Osobne, szybkie wejście', en: 'Fast-track entrance' },
    ],
    dark: true,
  },
]

export type Zone = { slug: T; name: T; short: string; img: string; lead: T; partner: string }

export const ZONES: Zone[] = [
  {
    slug: { pl: 'hair', en: 'hair' },
    short: 'hair',
    name: { pl: 'Strefa Hair', en: 'Hair Zone' },
    img: 'zone-hair',
    partner: 'Maison Coiffure',
    lead: {
      pl: 'Koloryzacja, strzyżenia i stylizacje na żywo. Najnowsze techniki pokazywane przez stylistów z Polski i Europy.',
      en: 'Live colouring, cutting and styling. The newest techniques shown by stylists from Poland and Europe.',
    },
  },
  {
    slug: { pl: 'make-up', en: 'make-up' },
    short: 'make-up',
    name: { pl: 'Strefa Make-up', en: 'Make-up Zone' },
    img: 'zone-makeup',
    partner: 'Atelier Lumière',
    lead: {
      pl: 'Makijaż dzienny, ślubny i sceniczny. Testy kosmetyków i konsultacje z wizażystami.',
      en: 'Day, bridal and stage make-up. Product testing and consultations with make-up artists.',
    },
  },
  {
    slug: { pl: 'nails', en: 'nails' },
    short: 'nails',
    name: { pl: 'Strefa Nails', en: 'Nails Zone' },
    img: 'zone-nails',
    partner: 'Nude Studio',
    lead: {
      pl: 'Stylizacja paznokci, zdobienia i nowości produktowe. Mistrzostwa i pokazy na żywo.',
      en: 'Nail styling, nail art and new products. Live championships and demos.',
    },
  },
  {
    slug: { pl: 'kosmetologia', en: 'cosmetology' },
    short: 'skin',
    name: { pl: 'Strefa Kosmetologii', en: 'Cosmetology Zone' },
    img: 'zone-cosmetology',
    partner: 'Derma Lab',
    lead: {
      pl: 'Zabiegi na twarz i ciało, aparatura i pielęgnacja. Wykłady lekarzy i kosmetologów.',
      en: 'Face and body treatments, devices and skincare. Talks by doctors and cosmetologists.',
    },
  },
  {
    slug: { pl: 'barber', en: 'barber' },
    short: 'barber',
    name: { pl: 'Strefa Barber', en: 'Barber Zone' },
    img: 'zone-barber',
    partner: 'Gentlemen’s Club',
    lead: {
      pl: 'Strzyżenie męskie, broda i golenie brzytwą. Pokazy najlepszych barberów w regionie.',
      en: 'Men’s cuts, beards and razor shaves. Shows by the region’s best barbers.',
    },
  },
]

export type Masterclass = {
  id: string
  title: T
  host: string
  day: T
  time: string
  price: number
  seats: number
  left: number
  img: string
}

export const MASTERCLASSES: Masterclass[] = [
  {
    id: 'balayage',
    title: { pl: 'Balayage od podstaw do efektu wow', en: 'Balayage from basics to wow' },
    host: 'Anna Wiśniewska',
    day: { pl: 'Sobota', en: 'Saturday' },
    time: '11:00–13:00',
    price: 249,
    seats: 30,
    left: 12,
    img: 'mc-blowdry',
  },
  {
    id: 'bridal',
    title: { pl: 'Makijaż ślubny, który przetrwa cały dzień', en: 'Bridal make-up that lasts all day' },
    host: 'Julia Nowak',
    day: { pl: 'Sobota', en: 'Saturday' },
    time: '14:00–16:00',
    price: 199,
    seats: 25,
    left: 4,
    img: 'zone-makeup',
  },
  {
    id: 'salon',
    title: { pl: 'Salon, który sprzedaje. Marketing w beauty', en: 'A salon that sells. Marketing in beauty' },
    host: 'Marek Zieliński',
    day: { pl: 'Niedziela', en: 'Sunday' },
    time: '10:30–12:30',
    price: 179,
    seats: 60,
    left: 0,
    img: 'mc-seminar',
  },
]

export type Expert = { name: string; role: T; img: string }

export const EXPERTS: Expert[] = [
  { name: 'Anna Wiśniewska', role: { pl: 'Stylistka fryzur, koloryzacja', en: 'Hair stylist, colour' }, img: 'expert-2' },
  { name: 'Julia Nowak', role: { pl: 'Wizażystka', en: 'Make-up artist' }, img: 'expert-6' },
  { name: 'Amara Okafor', role: { pl: 'Trycholożka', en: 'Trichologist' }, img: 'expert-1' },
  { name: 'Marek Zieliński', role: { pl: 'Ekspert biznesu beauty', en: 'Beauty business expert' }, img: 'expert-4' },
  { name: 'Ewa Kamińska', role: { pl: 'Kosmetolożka', en: 'Cosmetologist' }, img: 'expert-3' },
  { name: 'Natalia Lewandowska', role: { pl: 'Stylistka paznokci', en: 'Nail artist' }, img: 'expert-5' },
]

export type ProgramItem = { time: string; title: T; stage: T; host?: string; zone?: string }

export const PROGRAM: { day: T; date: string; items: ProgramItem[] }[] = [
  {
    day: { pl: 'Sobota', en: 'Saturday' },
    date: '19.02.2028',
    items: [
      { time: '10:00', title: { pl: 'Otwarcie targów', en: 'Opening' }, stage: { pl: 'Scena główna', en: 'Main stage' } },
      { time: '10:30', title: { pl: 'Trendy koloryzacji 2028', en: 'Colour trends 2028' }, stage: { pl: 'Scena główna', en: 'Main stage' }, host: 'Anna Wiśniewska', zone: 'hair' },
      { time: '11:00', title: { pl: 'Masterclass: Balayage', en: 'Masterclass: Balayage' }, stage: { pl: 'Sala A', en: 'Room A' }, host: 'Anna Wiśniewska', zone: 'hair' },
      { time: '12:30', title: { pl: 'Skóra zimą — panel ekspertów', en: 'Skin in winter — expert panel' }, stage: { pl: 'Scena główna', en: 'Main stage' }, host: 'Ewa Kamińska', zone: 'skin' },
      { time: '14:00', title: { pl: 'Masterclass: Makijaż ślubny', en: 'Masterclass: Bridal make-up' }, stage: { pl: 'Sala B', en: 'Room B' }, host: 'Julia Nowak', zone: 'make-up' },
      { time: '16:00', title: { pl: 'Pokaz fryzur wieczorowych', en: 'Evening hair show' }, stage: { pl: 'Scena główna', en: 'Main stage' }, zone: 'hair' },
    ],
  },
  {
    day: { pl: 'Niedziela', en: 'Sunday' },
    date: '20.02.2028',
    items: [
      { time: '10:00', title: { pl: 'Śniadanie biznesowe VIP', en: 'VIP business breakfast' }, stage: { pl: 'Strefa VIP', en: 'VIP lounge' } },
      { time: '10:30', title: { pl: 'Masterclass: Marketing w beauty', en: 'Masterclass: Beauty marketing' }, stage: { pl: 'Sala A', en: 'Room A' }, host: 'Marek Zieliński' },
      { time: '12:00', title: { pl: 'Mistrzostwa stylizacji paznokci', en: 'Nail art championship' }, stage: { pl: 'Scena Nails', en: 'Nails stage' }, host: 'Natalia Lewandowska', zone: 'nails' },
      { time: '13:30', title: { pl: 'Barber battle', en: 'Barber battle' }, stage: { pl: 'Scena główna', en: 'Main stage' }, zone: 'barber' },
      { time: '15:00', title: { pl: 'Zdrowe włosy od skóry głowy', en: 'Healthy hair starts at the scalp' }, stage: { pl: 'Scena główna', en: 'Main stage' }, host: 'Amara Okafor', zone: 'hair' },
      { time: '17:00', title: { pl: 'Zakończenie i losowanie nagród', en: 'Closing and prize draw' }, stage: { pl: 'Scena główna', en: 'Main stage' } },
    ],
  },
]

export type Exhibitor = { name: string; category: T; stand: string; zone: string }

export const EXHIBITORS: Exhibitor[] = [
  { name: 'Maison Coiffure', category: { pl: 'Kosmetyki do włosów', en: 'Hair care' }, stand: 'A12', zone: 'hair' },
  { name: 'Atelier Lumière', category: { pl: 'Kosmetyki kolorowe', en: 'Colour cosmetics' }, stand: 'B04', zone: 'make-up' },
  { name: 'Nude Studio', category: { pl: 'Stylizacja paznokci', en: 'Nail styling' }, stand: 'C08', zone: 'nails' },
  { name: 'Derma Lab', category: { pl: 'Aparatura kosmetyczna', en: 'Beauty devices' }, stand: 'D01', zone: 'skin' },
  { name: 'Gentlemen’s Club', category: { pl: 'Barber', en: 'Barber' }, stand: 'E03', zone: 'barber' },
  { name: 'Silk & Stone', category: { pl: 'Pielęgnacja naturalna', en: 'Natural skincare' }, stand: 'D07', zone: 'skin' },
  { name: 'Velvet Brush', category: { pl: 'Pędzle i akcesoria', en: 'Brushes & tools' }, stand: 'B11', zone: 'make-up' },
  { name: 'Salon Pro Furniture', category: { pl: 'Wyposażenie salonów', en: 'Salon furniture' }, stand: 'A02', zone: 'hair' },
  { name: 'Aurora Color', category: { pl: 'Farby do włosów', en: 'Hair colour' }, stand: 'A15', zone: 'hair' },
  { name: 'Lash Society', category: { pl: 'Rzęsy i brwi', en: 'Lashes & brows' }, stand: 'B09', zone: 'make-up' },
  { name: 'Pure Nails', category: { pl: 'Lakiery hybrydowe', en: 'Gel polish' }, stand: 'C02', zone: 'nails' },
  { name: 'SalonFlow', category: { pl: 'Oprogramowanie dla salonów', en: 'Salon software' }, stand: 'F01', zone: 'hair' },
]

export const PARTNERS: { tier: T; names: string[] }[] = [
  { tier: { pl: 'Partner strategiczny', en: 'Strategic partner' }, names: ['Maison Coiffure'] },
  { tier: { pl: 'Partnerzy złoci', en: 'Gold partners' }, names: ['Atelier Lumière', 'Derma Lab', 'Aurora Color'] },
  { tier: { pl: 'Partnerzy', en: 'Partners' }, names: ['Nude Studio', 'Silk & Stone', 'Velvet Brush', 'Lash Society', 'Pure Nails'] },
  { tier: { pl: 'Patroni medialni', en: 'Media partners' }, names: ['Beauty Forum', 'Hair Mag', 'Salon Today'] },
]

export type Post = { slug: string; title: T; date: string; img: string; excerpt: T; body: T[] }

export const POSTS: Post[] = [
  {
    slug: 'ruszamy-z-pierwsza-edycja',
    title: { pl: 'Ruszamy z pierwszą edycją Beauty & Hair Expo', en: 'The first Beauty & Hair Expo is coming' },
    date: '2026-11-05',
    img: 'hair-blowdry',
    excerpt: {
      pl: 'W lutym 2028 ZEN.COM Expo zamieni się w największe spotkanie branży beauty na Podkarpaciu.',
      en: 'In February 2028 ZEN.COM Expo becomes the biggest beauty industry meeting in south-eastern Poland.',
    },
    body: [
      {
        pl: 'Beauty & Hair Expo to dwa dni pokazów, warsztatów i spotkań dla stylistów, kosmetologów, wizażystów, barberów i właścicieli salonów.',
        en: 'Beauty & Hair Expo is two days of shows, workshops and meetings for stylists, cosmetologists, make-up artists, barbers and salon owners.',
      },
      {
        pl: 'Na hali spotkasz producentów kosmetyków, dystrybutorów sprzętu i ekspertów, którzy na żywo pokażą najnowsze techniki.',
        en: 'In the hall you will meet cosmetics brands, equipment distributors and experts showing the newest techniques live.',
      },
    ],
  },
  {
    slug: 'masterclass-zapisy',
    title: { pl: 'Masterclass: jak wybrać warsztat dla siebie', en: 'Masterclass: how to choose the right workshop' },
    date: '2026-11-04',
    img: 'mc-team',
    excerpt: {
      pl: 'Liczba miejsc na warsztatach jest ograniczona. Podpowiadamy, na co zwrócić uwagę.',
      en: 'Workshop seats are limited. Here is what to look for.',
    },
    body: [
      {
        pl: 'Każdy masterclass prowadzi praktyk z wieloletnim doświadczeniem. Grupy są małe, żeby każdy mógł zadać pytanie.',
        en: 'Every masterclass is led by an experienced practitioner. Groups are small so everyone can ask questions.',
      },
    ],
  },
  {
    slug: 'trendy-pielegnacji',
    title: { pl: '5 trendów w pielęgnacji, o których usłyszysz na targach', en: '5 skincare trends you will hear about at the expo' },
    date: '2026-11-02',
    img: 'news-facial',
    excerpt: {
      pl: 'Od pielęgnacji skóry głowy po zabiegi bez igieł — przegląd tematów scen eksperckich.',
      en: 'From scalp care to needle-free treatments — an overview of the expert stage topics.',
    },
    body: [
      {
        pl: 'Pielęgnacja skóry głowy, minimalizm w rutynie i nowoczesna aparatura — to tematy, które zdominują panele eksperckie.',
        en: 'Scalp care, minimal routines and modern devices are the topics set to dominate the expert panels.',
      },
    ],
  },
]

export const FAQ: { q: T; a: T }[] = [
  {
    q: { pl: 'Jak otrzymam bilet?', en: 'How will I receive my ticket?' },
    a: {
      pl: 'Po płatności bilet z indywidualnym kodem QR przyjdzie na Twój e-mail. Wystarczy pokazać go na telefonie przy wejściu.',
      en: 'After payment your ticket with a unique QR code is sent by e-mail. Just show it on your phone at the entrance.',
    },
  },
  {
    q: { pl: 'Czy mogę wyjść i wrócić?', en: 'Can I leave and come back?' },
    a: {
      pl: 'Tak, ponowne wejście jest możliwe w dniach, na które ważny jest Twój bilet.',
      en: 'Yes, re-entry is possible on the days your ticket is valid for.',
    },
  },
  {
    q: { pl: 'Czy dostanę fakturę?', en: 'Can I get an invoice?' },
    a: {
      pl: 'Tak. Dane do faktury podasz podczas zamówienia — dokument przyjdzie automatycznie.',
      en: 'Yes. Enter your invoice details during checkout — the document is sent automatically.',
    },
  },
  {
    q: { pl: 'Czy można zwrócić bilet?', en: 'Can I return a ticket?' },
    a: {
      pl: 'Bilety na wydarzenie w określonym terminie nie podlegają zwrotowi. Szczegóły w regulaminie.',
      en: 'Tickets for a dated event are non-refundable. See the terms for details.',
    },
  },
]
