import { RT } from '../content/site'

const BASE = import.meta.env.BASE_URL
/** Starsze zdjęcia z niestandardowymi szerokościami. */
const LEGACY_WIDE: Record<string, number[]> = { 'strip-show': [800, 1400, 2800] }

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
