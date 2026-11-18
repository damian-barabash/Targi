// Biblioteka mediów: wgrywanie (zmniejszanie i zapis WebP w przeglądarce), wybór zdjęcia do pola.
import { useEffect, useRef, useState } from 'react'
import { STORAGE, db } from './api'
import { canEdit, fail, toast, useStore } from './store'
import { Btn, Empty, Icon, Modal, Spinner, Tabs } from './ui'

export type MediaRow = { id: string; name: string; alt: string; width: number; height: number; bytes: number; created_at: string }

export const BUILTIN = 'event-audience event-booth event-hall event-mic event-networking event-speaker event-stage expert-1 expert-2 expert-3 expert-4 expert-5 expert-6 hair-blowdry hero mc-blowdry mc-seminar mc-team nails-dark news-facial news-wash portrait-bun salon-modern salon-pink strip-show zone-barber zone-cosmetology zone-hair zone-nails'.split(' ')

/** Adres miniatury w panelu (zdjęcia z biblioteki czytamy wprost z magazynu). */
export function thumb(ref: string | undefined): string {
  if (!ref) return ''
  if (ref.startsWith('media:')) return `${STORAGE}/${ref.slice(6)}-800.webp`
  if (/^(https?:|data:|\/)/.test(ref)) return ref
  return `${import.meta.env.BASE_URL}img/${ref}-800.webp`
}

export const CROPS: { value: string; label: string; ratio?: number }[] = [
  { value: 'orig', label: 'Bez przycinania' },
  { value: '1:1', label: 'Kwadrat 1:1', ratio: 1 },
  { value: '4:5', label: 'Pion 4:5 (portrety)', ratio: 4 / 5 },
  { value: '3:2', label: 'Poziom 3:2', ratio: 3 / 2 },
  { value: '16:9', label: 'Panorama 16:9', ratio: 16 / 9 },
  { value: '21:8', label: 'Szeroki pas 21:8', ratio: 21 / 8 },
]

/** Zmniejsza zdjęcie do 800 / 1600 / 2400 px (bez powiększania), zapisuje WebP i dodaje do biblioteki. */
export async function uploadImage(file: File, ratio?: number): Promise<MediaRow> {
  if (!/^image\//.test(file.type)) throw new Error(`${file.name}: to nie jest plik graficzny.`)
  if (file.size > 40_000_000) throw new Error(`${file.name}: plik jest za duży (maks. 40 MB).`)
  const bmp = await createImageBitmap(file).catch(() => null)
  let src: CanvasImageSource
  let sw: number
  let sh: number
  if (bmp) {
    src = bmp
    sw = bmp.width
    sh = bmp.height
  } else {
    // SVG i nietypowe formaty: przez <img>
    const img = new Image()
    img.src = URL.createObjectURL(file)
    await img.decode().catch(() => {
      throw new Error(`${file.name}: nie udało się odczytać obrazu.`)
    })
    src = img
    sw = img.naturalWidth || 1600
    sh = img.naturalHeight || 1600
  }
  // przycięcie do środka
  let cx = 0
  let cy = 0
  let cw = sw
  let ch = sh
  if (ratio) {
    if (sw / sh > ratio) {
      cw = Math.round(sh * ratio)
      cx = Math.round((sw - cw) / 2)
    } else {
      ch = Math.round(sw / ratio)
      cy = Math.round((sh - ch) / 2)
    }
  }
  const id = crypto.randomUUID()
  let bytes = 0
  for (const w of [800, 1600, 2400]) {
    const tw = Math.min(w, cw)
    const th = Math.round((tw / cw) * ch)
    const c = document.createElement('canvas')
    c.width = tw
    c.height = th
    const g = c.getContext('2d')!
    g.imageSmoothingQuality = 'high'
    g.drawImage(src, cx, cy, cw, ch, 0, 0, tw, th)
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', w === 800 ? 0.8 : 0.84))
    if (!blob) throw new Error('Ta przeglądarka nie zapisuje WebP — użyj Chrome, Edge, Firefox lub Safari 16+.')
    if (w === 1600) bytes = blob.size
    const { error } = await db.storage.from('media').upload(`${id}-${w}.webp`, blob, { contentType: 'image/webp', cacheControl: '31536000' })
    if (error) throw new Error(error.message)
  }
  const row = { id, name: file.name.replace(/\.[^.]+$/, '').slice(0, 120), alt: '', width: cw, height: ch, bytes }
  const { data, error } = await db.from('media').insert(row).select().single()
  if (error) throw new Error(error.message)
  return data as MediaRow
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
      .select('id,name,alt,width,height,bytes,created_at')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data, error }) => (error ? fail(error) : setRows((data ?? []) as MediaRow[])))
  useEffect(() => {
    load()
  }, [])
  return { rows, load, setRows }
}

export function Uploader({ onDone, compact }: { onDone: (rows: MediaRow[]) => void; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState('')
  const [crop, setCrop] = useState('orig')
  const [over, setOver] = useState(false)
  const allowed = useStore((s) => s.me?.role !== 'reports')

  async function run(files: FileList | File[]) {
    const list = [...files]
    const out: MediaRow[] = []
    const ratio = CROPS.find((c) => c.value === crop)?.ratio
    for (let i = 0; i < list.length; i++) {
      setBusy(`Wgrywam ${i + 1} z ${list.length}…`)
      try {
        out.push(await uploadImage(list[i], ratio))
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
        <span>JPG, PNG, WebP lub SVG. Panel sam zmniejszy je i zapisze w lekkim formacie.</span>
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
let pickImpl: (current?: string) => Promise<string | null> = async () => null
/** Otwiera bibliotekę i zwraca wybrane zdjęcie ("media:<id>" lub nazwę zdjęcia strony), '' = usuń, null = anulowano. */
export const pickMedia = (current?: string) => pickImpl(current)

export function MediaPickerHost() {
  const [open, setOpen] = useState<{ current?: string; done: (v: string | null) => void } | null>(null)
  useEffect(() => {
    pickImpl = (current) => new Promise((done) => setOpen({ current, done }))
  }, [])
  if (!open) return null
  const close = (v: string | null) => {
    open.done(v)
    setOpen(null)
  }
  return <Picker current={open.current} onPick={close} />
}

function Picker({ current, onPick }: { current?: string; onPick: (v: string | null) => void }) {
  const { rows, setRows } = useMedia()
  const [tab, setTab] = useState<'lib' | 'site'>(current && !current.startsWith('media:') ? 'site' : 'lib')
  const [q, setQ] = useState('')
  const list = (rows ?? []).filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <Modal
      wide
      title="Wybierz zdjęcie"
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
          {canEdit('settings') || canEdit('posts') || canEdit('exhibitors') || canEdit('tickets') ? <Uploader compact onDone={(n) => (n.length === 1 ? onPick(`media:${n[0].id}`) : setRows((r) => [...n, ...(r ?? [])]))} /> : null}
          {!rows ? (
            <Spinner />
          ) : !list.length ? (
            <Empty icon="image" title="Biblioteka jest pusta">
              Wgraj pierwsze zdjęcie albo wybierz jedno z zakładki „Zdjęcia strony”.
            </Empty>
          ) : (
            <div className="mgrid">
              {list.map((r) => (
                <button key={r.id} className={`mitem ${current === `media:${r.id}` ? 'mitem--on' : ''}`} onClick={() => onPick(`media:${r.id}`)} title={r.name}>
                  <img src={thumb(`media:${r.id}`)} alt={r.alt || r.name} loading="lazy" />
                  <span>{r.name}</span>
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
