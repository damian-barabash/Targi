// Podgląd strony w edytorze (ładowany w ramce). Renderuje te same bloki co strona publiczna,
// ale z ramkami bloków, edycją tekstu na miejscu i wyborem zdjęć. Stan dostaje od edytora (postMessage).
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { RT, S, setSite } from '../content/site'
import type { Block, SiteData } from '../content/types'
import type { Locale } from '../i18n'
import { LocaleCtx } from '../components/ui'
import { Footer, Header, PartnerStrip } from '../components/Layout'
import PageView from '../blocks/PageView'
import { EditCtx, type EditApi } from '../blocks/edit'
import { BLOCK_DEFS } from './schema'

type Msg = { t: 'state'; site: SiteData; pageId: string; loc: Locale; sel: string | null; storage: string } | { t: 'scroll'; id: string }
const up = (m: Record<string, unknown>) => window.parent.postMessage({ src: 'bhe-preview', ...m }, window.location.origin)

const CSS = `
html{scroll-behavior:auto}
.hdr{position:absolute}
.eb{position:relative;outline:1.5px solid transparent;outline-offset:-1.5px;transition:outline-color .12s}
.eb:hover{outline-color:rgba(183,156,107,.55)}
.eb--sel,.eb--sel:hover{outline:2px solid #b0822f;outline-offset:-2px}
.eb--hidden{opacity:.35}
.eb--hidden::after{content:'Blok ukryty — nie widać go na stronie';position:absolute;inset:auto 12px 12px auto;font:500 12px/1 system-ui;background:#26221f;color:#fff;padding:7px 10px;border-radius:6px;z-index:5}
.eb__bar{position:absolute;top:8px;left:8px;z-index:60;display:none;align-items:center;gap:2px;background:#26221f;color:#fff;border-radius:8px;padding:3px;font:500 12px/1 system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25)}
.eb:hover>.eb__bar,.eb--sel>.eb__bar{display:flex}
.eb__name{padding:0 8px 0 6px;white-space:nowrap}
.eb__bar button{all:unset;cursor:pointer;width:26px;height:26px;display:grid;place-items:center;border-radius:6px;color:#e9e2d6}
.eb__bar button:hover{background:rgba(255,255,255,.16);color:#fff}
.eb__bar button:disabled{opacity:.3;cursor:default}
.eb__bar svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.eb__add{position:absolute;left:50%;bottom:-13px;transform:translateX(-50%);z-index:55;display:none}
.eb:hover>.eb__add,.eb--sel>.eb__add{display:block}
.eb__add svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}
.eb__add button{all:unset;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;background:#b0822f;color:#fff;font:600 12px/1 system-ui,sans-serif;padding:7px 12px;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.2)}
.eb__add button:hover{background:#96701f}
.e-txt{outline:none;cursor:text;border-radius:2px;min-width:1ch}
.e-txt:hover{box-shadow:0 0 0 1px rgba(176,130,47,.55)}
.e-txt:focus{box-shadow:0 0 0 2px #b0822f;background:rgba(255,255,255,.35)}
.e-txt:empty::before{content:attr(data-ph);opacity:.4;font-style:italic}
.eb:not(.eb--sel) .e-txt:empty{display:none}
.eb:not(.eb--sel) .btn:has(>.e-txt:empty),.eb:not(.eb--sel) .more:has(>.e-txt:empty){display:none}
.e-multi{white-space:pre-wrap}
[data-im]{cursor:pointer}
img[data-im]:hover{filter:brightness(.82);outline:2px solid #b0822f;outline-offset:-2px}
.e-noimg,.e-empty{display:grid;place-items:center;min-height:120px;width:100%;height:100%;border:1.5px dashed rgba(38,34,31,.35);color:#57504a;font:500 13px/1.3 system-ui,sans-serif;background:rgba(255,255,255,.4);text-align:center;padding:16px}
.e-chrome{position:relative}
.e-chrome::after{content:attr(data-note);position:absolute;inset:0;display:none;place-items:center;background:rgba(38,34,31,.55);color:#fff;font:500 13px/1.3 system-ui,sans-serif;text-align:center;z-index:70;cursor:pointer}
.e-chrome:hover::after{display:grid}
.e-blank{padding:120px 24px;text-align:center;color:#57504a;font:500 15px/1.5 system-ui,sans-serif}
form button[type=submit]{pointer-events:none}
`
const I = {
  up: 'M12 19V6M6 11l6-6 6 6',
  down: 'M12 5v13M6 13l6 6 6-6',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13',
  plus: 'M12 5v14M5 12h14',
}
const Ico = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24">
    <path d={d} />
  </svg>
)

export function PreviewPage() {
  const [st, setSt] = useState<{ pageId: string; loc: Locale; sel: string | null; v: number } | null>(null)

  useEffect(() => {
    RT.preview = true
    const on = (e: MessageEvent<Msg>) => {
      if (e.origin !== window.location.origin || !e.data?.t) return
      const m = e.data
      if (m.t === 'state') {
        RT.storage = m.storage
        setSite(m.site)
        setSt((p) => ({ pageId: m.pageId, loc: m.loc, sel: m.sel, v: (p?.v ?? 0) + 1 }))
      } else if (m.t === 'scroll') {
        document.querySelector(`[data-block="${m.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    window.addEventListener('message', on)
    up({ t: 'ready' })

    // kliknięcia: zdjęcie → biblioteka, blok → zaznaczenie; linki nie nawigują
    const click = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('.eb__bar, .eb__add')) return
      const a = el.closest('a')
      if (a) e.preventDefault()
      const im = el.closest<HTMLElement>('[data-im]')
      if (im) {
        e.preventDefault()
        e.stopPropagation()
        up({ t: 'pick', path: im.dataset.im })
      }
      const chrome = el.closest<HTMLElement>('.e-chrome')
      if (chrome) return up({ t: 'chrome', to: chrome.dataset.to })
      const b = el.closest<HTMLElement>('[data-block]')
      up({ t: 'select', id: b?.dataset.block ?? null })
    }
    document.addEventListener('click', click, true)
    const submit = (e: Event) => e.preventDefault()
    document.addEventListener('submit', submit, true)
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && ['s', 'z'].includes(e.key.toLowerCase())) {
        const editing = (document.activeElement as HTMLElement | null)?.isContentEditable
        if (e.key.toLowerCase() === 'z' && editing) return
        e.preventDefault()
        up({ t: 'key', key: e.key.toLowerCase(), shift: e.shiftKey })
      }
    }
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('message', on)
      document.removeEventListener('click', click, true)
      document.removeEventListener('submit', submit, true)
      window.removeEventListener('keydown', key)
    }
  }, [])

  const api = useMemo<EditApi>(
    () => ({
      set: (path, value) => up({ t: 'set', path, value }),
      wrap: (block: Block, i: number, el: ReactNode) => <Frame key={block.id} block={block} i={i} el={el} />,
    }),
    [],
  )

  if (!st) return null
  const page = S.pages.find((p) => p.id === st.pageId)
  const total = page?.blocks.length ?? 0
  return (
    <LocaleCtx.Provider value={st.loc}>
      <style>{CSS}</style>
      <SelCtx.Provider value={{ sel: st.sel, total }}>
        <EditCtx.Provider value={api}>
          <div className="e-chrome" data-note="Menu edytujesz w „Menu i stopka” — kliknij, aby przejść" data-to="nav" style={{ minHeight: 64 }}>
            <Header locale={st.loc} home={st.pageId === 'home'} />
          </div>
          <main id="main" key={st.pageId}>
            {page && !page.blocks.length && <div className="e-blank">Ta strona jest pusta. Dodaj pierwszy blok z panelu po lewej.</div>}
            <PageView id={st.pageId} />
          </main>
          <div className="e-chrome" data-note="Pasek partnerów pochodzi z sekcji „Partnerzy”, stopka — z „Menu i stopka”" data-to="nav">
            {S.settings.partnerStrip !== false && <PartnerStrip locale={st.loc} />}
            <Footer locale={st.loc} />
          </div>
        </EditCtx.Provider>
      </SelCtx.Provider>
    </LocaleCtx.Provider>
  )
}

import { createContext, useContext } from 'react'
const SelCtx = createContext<{ sel: string | null; total: number }>({ sel: null, total: 0 })

function Frame({ block, i, el }: { block: Block; i: number; el: ReactNode }) {
  const { sel, total } = useContext(SelCtx)
  const act = (a: string) => (e: React.MouseEvent) => {
    e.stopPropagation()
    up({ t: 'act', act: a, id: block.id, index: i })
  }
  return (
    <div className={`eb ${sel === block.id ? 'eb--sel' : ''} ${block.hidden ? 'eb--hidden' : ''}`} data-block={block.id}>
      <div className="eb__bar" contentEditable={false}>
        <span className="eb__name">{BLOCK_DEFS[block.type]?.label ?? block.type}</span>
        <button title="Przesuń wyżej" disabled={i === 0} onClick={act('up')}>
          <Ico d={I.up} />
        </button>
        <button title="Przesuń niżej" disabled={i === total - 1} onClick={act('down')}>
          <Ico d={I.down} />
        </button>
        <button title="Duplikuj" onClick={act('dup')}>
          <Ico d={I.copy} />
        </button>
        <button title={block.hidden ? 'Pokaż na stronie' : 'Ukryj na stronie'} onClick={act('hide')}>
          <Ico d={I.eye} />
        </button>
        <button title="Usuń blok" onClick={act('del')}>
          <Ico d={I.trash} />
        </button>
      </div>
      {el}
      <div className="eb__add">
        <button onClick={act('add')}>
          <Ico d={I.plus} /> Dodaj blok
        </button>
      </div>
    </div>
  )
}
