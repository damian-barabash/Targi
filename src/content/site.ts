// Treści strony. Build: tools/fetch-content.mjs zapisuje published.json (ostatnia opublikowana migawka
// z panelu, uzupełniona wartościami domyślnymi). Panel podmienia treści na żywo przez setSite().
import type { SiteData } from './types'
import published from './published.json'

export const S = published as unknown as SiteData

/** Tryb podglądu w panelu: zdjęcia z magazynu Supabase zamiast z /media, bez statystyk. */
export const RT = { preview: false, storage: '' }

export function setSite(d: SiteData) {
  Object.assign(S, d)
}
export type * from './types'
