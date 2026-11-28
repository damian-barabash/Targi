// Edycja „na miejscu”: na stronie publicznej E/Im renderują zwykły tekst i zdjęcie,
// w podglądzie panelu (EditCtx) tekst jest edytowalny, a kliknięcie zdjęcia otwiera bibliotekę mediów.
import { createContext, useContext, useState, type CSSProperties, type ReactNode } from 'react'
import { S } from '../content/site'
import type { Block } from '../content/types'
import { getIn } from '../lib/path'
import { imgMeta, imgSet, imgSrc } from '../lib/img'
import { useLocale } from '../components/ui'

export type EditApi = {
  set: (path: string, value: unknown) => void
  /** ramka bloku w podglądzie panelu */
  wrap?: (block: Block, index: number, el: ReactNode) => ReactNode
}
export const EditCtx = createContext<EditApi | null>(null)
export const useEdit = () => useContext(EditCtx)

/** *tekst* → kursywa (akcent w nagłówkach). */
export function rich(s: string): ReactNode {
  if (!s.includes('*')) return s
  return s.split(/\*([^*]+)\*/g).map((part, i) => (i % 2 ? <em key={i}>{part}</em> : part))
}

type Tag = 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div' | 'li' | 'dt' | 'dd' | 'summary' | 'strong'

/** Tekst z treści pod ścieżką `at` (pole dwujęzyczne lub zwykły napis). */
export function E({ at, as: T = 'span', className, multiline = false }: { at: string; as?: Tag; className?: string; multiline?: boolean }) {
  const l = useLocale()
  const ed = useEdit()
  const raw = getIn(S, at)
  const isT = raw !== null && typeof raw === 'object'
  const text: string = String((isT ? raw[l] : raw) ?? '')
  if (!ed) return text ? <T className={className}>{rich(text)}</T> : null
  return <Editable T={T} className={className} text={text} multiline={multiline} at={at} save={(v) => ed.set(isT ? `${at}.${l}` : at, v)} />
}

function Editable({ T, className, text, multiline, at, save }: { T: Tag; className?: string; text: string; multiline: boolean; at: string; save: (v: string) => void }) {
  // *wyróżnienie* widać jako kursywę, a podczas pisania — jako gwiazdki
  const [raw, setRaw] = useState(false)
  return (
    <T
      className={`${className ?? ''} e-txt`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-ph="Wpisz tekst…"
      data-e={at}
      onFocus={() => text.includes('*') && setRaw(true)}
      onBlur={(e) => {
        const v = e.currentTarget.innerText.replace(/\u00a0/g, ' ').trim()
        setRaw(false)
        if (v !== text) save(v)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || (e.key === 'Enter' && !multiline)) {
          e.preventDefault()
          e.currentTarget.blur()
        } else if (e.key === 'Enter') {
          e.preventDefault()
          document.execCommand('insertLineBreak')
        }
      }}
      onPaste={(e) => {
        e.preventDefault()
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
      }}
    >
      {raw || multiline ? text : rich(text)}
    </T>
  )
}

/** Zdjęcie z treści pod ścieżką `at`. */
export function Im({ at, sizes = '(max-width: 800px) 100vw, 50vw', className, eager = false, alt = '', wide = false }: { at: string; sizes?: string; className?: string; eager?: boolean; alt?: string; wide?: boolean }) {
  const ed = useEdit()
  const ref = String(getIn(S, at) ?? '')
  if (!ref) return ed ? <span className="e-noimg" data-im={at}>Dodaj zdjęcie</span> : null
  // punkt kadru (twarz) z asystenta zdjęć; logotypy dostają proporcję do wyrównania optycznej wielkości
  const m = imgMeta(ref)
  const style = m ? (m.logo ? ({ '--ar': m.ar } as CSSProperties) : { objectPosition: `${m.x}% ${m.y}%` }) : undefined
  return (
    <img
      className={`${className ?? ''}${m?.logo ? ' is-logo' : ''}` || undefined}
      style={style}
      src={imgSrc(ref)}
      srcSet={imgSet(ref, wide)}
      sizes={sizes}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
      data-im={ed ? at : undefined}
    />
  )
}

/** Dłuższy tekst: akapity rozdzielone pustą linią. */
export function Paras({ at, className }: { at: string; className?: string }) {
  const l = useLocale()
  const ed = useEdit()
  const v = getIn(S, at)
  const s: string = String((v !== null && typeof v === 'object' ? v[l] : v) ?? '')
  if (ed) return <E at={at} as="div" className={`${className ?? ''} e-multi`} multiline />
  return (
    <>
      {s
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((x, i) =>
          x.startsWith('## ') ? (
            <h2 key={i} className="h3">
              {x.slice(3)}
            </h2>
          ) : (
            <p key={i} className={className}>
              {rich(x)}
            </p>
          ),
        )}
    </>
  )
}
