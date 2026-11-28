// Biblioteka mediów: wgrywanie (zmniejszanie i zapis WebP w przeglądarce), asystent kadru i logotypów, wybór zdjęcia do pola.
import { useEffect, useRef, useState } from 'react'
import { STORAGE, db } from './api'
import { canEdit, fail, toast, useStore } from './store'
import { Btn, Empty, Icon, Modal, Spinner, Tabs } from './ui'
import { analyze, cropAround, processLogo, toCanvas, type Face } from './imageai'

export type MediaRow = {
  id: string
  name: string
  alt: string
  width: number
  height: number
  bytes: number
  created_at: string
  focus_x?: number | null
  focus_y?: number | null
  kind?: 'photo' | 'logo'
  ai?: { faces?: Face[]; note?: string; bg?: string } | null
  updated_at?: string
}
export const MEDIA_COLS = 'id,name,alt,width,height,bytes,created_at,focus_x,focus_y,kind,ai,updated_at'

export const BUILTIN = 'harry-cut promo-spotkajmy promo-ambasador promo-zarezerwuj promo-wystawca promo-stoisko promo-partner brush-powder brushes-dark hands-brushes z-hair z-makeup z-nails z-cosmetology z-barber event-audience event-booth event-hall event-mic event-networking event-speaker event-stage expert-1 expert-2 expert-3 expert-4 expert-5 expert-6 hair-blowdry hero mc-blowdry mc-seminar mc-team nails-dark news-facial news-wash portrait-bun salon-modern salon-pink strip-show zone-barber zone-cosmetology zone-hair zone-nails'.split(' ')

/** Adres miniatury w panelu (zdjęcia z biblioteki czytamy wprost z magazynu). */
export function thumb(ref: string | undefined): string {
  if (!ref) return ''
  if (ref.startsWith('media:')) return `${STORAGE}/${ref.slice(6)}-800.webp`
  if (/^(https?:|data:|\/)/.test(ref)) return ref
  return `${import.meta.env.BASE_URL}img/${ref}-800.webp`
}

export const CROPS: { value: string; label: string; ratio?: number }[] = [
  { value: 'auto', label: 'Asystent: sam rozpozna zdjęcie lub logo' },
  { value: 'logo', label: 'Logo: usuń tło i przytnij' },
  { value: 'orig', label: 'Zdjęcie bez przycinania' },
  { value: '1:1', label: 'Kwadrat 1:1', ratio: 1 },
  { value: '4:5', label: 'Pion 4:5 (portrety)', ratio: 4 / 5 },
  { value: '3:2', label: 'Poziom 3:2', ratio: 3 / 2 },
  { value: '16:9', label: 'Panorama 16:9', ratio: 16 / 9 },
  { value: '21:8', label: 'Szeroki pas 21:8', ratio: 21 / 8 },
]

async function readImage(file: Blob, name: string): Promise<{ src: CanvasImageSource; sw: number; sh: number }> {
  const bmp = await createImageBitmap(file).catch(() => null)
  if (bmp) return { src: bmp, sw: bmp.width, sh: bmp.height }
  // SVG i nietypowe formaty: przez <img>
  const img = new Image()
  img.src = URL.createObjectURL(file)
  await img.decode().catch(() => {
    throw new Error(`${name}: nie udało się odczytać obrazu.`)
  })
  return { src: img, sw: img.naturalWidth || 1600, sh: img.naturalHeight || 1600 }
}

/** Zapisuje 800 / 1600 / 2400 px (bez powiększania) jako WebP pod nowym id. */
async function storeVariants(src: CanvasImageSource, box: { cx: number; cy: number; cw: number; ch: number }): Promise<{ id: string; bytes: number }> {
  const id = crypto.randomUUID()
  let bytes = 0
  for (const w of [800, 1600, 2400]) {
    const tw = Math.min(w, box.cw)
    const th = Math.round((tw / box.cw) * box.ch)
    const c = document.createElement('canvas')
    c.width = tw
    c.height = th
    const g = c.getContext('2d')!
    g.imageSmoothingQuality = 'high'
    g.drawImage(src, box.cx, box.cy, box.cw, box.ch, 0, 0, tw, th)
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', w === 800 ? 0.8 : 0.84))
    if (!blob) throw new Error('Ta przeglądarka nie zapisuje WebP — użyj Chrome, Edge, Firefox lub Safari 16+.')
    if (w === 1600) bytes = blob.size
    const { error } = await db.storage.from('media').upload(`${id}-${w}.webp`, blob, { contentType: 'image/webp', cacheControl: '31536000' })
    if (error) throw new Error(error.message)
  }
  return { id, bytes }
}

/**
 * Wgrywa zdjęcie. Tryb „auto”: asystent rozpoznaje logo (usuwa tło, przycina) albo zdjęcie
 * (szuka twarzy i zapisuje punkt kadru). Przy wybranej proporcji przycina wokół twarzy, nie środka.
 */
export async function uploadImage(file: File, mode = 'auto', onNote?: (s: string) => void): Promise<MediaRow> {
  if (!/^image\//.test(file.type)) throw new Error(`${file.name}: to nie jest plik graficzny.`)
  if (file.size > 40_000_000) throw new Error(`${file.name}: plik jest za duży (maks. 40 MB).`)
  const { src, sw, sh } = await readImage(file, file.name)
  const name = file.name.replace(/\.[^.]+$/, '').slice(0, 120)
  const ratio = CROPS.find((c) => c.value === mode)?.ratio
  const a = mode === 'orig' ? null : await analyze(src, sw, sh, mode === 'logo' ? 'logo' : name)
  let source: CanvasImageSource = src
  let box = { cx: 0, cy: 0, cw: sw, ch: sh }
  let note = a?.note ?? ''
  let kind: 'photo' | 'logo' = 'photo'
  if (a && a.kind === 'logo' && !ratio) {
    const big = toCanvas(src, sw, sh, 2400)
    const r = processLogo(big)
    source = r.canvas
    box = { cx: 0, cy: 0, cw: r.canvas.width, ch: r.canvas.height }
    note = r.note
    kind = 'logo'
  } else if (ratio) {
    box = cropAround(sw, sh, ratio, a?.focus.x, a?.focus.y)
  }
  // punkt kadru po przycięciu (w % nowego obrazu)
  let fx = a && kind === 'photo' ? a.focus.x : 50
  let fy = a && kind === 'photo' ? a.focus.y : 50
  if (kind === 'photo' && (box.cw !== sw || box.ch !== sh)) {
    fx = Math.min(100, Math.max(0, (((fx / 100) * sw - box.cx) / box.cw) * 100))
    fy = Math.min(100, Math.max(0, (((fy / 100) * sh - box.cy) / box.ch) * 100))
  }
  const { id, bytes } = await storeVariants(source, box)
  const faces = (a?.faces ?? []).map((f) => ({ ...f, x: ((f.x / 100) * sw - box.cx) / box.cw * 100, y: ((f.y / 100) * sh - box.cy) / box.ch * 100, w: (f.w / 100) * sw / box.cw * 100, h: (f.h / 100) * sh / box.ch * 100 }))
  const row = { id, name, alt: '', width: box.cw, height: box.ch, bytes, kind, focus_x: Math.round(fx * 10) / 10, focus_y: Math.round(fy * 10) / 10, ai: a ? { faces, note, bg: a.bg } : null }
  const { data, error } = await db.from('media').insert(row).select(MEDIA_COLS).single()
  if (error) throw new Error(error.message)
  if (note) onNote?.(note)
  return data as MediaRow
}

/** Pobiera największą wersję pliku z biblioteki (do ponownej obróbki). */
async function fetchLargest(id: string): Promise<Blob> {
  for (const w of [2400, 1600, 800]) {
    const res = await fetch(`${STORAGE}/${id}-${w}.webp`, { cache: 'no-store' })
    if (res.ok) return res.blob()
  }
  throw new Error('Nie udało się pobrać pliku z biblioteki.')
}

/** Asystent dla istniejącego zdjęcia: wykrywa twarze i zapisuje punkt kadru (plik bez zmian). */
export async function autoFocus(row: MediaRow): Promise<MediaRow> {
  const { src, sw, sh } = await readImage(await fetchLargest(row.id), row.name)
  const a = await analyze(src, sw, sh, '')
  const patch = { focus_x: a.focus.x, focus_y: a.focus.y, ai: { faces: a.faces, note: a.note, bg: a.bg }, updated_at: new Date().toISOString() }
  const { data, error } = await db.from('media').update(patch).eq('id', row.id).select(MEDIA_COLS).single()
  if (error) throw new Error(error.message)
  return data as MediaRow
}

/** Zapis punktu kadru ustawionego ręcznie. */
export async function setFocus(row: MediaRow, x: number, y: number): Promise<MediaRow> {
  const { data, error } = await db.from('media').update({ focus_x: x, focus_y: y, updated_at: new Date().toISOString() }).eq('id', row.id).select(MEDIA_COLS).single()
  if (error) throw new Error(error.message)
  return data as MediaRow
}

/**
 * Logo z istniejącego pliku: usuwa tło i przycina. Powstaje NOWY plik (stary adres może być w pamięci
 * przeglądarek i CDN) — odwołania w treści trzeba podmienić (replaceRef) i zapisać.
 */
export async function makeLogo(row: MediaRow): Promise<{ row: MediaRow; note: string }> {
  const { src, sw, sh } = await readImage(await fetchLargest(row.id), row.name)
  const r = processLogo(toCanvas(src, sw, sh, 2400))
  const { id, bytes } = await storeVariants(r.canvas, { cx: 0, cy: 0, cw: r.canvas.width, ch: r.canvas.height })
  const ins = { id, name: row.name.replace(/( · logo)?$/, ' · logo'), alt: row.alt, width: r.canvas.width, height: r.canvas.height, bytes, kind: 'logo', focus_x: 50, focus_y: 50, ai: { note: r.note } }
  const { data, error } = await db.from('media').insert(ins).select(MEDIA_COLS).single()
  if (error) throw new Error(error.message)
  return { row: data as MediaRow, note: r.note }
}

export async function deleteMedia(id: string) {
  await db.storage.from('media').remove([800, 1600, 2400].map((w) => `${id}-${w}.webp`))
  const { error } = await db.from('media').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export function useMedia() {
  const [rows, setRows] = useState<MediaRow[] | null>(null)
  const load = () =>
    db
      .from('media')
      .select(MEDIA_COLS)
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data, error }) => (error ? fail(error) : setRows((data ?? []) as MediaRow[])))
  useEffect(() => {
    load()
  }, [])
  return { rows, load, setRows }
}

export function Uploader({ onDone, compact, mode = 'auto' }: { onDone: (rows: MediaRow[]) => void; compact?: boolean; mode?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState('')
  const [crop, setCrop] = useState(mode)
  const [over, setOver] = useState(false)
  const allowed = useStore((s) => s.me?.role !== 'reports')

  async function run(files: FileList | File[]) {
    const list = [...files]
    const out: MediaRow[] = []
    for (let i = 0; i < list.length; i++) {
      setBusy(`Wgrywam ${i + 1} z ${list.length}…`)
      try {
        out.push(await uploadImage(list[i], crop, list.length === 1 ? (n) => toast(`Asystent: ${n}`) : undefined))
      } catch (e) {
        fail(e)
      }
    }
    setBusy('')
    if (out.length) {
      toast(out.length === 1 ? 'Zdjęcie dodane do biblioteki' : `Dodano ${out.length} zdjęć`)
      onDone(out)
    }
  }
  if (!allowed) return null
  return (
    <div
      className={`drop ${over ? 'drop--over' : ''} ${compact ? 'drop--compact' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        run(e.dataTransfer.files)
      }}
    >
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && run(e.target.files).then(() => (e.target.value = ''))} />
      <Icon n="upload" s={22} />
      <div className="drop__txt">
        <strong>{busy || 'Przeciągnij zdjęcia tutaj'}</strong>
        <span>JPG, PNG, WebP lub SVG. Asystent sam usunie tło logo i ustawi kadr na twarz.</span>
      </div>
      <select className="in in--sm" value={crop} onChange={(e) => setCrop(e.target.value)} aria-label="Przycinanie">
        {CROPS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <Btn kind="primary" icon="upload" busy={!!busy} onClick={() => input.current?.click()}>
        Wybierz pliki
      </Btn>
    </div>
  )
}

/* ───────── wybór zdjęcia (okno) ───────── */
let pickImpl: (current?: string, mode?: string) => Promise<string | null> = async () => null
/** Otwiera bibliotekę i zwraca wybrane zdjęcie ("media:<id>" lub nazwę zdjęcia strony), '' = usuń, null = anulowano. mode = 'logo' dla pól z logotypem. */
export const pickMedia = (current?: string, mode = 'auto') => pickImpl(current, mode)

export function MediaPickerHost() {
  const [open, setOpen] = useState<{ current?: string; mode?: string; done: (v: string | null) => void } | null>(null)
  useEffect(() => {
    pickImpl = (current, mode) => new Promise((done) => setOpen({ current, mode, done }))
  }, [])
  if (!open) return null
  const close = (v: string | null) => {
    open.done(v)
    setOpen(null)
  }
  return <Picker current={open.current} mode={open.mode} onPick={close} />
}

function Picker({ current, mode, onPick }: { current?: string; mode?: string; onPick: (v: string | null) => void }) {
  const { rows, setRows } = useMedia()
  const [tab, setTab] = useState<'lib' | 'site'>(current && !current.startsWith('media:') ? 'site' : 'lib')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState('')
  const list = (rows ?? []).filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
  // pole z logotypem: plik, który nie przeszedł jeszcze przez asystenta, od razu dostaje przezroczyste tło
  const choose = async (r: MediaRow) => {
    if (mode !== 'logo' || r.kind === 'logo') return onPick(`media:${r.id}`)
    setBusy(r.id)
    try {
      const out = await makeLogo(r)
      toast(`Asystent: ${out.note}`)
      onPick(`media:${out.row.id}`)
    } catch (e) {
      fail(e)
      onPick(`media:${r.id}`)
    }
  }
  return (
    <Modal
      wide
      title={mode === 'logo' ? 'Wybierz logo' : 'Wybierz zdjęcie'}
      onClose={() => onPick(null)}
      footer={
        <>
          {current && (
            <Btn kind="danger" icon="trash" onClick={() => onPick('')}>
              Usuń zdjęcie z pola
            </Btn>
          )}
          <span className="grow" />
          <Btn onClick={() => onPick(null)}>Anuluj</Btn>
        </>
      }
    >
      <div className="row row--between">
        <Tabs value={tab} onChange={setTab} items={[{ value: 'lib', label: 'Biblioteka', count: rows?.length }, { value: 'site', label: 'Zdjęcia strony', count: BUILTIN.length }]} />
        {tab === 'lib' && (
          <label className="search">
            <Icon n="search" s={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj po nazwie…" />
          </label>
        )}
      </div>
      {tab === 'lib' ? (
        <>
          {canEdit('settings') || canEdit('posts') || canEdit('exhibitors') || canEdit('tickets') ? <Uploader compact mode={mode} onDone={(n) => (n.length === 1 ? onPick(`media:${n[0].id}`) : setRows((r) => [...n, ...(r ?? [])]))} /> : null}
          {!rows ? (
            <Spinner />
          ) : !list.length ? (
            <Empty icon="image" title="Biblioteka jest pusta">
              Wgraj pierwsze zdjęcie albo wybierz jedno z zakładki „Zdjęcia strony”.
            </Empty>
          ) : (
            <div className="mgrid">
              {list.map((r) => (
                <button key={r.id} className={`mitem ${current === `media:${r.id}` ? 'mitem--on' : ''} ${r.kind === 'logo' ? 'mitem--logo' : ''}`} onClick={() => choose(r)} disabled={!!busy} title={r.name}>
                  <img src={thumb(`media:${r.id}`)} alt={r.alt || r.name} loading="lazy" />
                  <span>{busy === r.id ? 'Asystent usuwa tło…' : r.name}</span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="mgrid">
          {BUILTIN.map((n) => (
            <button key={n} className={`mitem ${current === n ? 'mitem--on' : ''}`} onClick={() => onPick(n)} title={n}>
              <img src={thumb(n)} alt={n} loading="lazy" />
              <span>{n}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
