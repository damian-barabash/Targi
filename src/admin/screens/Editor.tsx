// Edytor wizualny strony: po lewej bloki / struktura / ustawienia, po prawej żywy podgląd w ramce.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getIn, setIn } from '../../lib/path'
import type { Block } from '../../content/types'
import { STORAGE } from '../api'
import { BLOCK_DEFS, newBlock, type Field } from '../schema'
import { canEdit, discard, mutate, redo, save, set, setLoc, toast, translatePaths, undo, untranslated, useStore } from '../store'
import { FieldForm } from '../fields'
import { pickMedia } from '../media'
import { Badge, Btn, Empty, Icon, Tabs, ask } from '../ui'
import { go } from '../entry'
import { slugError } from './PagesList'

const DEVICES = { desktop: { w: 1440, icon: 'desktop', label: 'Komputer' }, tablet: { w: 834, icon: 'tablet', label: 'Tablet' }, phone: { w: 390, icon: 'phone', label: 'Telefon' } } as const
type Device = keyof typeof DEVICES
const GROUPS = ['Podstawowe', 'Treść', 'Targi', 'Formularze i reklama'] as const

const PAGE_FIELDS = (system: boolean): Field[] => [
  { name: 'title', label: 'Nazwa strony (w panelu i w karcie przeglądarki)', type: 't' },
  ...(system ? [] : ([{ name: 'slug', label: 'Adres strony', type: 'group', fields: [{ name: 'pl', label: 'Polski: /…', type: 'str', half: true }, { name: 'en', label: 'Angielski: /en/…', type: 'str', half: true }] }] as Field[])),
  {
    name: 'seo',
    label: 'Google i udostępnianie',
    type: 'group',
    fields: [
      { name: 'title', label: 'Tytuł w Google (puste = nazwa strony)', type: 't' },
      { name: 'description', label: 'Opis w Google (ok. 150 znaków)', type: 'tarea' },
      { name: 'image', label: 'Obraz przy udostępnianiu', type: 'img', help: 'Puste = obraz domyślny z „Ustawień strony”.' },
    ],
  },
]

/** Krótki podpis bloku w strukturze: pierwszy sensowny tekst z jego pól. */
function snippet(b: Block): string {
  const p = b.props ?? {}
  for (const k of ['title', 'text', 'kicker', 'eyebrow', 'slot']) {
    const v = p[k]
    const s = typeof v === 'string' ? v : v?.pl
    if (s) return s
  }
  return ''
}

export default function Editor({ pageId }: { pageId: string }) {
  const site = useStore((s) => s.site)
  const loc = useStore((s) => s.loc)
  const dirty = useStore((s) => s.dirty.length)
  const saving = useStore((s) => s.saving)
  const undoN = useStore((s) => s.undo)
  const redoN = useStore((s) => s.redo)
  const idx = site.pages.findIndex((p) => p.id === pageId)
  const page = site.pages[idx]
  const editable = canEdit('pages')
  const [sel, setSel] = useState<string | null>(null)
  const [tab, setTab] = useState<'add' | 'tree' | 'block' | 'page'>('tree')
  const [device, setDevice] = useState<Device>('desktop')
  const [insertAt, setInsertAt] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const [drag, setDrag] = useState<number | null>(null)
  const [busyTr, setBusyTr] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)
  const canvas = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 1200, h: 800 })
  const key = `page:${pageId}`
  const base = `pages.${idx}`

  // rozmiar obszaru podglądu → skala ramki
  useEffect(() => {
    if (!canvas.current) return
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(canvas.current)
    return () => ro.disconnect()
  }, [])
  const dw = DEVICES[device].w
  const scale = Math.min(1, (box.w - 32) / dw)

  const post = useCallback((m: Record<string, unknown>) => frame.current?.contentWindow?.postMessage(m, window.location.origin), [])
  useEffect(() => {
    if (ready && page) post({ t: 'state', site, pageId, loc, sel, storage: STORAGE })
  }, [ready, site, pageId, loc, sel, post, page])

  const blocks = page?.blocks ?? []
  const write = useCallback((next: Block[]) => mutate((s) => setIn(s, `pages.${s.pages.findIndex((p) => p.id === pageId)}.blocks`, next), [key]), [pageId, key])
  const bi = blocks.findIndex((b) => b.id === sel)
  const block = blocks[bi]

  const act = useCallback(
    async (a: string, id: string) => {
      const cur: Block[] = getIn(useStoreNow().site, `pages.${useStoreNow().site.pages.findIndex((p) => p.id === pageId)}.blocks`) ?? []
      const i = cur.findIndex((b) => b.id === id)
      if (i < 0) return
      const next = [...cur]
      if (a === 'up' && i > 0) next.splice(i - 1, 0, next.splice(i, 1)[0])
      else if (a === 'down' && i < cur.length - 1) next.splice(i + 1, 0, next.splice(i, 1)[0])
      else if (a === 'dup') {
        const copy = { ...structuredClone(cur[i]), id: newBlock(cur[i].type).id }
        next.splice(i + 1, 0, copy)
        setSel(copy.id)
      } else if (a === 'hide') next[i] = { ...cur[i], hidden: !cur[i].hidden }
      else if (a === 'del') {
        if (!(await ask({ title: `Usunąć blok „${BLOCK_DEFS[cur[i].type]?.label}”?`, text: 'Możesz to cofnąć przyciskiem „Cofnij”.', yes: 'Usuń blok', danger: true }))) return
        next.splice(i, 1)
        setSel(null)
        setTab('tree')
      } else if (a === 'add') {
        setInsertAt(i + 1)
        setTab('add')
        return
      } else return
      write(next)
      if (a === 'up' || a === 'down') setTimeout(() => post({ t: 'scroll', id }), 60)
    },
    [pageId, write, post],
  )

  // komunikaty z podglądu
  useEffect(() => {
    const on = async (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.src !== 'bhe-preview') return
      const m = e.data
      if (m.t === 'ready') setReady(true)
      else if (m.t === 'set') set(m.path, m.value)
      else if (m.t === 'select') {
        setSel(m.id)
        if (m.id) setTab('block')
      } else if (m.t === 'act') act(m.act, m.id)
      else if (m.t === 'pick') {
        const r = await pickMedia(getIn(useStoreNow().site, m.path))
        if (r !== null) set(m.path, r)
      } else if (m.t === 'chrome') {
        if (await ask({ title: 'Przejść do „Menu i stopka”?', text: 'Zmiany na tej stronie zostają w wersji roboczej — nic nie przepadnie.', yes: 'Przejdź' })) go(m.to)
      } else if (m.t === 'key') m.key === 's' ? save() : m.shift ? redo() : undo()
    }
    window.addEventListener('message', on)
    return () => window.removeEventListener('message', on)
  }, [act])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        save()
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault()
        e.shiftKey ? redo() : undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const todo = useMemo(() => (page ? untranslated(page, base) : []), [page, base])
  const slugErr = page && !page.system ? slugError(site.pages, page.id, page.slug.pl, page.slug.en) : ''

  if (!page)
    return (
      <div className="ed ed--msg">
        <Empty icon="pages" title="Nie ma takiej strony">
          <a href="#/pages">Wróć do listy stron</a>
        </Empty>
      </div>
    )

  function add(type: string) {
    const b = newBlock(type)
    const at = insertAt ?? (bi >= 0 ? bi + 1 : blocks.length)
    write([...blocks.slice(0, at), b, ...blocks.slice(at)])
    setInsertAt(null)
    setSel(b.id)
    setTab('block')
    setTimeout(() => post({ t: 'scroll', id: b.id }), 120)
  }
  const def = block ? BLOCK_DEFS[block.type] : null

  return (
    <div className="ed">
      <header className="ed__top">
        <Btn kind="plain" icon="back" title="Wróć do listy stron" onClick={() => go('pages')} />
        <div className="ed__title">
          <select value={pageId} onChange={(e) => (setSel(null), setTab('tree'), go(`edit/${e.target.value}`))} aria-label="Strona">
            {site.pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title.pl}
              </option>
            ))}
          </select>
          <small>/{loc === 'en' ? `en/${page.slug.en}` : page.slug.pl}</small>
        </div>
        <span className="grow" />
        <div className="seg" role="group" aria-label="Podgląd na urządzeniu">
          {(Object.keys(DEVICES) as Device[]).map((d) => (
            <button key={d} className={device === d ? 'on' : ''} onClick={() => setDevice(d)} title={DEVICES[d].label}>
              <Icon n={DEVICES[d].icon} s={16} />
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Język">
          {(['pl', 'en'] as const).map((l) => (
            <button key={l} className={loc === l ? 'on' : ''} onClick={() => setLoc(l)}>
              {l.toUpperCase()}
              {l === 'en' && todo.length > 0 && <i className="dot" title={`${todo.length} tekstów bez aktualnego tłumaczenia`} />}
            </button>
          ))}
        </div>
        {editable && todo.length > 0 && (
          <Btn
            small
            icon="translate"
            busy={busyTr}
            title="Przetłumacz na angielski teksty tej strony bez tłumaczenia lub do sprawdzenia"
            onClick={async () => {
              setBusyTr(true)
              await translatePaths(todo)
              setBusyTr(false)
            }}
          >
            EN ({todo.length})
          </Btn>
        )}
        <span className="grow" />
        <Btn kind="plain" icon="undo" title="Cofnij (Ctrl/⌘ + Z)" disabled={!undoN} onClick={undo} />
        <Btn kind="plain" icon="redo" title="Ponów (Ctrl/⌘ + Shift + Z)" disabled={!redoN} onClick={redo} />
        {dirty > 0 && (
          <Btn kind="plain" small onClick={async () => (await ask({ title: 'Cofnąć wszystkie niezapisane zmiany?', yes: 'Cofnij zmiany', danger: true })) && discard()}>
            Odrzuć
          </Btn>
        )}
        <Btn kind="primary" icon="check" busy={saving} disabled={!dirty || !!slugErr} onClick={() => save()}>
          {dirty ? 'Zapisz' : 'Zapisano'}
        </Btn>
        <Btn kind="gold" icon="rocket" onClick={() => go('publish')} title="Przejdź do publikacji">
          Publikacja
        </Btn>
      </header>

      <aside className="ed__panel">
        <Tabs
          value={tab}
          onChange={(t) => (setTab(t), t !== 'add' && setInsertAt(null))}
          items={[
            { value: 'tree', label: 'Struktura' },
            { value: 'add', label: 'Dodaj blok' },
            { value: 'block', label: 'Blok' },
            { value: 'page', label: 'Strona' },
          ]}
        />
        <div className="ed__scroll">
          {!editable && (
            <p className="notice">
              <Icon n="eye" /> Twoja rola pozwala tylko oglądać strony.
            </p>
          )}

          {tab === 'tree' && (
            <>
              <p className="ed__hint">Kliknij tekst lub zdjęcie w podglądzie, aby je zmienić. Tu ustawisz kolejność bloków.</p>
              <ol className="tree">
                {blocks.map((b, i) => (
                  <li
                    key={b.id}
                    className={`${sel === b.id ? 'on' : ''} ${b.hidden ? 'off' : ''} ${drag === i ? 'dragging' : ''}`}
                    onDragOver={(e) => drag !== null && e.preventDefault()}
                    onDrop={() => {
                      if (drag !== null && drag !== i) {
                        const next = [...blocks]
                        next.splice(i, 0, next.splice(drag, 1)[0])
                        write(next)
                      }
                      setDrag(null)
                    }}
                  >
                    <span className="lf__grip" draggable onDragStart={() => setDrag(i)} onDragEnd={() => setDrag(null)} title="Przeciągnij, aby zmienić kolejność">
                      <Icon n="drag" s={15} />
                    </span>
                    <button
                      className="tree__main"
                      onClick={() => {
                        setSel(b.id)
                        post({ t: 'scroll', id: b.id })
                      }}
                      onDoubleClick={() => setTab('block')}
                    >
                      <Icon n={BLOCK_DEFS[b.type]?.icon ?? 'dots'} s={16} />
                      <span>
                        <b>{BLOCK_DEFS[b.type]?.label ?? b.type}</b>
                        <small>{snippet(b)}</small>
                      </span>
                    </button>
                    <Btn small kind="plain" icon={b.hidden ? 'eyeoff' : 'eye'} title={b.hidden ? 'Pokaż na stronie' : 'Ukryj na stronie'} onClick={() => act('hide', b.id)} />
                    <Btn small kind="plain" icon="edit" title="Ustawienia bloku" onClick={() => (setSel(b.id), setTab('block'))} />
                  </li>
                ))}
              </ol>
              <Btn icon="plus" kind="primary" onClick={() => (setInsertAt(blocks.length), setTab('add'))} className="wide">
                Dodaj blok na końcu
              </Btn>
            </>
          )}

          {tab === 'add' && (
            <>
              <p className="ed__hint">{insertAt != null ? `Nowy blok pojawi się na pozycji ${insertAt + 1}.` : block ? 'Nowy blok pojawi się pod zaznaczonym.' : 'Nowy blok pojawi się na końcu strony.'}</p>
              {GROUPS.map((g) => (
                <div key={g} className="lib">
                  <h3>{g}</h3>
                  <div className="lib__grid">
                    {Object.entries(BLOCK_DEFS)
                      .filter(([, d]) => d.group === g)
                      .map(([type, d]) => (
                        <button key={type} onClick={() => add(type)} title={d.desc} disabled={!editable}>
                          <Icon n={d.icon} s={20} />
                          <b>{d.label}</b>
                          <small>{d.desc}</small>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'block' &&
            (block && def ? (
              <>
                <div className="ed__bhead">
                  <Icon n={def.icon} s={20} />
                  <div>
                    <strong>{def.label}</strong>
                    <small>{def.desc}</small>
                  </div>
                  {block.hidden && <Badge tone="amber">Ukryty</Badge>}
                </div>
                <div className="row ed__bacts">
                  <Btn small icon="up" title="Wyżej" disabled={bi === 0} onClick={() => act('up', block.id)} />
                  <Btn small icon="down" title="Niżej" disabled={bi === blocks.length - 1} onClick={() => act('down', block.id)} />
                  <Btn small icon="copy" onClick={() => act('dup', block.id)}>
                    Duplikuj
                  </Btn>
                  <Btn small icon={block.hidden ? 'eye' : 'eyeoff'} onClick={() => act('hide', block.id)}>
                    {block.hidden ? 'Pokaż' : 'Ukryj'}
                  </Btn>
                  <Btn small kind="plain" icon="trash" title="Usuń blok" onClick={() => act('del', block.id)} />
                </div>
                {def.source && (
                  <button className="ed__source" onClick={() => go(def.source!.to)}>
                    <Icon n="link" s={15} />
                    <span>{def.source.label}</span>
                    <Icon n="right" s={14} />
                  </button>
                )}
                {def.fields.length ? (
                  <fieldset disabled={!editable} className="plain">
                    <FieldForm fields={def.fields} base={`${base}.blocks.${bi}.props`} />
                  </fieldset>
                ) : (
                  <p className="ed__hint">Ten blok nie ma własnych ustawień — pokazuje dane z sekcji wskazanej wyżej.</p>
                )}
              </>
            ) : (
              <Empty icon="edit" title="Wybierz blok">
                Kliknij dowolny blok w podglądzie albo na liście „Struktura”.
              </Empty>
            ))}

          {tab === 'page' && (
            <>
              <fieldset disabled={!editable} className="plain">
                <FieldForm fields={PAGE_FIELDS(Boolean(page.system))} base={base} />
              </fieldset>
              {slugErr && <p className="login__err">{slugErr}</p>}
              {page.system ? (
                <p className="ed__hint">To strona systemowa — jej adres jest stały, bo prowadzą do niej przyciski i formularze.</p>
              ) : (
                <p className="ed__hint">Aby strona była w menu, dodaj link w „Menu i stopka”.</p>
              )}
            </>
          )}
        </div>
      </aside>

      <div className="ed__canvas" ref={canvas}>
        <div className="ed__frame" style={{ width: dw * scale, height: box.h - 24 }}>
          <iframe
            ref={frame}
            title="Podgląd strony"
            src={`${import.meta.env.BASE_URL}admin/preview/`}
            style={{ width: dw, height: (box.h - 24) / scale, transform: `scale(${scale})` }}
            onLoad={() => toastOnce()}
          />
        </div>
        <p className="ed__zoom">
          {DEVICES[device].label} · {dw} px{scale < 1 ? ` · pomniejszenie ${Math.round(scale * 100)}%` : ''}
        </p>
      </div>
    </div>
  )
}

import { get as useStoreNow } from '../store'
let hinted = false
function toastOnce() {
  if (hinted) return
  hinted = true
  try {
    if (localStorage.getItem('bhe-ed-hint')) return
    localStorage.setItem('bhe-ed-hint', '1')
  } catch {
    return
  }
  toast('Podpowiedź: kliknij tekst w podglądzie, aby go zmienić; kliknij zdjęcie, aby je podmienić.', 'info')
}
