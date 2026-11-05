import type { Locale } from '../i18n'

export const price = (n: number, l: Locale) =>
  l === 'pl' ? `${n.toLocaleString('pl-PL')} zł` : `PLN ${n.toLocaleString('en-GB')}`

export const date = (iso: string, l: Locale) =>
  new Date(iso).toLocaleDateString(l === 'pl' ? 'pl-PL' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
