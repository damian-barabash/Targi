// Formularz budowany z opisu pól (schema.ts). Czyta i zapisuje wersję roboczą po ścieżkach.
import { useState } from 'react'
import { getIn, setIn } from '../lib/path'
import type { SiteData } from '../content/types'
import type { Field } from './schema'
import { mutate, set, setLoc, translatePaths, useStore, keyOf } from './store'
import { pickMedia, thumb } from './media'
import { Btn, Icon } from './ui'

/** Wszystkie miejsca reklamowe na stronie: z bloków stron + stałe miejsca w szablonach. */
export function allSlots(site: SiteData): { slot: string; where: string; format: string }[] {
  const out: { slot: string; where: string; format: string }[] = []
  const F: Record<string, string> = { bar: 'pasek partnera', wide: 'baner szeroki', tile: 'kafel', banner: 'baner z tłem' }
  for (const p of site.pages)
    for (const b of p.blocks) {
      if (b.type === 'ad' && b.props.slot) out.push({ slot: b.props.slot, where: p.title.pl, format: F[b.props.format] ?? '' })
      if (b.type === 'banners') for (const x of b.props.items ?? []) out.push({ slot: x.slot, where: p.title.pl, format: x.wide ? 'baner z tłem, szeroki' : 'baner z tłem' })
      if ((b.type === 'feed' || b.type === 'catalog') && b.props.slot) out.push({ slot: b.props.slot, where: p.title.pl, format: F.tile })
    }
  out.push({ slot: 'zone', where: 'Podstrony stref', format: F.wide }, { slot: 'article', where: 'Wpisy (aktualności)', format: F.wide })
  return out.filter((x, i) => out.findIndex((y) => y.slot === x.slot) === i)
}

function TField({ path, area, placeholder }: { path: string; area?: boolean; placeholder?: string }) {
  const loc = useStore((s) => s.loc)
  const v = useStore((s) => getIn(s.site, path)) ?? {}
  const [busy, setBusy] = useState(false)
  const val: string = v[loc] ?? ''
  const missing = Boolean(v.pl?.trim()) && !String(v.en ?? '').trim()
  const stale = Boolean(v._s)
  const tr = async () => {
    setBusy(true)
    await translatePaths([{ path, pl: v.pl ?? '' }])
    setBusy(false)
  }
  const common = { value: val, placeholder: loc === 'en' ? v.pl || placeholder : placeholder, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(`${path}.${loc}`, e.target.value) }
  return (
    <div className={`tf ${loc === 'en' ? 'tf--en' : ''}`}>
      {area ? <textarea className="in" rows={Math.min(12, Math.max(3, val.split('\n').length + 1))} {...common} /> : <input className="in" {...common} />}
      <div className="tf__meta">
        <button type="button" className="tf__lang" onClick={() => setLoc(loc === 'pl' ? 'en' : 'pl')} title="Przełącz język edycji">
          {loc.toUpperCase()}
        </button>
        {(missing || stale) && v.pl?.trim() && (
          <>
            <span className={`tf__flag ${stale && !missing ? 'tf__flag--stale' : ''}`}>{missing ? 'EN: brak tłumaczenia' : 'EN: do sprawdzenia po zmianie PL'}</span>
            <button type="button" className="tf__tr" onClick={tr} disabled={busy}>
              {busy ? 'Tłumaczę…' : 'Przetłumacz'}
            </button>
            {stale && !missing && (
              <button type="button" className="tf__tr" onClick={() => set(`${path}.en`, v.en)}>
                Jest OK
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ImgField({ path }: { path: string }) {
  const v: string = useStore((s) => getIn(s.site, path)) ?? ''
  const pick = async () => {
    const r = await pickMedia(v, /(^|\.)logo(Img)?$/.test(path) ? 'logo' : 'auto')
    if (r !== null) set(path, r)
  }
  return (
    <div className="imgf">
      <button type="button" className="imgf__thumb" onClick={pick} title="Zmień zdjęcie">
        {v ? <img src={thumb(v)} alt="" /> : <Icon n="image" s={22} />}
      </button>
      <div className="imgf__btns">
        <Btn small icon="image" onClick={pick}>
          {v ? 'Zmień' : 'Wybierz zdjęcie'}
        </Btn>
        {v && (
          <Btn small kind="plain" icon="trash" title="Usuń zdjęcie" onClick={() => set(path, '')} />
        )}
      </div>
    </div>
  )
}

function LinkField({ path }: { path: string }) {
  const v: string = useStore((s) => getIn(s.site, path)) ?? ''
  const pages = useStore((s) => s.site.pages)
  const m = /^page:([^?#]*)(.*)$/.exec(v)
  const mode = m ? m[1] : v ? '__url' : ''
  return (
    <div className="linkf">
      <select
        className="in"
        value={mode}
        onChange={(e) => {
          const x = e.target.value
          set(path, x === '' ? '' : x === '__url' ? 'https://' : `page:${x}`)
        }}
      >
        <option value="">— bez linku —</option>
        <optgroup label="Strony">
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title.pl}
            </option>
          ))}
        </optgroup>
        <option value="__url">Inny adres (WWW, e-mail, #kotwica)…</option>
      </select>
      {m && <input className="in" value={m[2]} placeholder="#kotwica (opcjonalnie)" onChange={(e) => set(path, `page:${m[1]}${e.target.value}`)} />}
      {mode === '__url' && <input className="in" value={v} placeholder="https://… lub mailto:…" onChange={(e) => set(path, e.target.value)} />}
    </div>
  )
}

function SlotsField({ path }: { path: string }) {
  const v: string[] = useStore((s) => getIn(s.site, path)) ?? []
  const site = useStore((s) => s.site)
  const slots = allSlots(site)
  return (
    <div className="slots">
      {slots.map((x) => (
        <label key={x.slot} className={`slots__i ${v.includes(x.slot) ? 'on' : ''}`}>
          <input type="checkbox" checked={v.includes(x.slot)} onChange={(e) => set(path, e.target.checked ? [...v, x.slot] : v.filter((y) => y !== x.slot))} />
          <span>
            <b>{x.where}</b>
            <small>
              {x.slot} · {x.format}
            </small>
          </span>
        </label>
      ))}
    </div>
  )
}

function ListField({ f, path }: { f: Field; path: string }) {
  const items: any[] = useStore((s) => getIn(s.site, path)) ?? []
  const [open, setOpen] = useState<number | null>(null)
  const [drag, setDrag] = useState<number | null>(null)
  const key = keyOf(path)
  const write = (next: any[]) => mutate((s) => setIn(s, path, next), [key])
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return
    const next = [...items]
    next.splice(to, 0, next.splice(from, 1)[0])
    write(next)
    setOpen(null)
  }
  return (
    <div className="lf">
      {items.map((it, i) => (
        <div
          key={i}
          className={`lf__item ${open === i ? 'lf__item--open' : ''} ${drag === i ? 'lf__item--drag' : ''}`}
          onDragOver={(e) => drag !== null && e.preventDefault()}
          onDrop={() => {
            if (drag !== null) move(drag, i)
            setDrag(null)
          }}
        >
          <div className="lf__row">
            <span className="lf__grip" draggable onDragStart={() => setDrag(i)} onDragEnd={() => setDrag(null)} title="Przeciągnij, aby zmienić kolejność">
              <Icon n="drag" s={15} />
            </span>
            {f.plainT ? (
              <div className="lf__plain">
                <TField path={`${path}.${i}`} />
              </div>
            ) : (
              <button type="button" className="lf__title" onClick={() => setOpen(open === i ? null : i)}>
                {f.title?.(it, i) || `Pozycja ${i + 1}`}
                <Icon n={open === i ? 'down' : 'right'} s={14} />
              </button>
            )}
            <Btn small kind="plain" icon="up" title="Wyżej" disabled={i === 0} onClick={() => move(i, i - 1)} />
            <Btn small kind="plain" icon="down" title="Niżej" disabled={i === items.length - 1} onClick={() => move(i, i + 1)} />
            {!f.plainT && <Btn small kind="plain" icon="copy" title="Duplikuj" onClick={() => write([...items.slice(0, i + 1), structuredClone(it), ...items.slice(i + 1)])} />}
            <Btn small kind="plain" icon="trash" title="Usuń" onClick={() => (write(items.filter((_, j) => j !== i)), setOpen(null))} />
          </div>
          {open === i && !f.plainT && f.fields && (
            <div className="lf__body">
              <FieldForm fields={f.fields} base={`${path}.${i}`} />
            </div>
          )}
        </div>
      ))}
      <Btn small icon="plus" onClick={() => (write([...items, f.make ? f.make() : {}]), setOpen(f.plainT ? null : items.length))}>
        Dodaj
      </Btn>
    </div>
  )
}

function Control({ f, path }: { f: Field; path: string }) {
  const v = useStore((s) => getIn(s.site, path))
  const zones = useStore((s) => s.site.zones)
  switch (f.type) {
    case 't':
      return <TField path={path} placeholder={f.placeholder} />
    case 'tarea':
      return <TField path={path} area placeholder={f.placeholder} />
    case 'str':
      return <input className="in" value={v ?? ''} placeholder={f.placeholder} onChange={(e) => set(path, e.target.value)} />
    case 'slot':
      return <input className="in" value={v ?? ''} placeholder="np. home-wide" onChange={(e) => set(path, e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 40))} />
    case 'area':
      return <textarea className="in" rows={4} value={v ?? ''} onChange={(e) => set(path, e.target.value)} />
    case 'num':
      return <input className="in" type="number" value={v ?? ''} onChange={(e) => set(path, e.target.value === '' ? 0 : Number(e.target.value))} />
    case 'date':
      return <input className="in" type="date" value={v ?? ''} onChange={(e) => set(path, e.target.value || undefined)} />
    case 'datetime':
      return <input className="in" type="datetime-local" value={String(v ?? '').slice(0, 16)} onChange={(e) => set(path, e.target.value ? `${e.target.value}:00+01:00` : '')} />
    case 'bool':
      return (
        <label className="switch">
          <input type="checkbox" checked={f.name === 'active' || f.name === 'partnerStrip' || f.name === 'tracking' ? v !== false : Boolean(v)} onChange={(e) => set(path, e.target.checked)} />
          <i />
          <span>{f.label}</span>
        </label>
      )
    case 'select': {
      const opts =
        f.options === 'zones'
          ? [{ value: '', label: '— brak —' }, ...zones.map((z) => ({ value: z.short, label: z.name.pl }))]
          : f.options === 'emails'
            ? [{ value: '', label: '— nie pokazuj —' }, { value: 'all', label: 'Wszystkie adresy (lista)' }, ...['kontakt', 'wystawcy', 'bilety', 'partnerzy', 'media', 'vip'].map((k) => ({ value: k, label: `${k}@…` }))]
            : (f.options ?? [])
      const numeric = typeof opts[0]?.value === 'number'
      return (
        <select className="in" value={v ?? ''} onChange={(e) => set(path, numeric ? Number(e.target.value) : e.target.value)}>
          {opts.map((o) => (
            <option key={String(o.value)} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    }
    case 'img':
      return <ImgField path={path} />
    case 'link':
      return <LinkField path={path} />
    case 'slots':
      return <SlotsField path={path} />
    case 'list':
      return <ListField f={f} path={path} />
    case 'group':
      return (
        <div className="grp">
          <FieldForm fields={f.fields ?? []} base={path} />
        </div>
      )
  }
}

export function FieldForm({ fields, base }: { fields: Field[]; base: string }) {
  return (
    <div className="ff">
      {fields.map((f) => (
        <div key={f.name} className={`ff__f ${f.half ? 'ff__f--half' : ''} ff__f--${f.type}`}>
          {f.type !== 'bool' && <label className="ff__l">{f.label}</label>}
          <Control f={f} path={`${base}.${f.name}`} />
          {f.help && <p className="ff__h">{f.help}</p>}
        </div>
      ))}
    </div>
  )
}
