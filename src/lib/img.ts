const BASE = import.meta.env.BASE_URL

/** Zdjęcia z public/img: <name>-800.webp i <name>-1600.webp */
export function imgSrc(name: string, w: 800 | 1600 = 1600) {
  return `${BASE}img/${name}-${w}.webp`
}
export function imgSet(name: string) {
  return `${imgSrc(name, 800)} 800w, ${imgSrc(name, 1600)} 1600w`
}
