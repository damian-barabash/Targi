// Asystent zdjęć w bibliotece: punkt kadru (twarz) z podglądem w różnych proporcjach,
// zamiana pliku w logo z przezroczystym tłem i hurtowa poprawa całej biblioteki.
import { useRef, useState } from 'react'
import { STORAGE } from '../api'
import { fail, get, mutate, save, toast } from '../store'
import { autoFocus, makeLogo, setFocus, type MediaRow } from '../media'
import { Btn } from '../ui'
import type { SiteData } from '../../content/types'

const RATIOS: { label: string; r: number }[] = [
  { label: '1:1', r: 1 },
  { label: '4:5', r: 4 / 5 },
  { label: '3:4', r: 3 / 4 },
  { label: '16:9', r: 16 / 9 },
  { label: '21:8', r: 21 / 8 },
]

/** Podmienia odwołanie do pliku we wszystkich treściach wersji roboczej. Zwraca liczbę zmienionych sekcji. */
export function replaceRef(from: string, to: string): number {
  const site = get().site
  const keys: string[] = []
  const next: any = { ...site }
  for (const [k, v] of Object.entries(site)) {
    if (k === 'pages' || k === 'media' || k === 'edition') continue
    const s = JSON.stringify(v)
    if (s?.includes(from)) {
      next[k] = JSON.parse(s.split(from).join(to))
      keys.push(k)
    }
  }
  next.pages = site.pages.map((p) => {
    const s = JSON.stringify(p)
    if (!s.includes(from)) return p
    keys.push(`page:${p.id}`)
    return JSON.parse(s.split(from).join(to))
  })
  if (keys.length) mutate(() => next as SiteData, keys)
  return keys.length
}

/** Pliki, które są gdzieś użyte jako logo (partnerzy, wystawcy, logo strony). */
export function logoRefs(site: SiteData): Set<string> {
  const out = new Set<string>()
  const walk = (v: any, key = '') => {
    if (typeof v === 'string') {
      if (/^(logo|logoImg)$/.test(key) && v.startsWith('media:')) out.add(v)
    } else if (Array.isArray(v)) v.forEach((x) => walk(x))
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k)
  }
  walk(site.partners)
  walk(site.exhibitors)
  walk(site.settings)
  return out
}

/** Punkt kadru od razu widoczny w podglądzie edytora (mapa media w wersji roboczej). */
export function syncMeta(r: MediaRow) {
  const site = get().site
  site.media = { ...(site.media ?? {}), [r.id]: [r.focus_x ?? 50, r.focus_y ?? 50, r.width / Math.max(1, r.height), r.kind ?? 'photo'] }
}

export function FocusEditor({ row, onChange: emitChange, readOnly }: { row: MediaRow; onChange: (r: MediaRow) => void; readOnly?: boolean }) {
  const onChange = (r: MediaRow) => {
    syncMeta(r)
    emitChange(r)
  }
  const box = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState('')
  const fx = row.focus_x ?? 50
  const fy = row.focus_y ?? 50
  const src = `${STORAGE}/${row.id}-1600.webp`
  const logo = row.kind === 'logo'

  const place = async (e: React.MouseEvent) => {
    if (readOnly || logo) return
    const r = box.current!.getBoundingClientRect()
    const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10
    const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10
    onChange({ ...row, focus_x: x, focus_y: y })
    try {
      onChange(await setFocus(row, x, y))
    } catch (err) {
      fail(err)
    }
  }
  const detect = async () => {
    setBusy('face')
    try {
      const r = await autoFocus(row)
      onChange(r)
      toast(`Asystent: ${r.ai?.note ?? 'gotowe'}`)
    } catch (e) {
      fail(e)
    }
    setBusy('')
  }
  const toLogo = async () => {
    setBusy('logo')
    try {
      const out = await makeLogo(row)
      const n = replaceRef(`media:${row.id}`, `media:${out.row.id}`)
      if (n) await save()
      toast(`Asystent: ${out.note}${n ? ' Podmieniono na stronie (wersja robocza).' : ''}`)
      onChange(out.row)
    } catch (e) {
      fail(e)
    }
    setBusy('')
  }

  return (
    <div className="fx">
      <div ref={box} className={`fx__stage ${logo ? 'fx__stage--logo' : ''}`} onClick={place} title={logo ? '' : 'Kliknij, aby ustawić najważniejszy punkt zdjęcia'}>
        <img src={src} alt={row.alt} />
        {!logo &&
          (row.ai?.faces ?? []).map((f, i) => <span key={i} className="fx__face" style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.w}%`, height: `${f.h}%` }} />)}
        {!logo && <span className="fx__dot" style={{ left: `${fx}%`, top: `${fy}%` }} />}
      </div>
      {!logo ? (
        <>
          <p className="fx__note">
            {row.ai?.note ? `Asystent: ${row.ai.note} ` : ''}Kliknij zdjęcie, aby ustawić punkt, który zawsze ma być widoczny. Strona przytnie zdjęcie wokół niego w każdym formacie:
          </p>
          <div className="fx__prev">
            {RATIOS.map((x) => (
              <figure key={x.label}>
                <div style={{ aspectRatio: String(x.r) }}>
                  <img src={`${STORAGE}/${row.id}-800.webp`} alt="" style={{ objectPosition: `${fx}% ${fy}%` }} />
                </div>
                <figcaption>{x.label}</figcaption>
              </figure>
            ))}
          </div>
        </>
      ) : (
        <p className="fx__note">To jest logo: przezroczyste tło, równy margines. Na stronie wszystkie logotypy mają tę samą optyczną wielkość.{row.ai?.note ? ` ${row.ai.note}` : ''}</p>
      )}
      {!readOnly && (
        <div className="row row--wrap">
          {!logo && (
            <Btn small icon="sparkle" busy={busy === 'face'} onClick={detect}>
              Wykryj twarz (AI)
            </Btn>
          )}
          <Btn small icon="image" busy={busy === 'logo'} onClick={toLogo}>
            {logo ? 'Popraw tło logo jeszcze raz' : 'To jest logo: usuń tło i przytnij'}
          </Btn>
        </div>
      )}
    </div>
  )
}

/** Hurtowo: logotypy z partnerów / wystawców bez tła, zdjęcia bez punktu kadru → wykrycie twarzy. */
export async function assistAll(rows: MediaRow[], progress: (s: string) => void): Promise<{ logos: number; photos: number; rows: MediaRow[] }> {
  const logos = logoRefs(get().site)
  let nl = 0
  let np = 0
  const out = [...rows]
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    progress(`Asystent: ${i + 1} z ${rows.length}…`)
    try {
      if (logos.has(`media:${r.id}`) && r.kind !== 'logo') {
        const res = await makeLogo(r)
        syncMeta(res.row)
        replaceRef(`media:${r.id}`, `media:${res.row.id}`)
        out.unshift(res.row)
        nl++
      } else if (r.kind !== 'logo' && !r.ai) {
        const res = await autoFocus(r)
        syncMeta(res)
        out[out.findIndex((x) => x.id === r.id)] = res
        np++
      }
    } catch (e) {
      fail(e)
    }
  }
  if (nl) await save()
  return { logos: nl, photos: np, rows: out }
}
