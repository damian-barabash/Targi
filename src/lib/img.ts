import { RT, S } from '../content/site'

const BASE = import.meta.env.BASE_URL
/** Starsze zdjęcia z niestandardowymi szerokościami. */
const LEGACY_WIDE: Record<string, number[]> = { 'strip-show': [800, 1400, 2800], 'promo-spotkajmy': [800, 1600, 2000], 'promo-partner': [800, 1600, 2000], 'promo-wystawca': [800, 1600, 2000] }

/** ref: nazwa z public/img, "media:<id>" z biblioteki mediów albo pełny adres. */
export function imgSrc(ref: string, w = 1600): string {
  if (!ref) return ''
  if (ref.startsWith('media:')) {
    const id = ref.slice(6)
    return RT.preview ? `${RT.storage}/${id}-${w}.webp` : `${BASE}m/${id}-${w}.webp`
  }
  if (/^(https?:|data:|\/)/.test(ref)) return ref
  return `${BASE}img/${ref}-${w}.webp`
}

export function imgWidths(ref: string, wide = false): number[] {
  if (ref.startsWith('media:')) return wide ? [800, 1600, 2400] : [800, 1600]
  if (/^(https?:|data:|\/)/.test(ref)) return []
  return (wide && LEGACY_WIDE[ref]) || [800, 1600]
}

export function imgSet(ref: string, wide = false): string | undefined {
  const ws = imgWidths(ref, wide)
  return ws.length ? ws.map((w) => `${imgSrc(ref, w)} ${w}w`).join(', ') : undefined
}

/** Punkty kadru wbudowanych zdjęć (x %, y %). */
const BUILTIN_FOCUS: Record<string, [number, number]> = {
  'z-hair': [50, 30],
  'z-makeup': [45, 35],
  'z-nails': [50, 50],
  'z-cosmetology': [40, 50],
  'z-barber': [60, 35],
}

/** Dane pliku: punkt kadru, proporcja i rodzaj (zdjęcie / logo). */
export function imgMeta(ref: string): { x: number; y: number; ar: number; logo: boolean } | null {
  if (ref.startsWith('media:')) {
    const m = S.media?.[ref.slice(6)]
    return m ? { x: m[0], y: m[1], ar: m[2], logo: m[3] === 'logo' } : null
  }
  const f = BUILTIN_FOCUS[ref]
  return f ? { x: f[0], y: f[1], ar: 0, logo: false } : null
}
