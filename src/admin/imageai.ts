// Asystent zdjęć (działa w przeglądarce, bez wysyłania zdjęć na zewnątrz):
// • zdjęcia — wykrywa twarze (MediaPipe BlazeFace) i ustawia punkt kadru, żeby przy przycinaniu
//   do kwadratu, pionu czy pasa nie ucinało głowy;
// • logotypy — usuwa jednolite tło (białe, czarne, kolorowe), wycina puste marginesy
//   i zostawia równy, przezroczysty margines, żeby wszystkie logo stały na stronie tak samo.

export type Face = { x: number; y: number; w: number; h: number; score: number }
export type Analysis = {
  kind: 'photo' | 'logo'
  /** punkt kadru w % szerokości i wysokości */
  focus: { x: number; y: number }
  faces: Face[]
  /** tło logo: przezroczyste, jednolite (do usunięcia) albo złożone */
  bg: 'transparent' | 'uniform' | 'complex'
  note: string
}

const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'

let detector: Promise<any> | null = null
function getDetector() {
  detector ??= (async () => {
    const V: any = await import(/* @vite-ignore */ `${MP}/vision_bundle.mjs`)
    const files = await V.FilesetResolver.forVisionTasks(`${MP}/wasm`)
    return V.FaceDetector.createFromOptions(files, {
      baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.55,
    })
  })().catch((e) => {
    detector = null
    throw e
  })
  return detector
}

/** Kopia obrazu w canvasie (opcjonalnie zmniejszona). */
export function toCanvas(src: CanvasImageSource, sw: number, sh: number, max = 0): HTMLCanvasElement {
  const k = max && Math.max(sw, sh) > max ? max / Math.max(sw, sh) : 1
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(sw * k))
  c.height = Math.max(1, Math.round(sh * k))
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.imageSmoothingQuality = 'high'
  g.drawImage(src, 0, 0, c.width, c.height)
  return c
}

/** Twarze w % obrazu. Przy błędzie sieci zwraca []. */
export async function detectFaces(c: HTMLCanvasElement): Promise<Face[]> {
  try {
    const det = await getDetector()
    // model „short range” lubi twarze średniej wielkości — sprawdzamy całość i powiększony środek
    const res = det.detect(c)
    const out: Face[] = (res.detections ?? []).map((d: any) => ({
      x: (d.boundingBox.originX / c.width) * 100,
      y: (d.boundingBox.originY / c.height) * 100,
      w: (d.boundingBox.width / c.width) * 100,
      h: (d.boundingBox.height / c.height) * 100,
      score: d.categories?.[0]?.score ?? 0,
    }))
    return out.filter((f) => f.w > 1.5 && f.h > 1.5).sort((a, b) => b.w * b.h - a.w * a.h)
  } catch {
    return []
  }
}

/** Punkt kadru z twarzy: środek grupy twarzy, oczy nieco powyżej środka ramki. */
export function focusFromFaces(faces: Face[]): { x: number; y: number } | null {
  if (!faces.length) return null
  const main = faces[0]
  // twarze dużo mniejsze od głównej pomijamy (tło, widownia)
  const group = faces.filter((f) => f.w * f.h > main.w * main.h * 0.35)
  const x1 = Math.min(...group.map((f) => f.x))
  const x2 = Math.max(...group.map((f) => f.x + f.w))
  const y1 = Math.min(...group.map((f) => f.y))
  const y2 = Math.max(...group.map((f) => f.y + f.h))
  return { x: clamp((x1 + x2) / 2), y: clamp(y1 + (y2 - y1) * 0.4) }
}

const clamp = (v: number) => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10

/* ───────── logotypy ───────── */

type Px = Uint8ClampedArray
const dist = (d: Px, i: number, c: number[]) => Math.hypot(d[i] - c[0], d[i + 1] - c[1], d[i + 2] - c[2])

/** Analiza ramki obrazu: czy tło jest przezroczyste, jednolite czy złożone. */
export function borderInfo(c: HTMLCanvasElement): { bg: Analysis['bg']; color: number[]; colors: number } {
  const g = c.getContext('2d', { willReadFrequently: true })!
  const { width: w, height: h } = c
  const d = g.getImageData(0, 0, w, h).data
  const idx: number[] = []
  const step = Math.max(1, Math.round((w + h) / 400))
  for (let x = 0; x < w; x += step) idx.push(x * 4, ((h - 1) * w + x) * 4)
  for (let y = 0; y < h; y += step) idx.push(y * w * 4, (y * w + w - 1) * 4)
  const transparent = idx.filter((i) => d[i + 3] < 24).length / idx.length
  // ile kolorów ma cały obraz (logo: mało, zdjęcie: tysiące)
  const seen = new Set<number>()
  const s2 = Math.max(1, Math.floor((w * h) / 40000))
  for (let i = 0; i < w * h; i += s2) {
    const p = i * 4
    if (d[p + 3] < 24) continue
    seen.add(((d[p] >> 4) << 8) | ((d[p + 1] >> 4) << 4) | (d[p + 2] >> 4))
  }
  if (transparent > 0.6) return { bg: 'transparent', color: [0, 0, 0], colors: seen.size }
  const opaque = idx.filter((i) => d[i + 3] >= 24)
  const med = [0, 1, 2].map((k) => {
    const v = opaque.map((i) => d[i + k]).sort((a, b) => a - b)
    return v[Math.floor(v.length / 2)] ?? 255
  })
  const near = opaque.filter((i) => dist(d, i, med) < 26).length / Math.max(1, opaque.length)
  return { bg: near > 0.88 ? 'uniform' : 'complex', color: med, colors: seen.size }
}

/** Usuwa tło w kolorze `bg` (miękka krawędź, odbarwienie obwódki). */
export function removeBackground(c: HTMLCanvasElement, bg: number[], t1 = 20, t2 = 64) {
  const g = c.getContext('2d', { willReadFrequently: true })!
  const im = g.getImageData(0, 0, c.width, c.height)
  const d = im.data
  for (let i = 0; i < d.length; i += 4) {
    const e = dist(d, i, bg)
    if (e <= t1) d[i + 3] = 0
    else if (e < t2) {
      const a = (e - t1) / (t2 - t1)
      for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, (d[i + k] - bg[k] * (1 - a)) / a))
      d[i + 3] = Math.round(d[i + 3] * a)
    }
  }
  g.putImageData(im, 0, 0)
}

/** Przycina puste (przezroczyste) marginesy i dodaje równy margines `pad` (część dłuższego boku). */
export function trim(c: HTMLCanvasElement, pad = 0.06): HTMLCanvasElement {
  const g = c.getContext('2d', { willReadFrequently: true })!
  const { width: w, height: h } = c
  const d = g.getImageData(0, 0, w, h).data
  let x1 = w, y1 = h, x2 = -1, y2 = -1
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] > 12) {
        if (x < x1) x1 = x
        if (x > x2) x2 = x
        if (y < y1) y1 = y
        if (y > y2) y2 = y
      }
  if (x2 < 0) return c
  const bw = x2 - x1 + 1
  const bh = y2 - y1 + 1
  const p = Math.round(Math.max(bw, bh) * pad)
  const out = document.createElement('canvas')
  out.width = bw + p * 2
  out.height = bh + p * 2
  out.getContext('2d')!.drawImage(c, x1, y1, bw, bh, p, p, bw, bh)
  return out
}

/** Średnia jasność widocznych pikseli (0–1) — czy logo nie zniknie na jasnym tle. */
export function inkLightness(c: HTMLCanvasElement): number {
  const d = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height).data
  let sum = 0
  let n = 0
  for (let i = 0; i < d.length; i += 16) {
    if (d[i + 3] < 128) continue
    sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255
    n++
  }
  return n ? sum / n : 0
}

/** Gotowe logo: bez tła, przycięte, z równym marginesem. */
export function processLogo(src: HTMLCanvasElement): { canvas: HTMLCanvasElement; note: string } {
  const c = toCanvas(src, src.width, src.height)
  const info = borderInfo(c)
  let note = 'Logo przycięte do treści.'
  if (info.bg === 'uniform') {
    const probe = toCanvas(c, c.width, c.height)
    removeBackground(probe, info.color)
    const light = inkLightness(trim(probe, 0))
    // jasne logo na jasnym tle po usunięciu tła byłoby niewidoczne — zostawiamy tło
    if (light > 0.86 && info.color[0] + info.color[1] + info.color[2] < 200) {
      note = 'Jasne logo na ciemnym tle — tło zostawione, żeby logo było widoczne.'
      return { canvas: trim(c, 0.08), note }
    }
    removeBackground(c, info.color)
    note = `Usunięto tło (${info.color[0] + info.color[1] + info.color[2] > 600 ? 'białe' : 'jednolite'}) i przycięto marginesy.`
  } else if (info.bg === 'complex') {
    return { canvas: c, note: 'Tło logo jest złożone (zdjęcie lub wzór) — zostawione bez zmian.' }
  }
  return { canvas: trim(c), note }
}

/** Rozpoznanie: logo czy zdjęcie + punkt kadru. */
export async function analyze(src: CanvasImageSource, sw: number, sh: number, name = ''): Promise<Analysis> {
  const small = toCanvas(src, sw, sh, 640)
  const info = borderInfo(small)
  const byName = /logo|logotyp|brand|sygnet/i.test(name)
  const logoish = info.bg === 'transparent' || (info.bg === 'uniform' && info.colors < 900)
  if (byName || logoish) {
    return { kind: 'logo', focus: { x: 50, y: 50 }, faces: [], bg: info.bg, note: 'Rozpoznano logo.' }
  }
  const faces = await detectFaces(small)
  const f = focusFromFaces(faces)
  return {
    kind: 'photo',
    focus: f ?? { x: 50, y: sh > sw ? 38 : 45 },
    faces,
    bg: info.bg,
    note: f ? (faces.length === 1 ? 'Wykryto twarz — kadr ustawiony na nią.' : `Wykryto ${faces.length} twarze — kadr obejmuje grupę.`) : 'Bez twarzy — kadr na środku kompozycji.',
  }
}

/** Wycinek o proporcji `ratio`, możliwie wyśrodkowany na punkcie kadru. */
export function cropAround(sw: number, sh: number, ratio: number, fx = 50, fy = 50) {
  let cw = sw
  let ch = sh
  if (sw / sh > ratio) cw = Math.round(sh * ratio)
  else ch = Math.round(sw / ratio)
  const cx = Math.round(Math.min(sw - cw, Math.max(0, (fx / 100) * sw - cw / 2)))
  const cy = Math.round(Math.min(sh - ch, Math.max(0, (fy / 100) * sh - ch / 2)))
  return { cx, cy, cw, ch }
}
