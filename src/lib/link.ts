import type { Locale } from '../i18n'
import { S } from '../content/site'
import type { Post, Zone } from '../content/types'

const pre = (l: Locale) => (l === 'pl' ? '' : l)
const join = (...parts: (string | undefined)[]) => '/' + parts.filter(Boolean).join('/')

/** Adres strony po jej id (strony systemowe i własne). */
export function pageHref(l: Locale, id: string): string {
  const p = S.pages.find((x) => x.id === id)
  return join(pre(l), p?.slug[l])
}
export const ZONE_PREFIX = { pl: 'strefy', en: 'zones' }
export const zoneHref = (l: Locale, z: Zone) => join(pre(l), ZONE_PREFIX[l], z.slug[l])
export const postHref = (l: Locale, p: Post) => join(pre(l), S.pages.find((x) => x.id === 'news')?.slug[l], p.slug)

/** Rozwija odnośnik z treści: "page:tickets?t=day#kup" → "/bilety?t=day#kup"; reszta bez zmian. */
export function link(l: Locale, v: string | undefined): string {
  if (!v) return ''
  if (!v.startsWith('page:')) return v
  const m = /^page:([^?#]*)(.*)$/.exec(v)!
  return pageHref(l, m[1]) + m[2]
}
