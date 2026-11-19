// Zestaw elementów interfejsu panelu: ikony, przyciski, okna, wykresy.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useStore } from './store'

/* ───────── ikony (24 px, kreska 1.6) ───────── */
const P: Record<string, string> = {
  home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
  pages: 'M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7',
  news: 'M4 5h13v14H4zM17 9h3v10h-3M7 9h7M7 13h7M7 16h4',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5a1 1 0 1 0 .01 0',
  ticket: 'M4 8a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 0 0-4V6H4zM14 6v12',
  calendar: 'M5 6h14v14H5zM5 10h14M9 4v4M15 4v4',
  users: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 0 1 0 6M18 15c2 .7 3 2.5 3 5',
  book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  faq: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01',
  inbox: 'M4 13l2-8h12l2 8v6H4zM4 13h5l1 2h4l1-2h5',
  send: 'M4 12l16-8-6 16-3-7z',
  ad: 'M3 7h18v10H3zM7 14l2-5 2 5M7.6 12.5h2.8M14 9v5h1.5a2.5 2.5 0 0 0 0-5z',
  chart: 'M4 20V5M4 20h16M8 16v-5M12 16V8M16 16v-3',
  menu: 'M4 7h16M4 12h16M4 17h16',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 1-2-1-.5-2h-5L9 7 7 8 5 7 3 11l2 1v0l-2 1 2 4 2-1 2 1 .5 2h5l.5-2 2-1 2 1 2-4z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  history: 'M4 12a8 8 0 1 0 2.5-5.8L4 8M4 4v4h4M12 8v4l3 2',
  rocket: 'M5 19l2-5c1-5 5-9 12-10-1 7-5 11-10 12zM9 15l-4 0M14 9.5a1 1 0 1 0 .01 0M7 14l3 3',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5 9-10',
  trash: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  up: 'M12 19V6M6 11l6-6 6 6',
  down: 'M12 5v13M6 13l6 6 6-6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeoff: 'M3 3l18 18M10.6 6.2A9.7 9.7 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.3 3.9M6.5 7.6A17 17 0 0 0 2 12s4 6 10 6c1.4 0 2.7-.3 3.9-.8M9.9 9.9a3 3 0 0 0 4.2 4.2',
  drag: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  undo: 'M8 7L4 11l4 4M4 11h10a5 5 0 0 1 0 10h-3',
  redo: 'M16 7l4 4-4 4M20 11H10a5 5 0 0 0 0 10h3',
  desktop: 'M3 5h18v11H3zM8 20h8M12 16v4',
  tablet: 'M6 3h12v18H6zM11 18h2',
  phone: 'M8 3h8v18H8zM11 18h2',
  back: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM16 16l5 5',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  upload: 'M12 16V5M7 9l5-5 5 5M5 20h14',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  logout: 'M10 5H5v14h5M14 8l4 4-4 4M9 12h9',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.700l1-1',
  star: 'M12 4l2.4 5 5.6.8-4 3.900.900 5.600L12 16.700 7.100 19.300 8 13.700 4 9.800 9.600 9z',
  heading: 'M5 5v14M15 5v14M5 12h10M19 19v-6l-2 1',
  split: 'M3 5h18v14H3zM12 5v14M6 9h3M6 12h3',
  text: 'M5 6h14M5 10h14M5 14h10M5 18h7',
  band: 'M3 8h18v8H3zM8 12h8',
  button: 'M4 9h16v6H4zM9 12h6',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  cards: 'M4 5h7v9H4zM13 5h7v9h-7zM4 17h7M13 17h7',
  list: 'M9 6h11M9 12h11M9 18h11M4.500 6h.010M4.500 12h.010M4.500 18h.010',
  facts: 'M4 6h6M4 10h6M14 6h6M14 10h6M4 15h6M4 19h6M14 15h6M14 19h6',
  map: 'M12 21s6-5.500 6-10a6 6 0 0 0-12 0c0 4.500 6 10 6 10zM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  cart: 'M4 5h2l2 10h9l2-7H7M9 20a1 1 0 1 0 .010 0M17 20a1 1 0 1 0 .010 0',
  cap: 'M3 9l9-4 9 4-9 4zM7 11v4c2 2 8 2 10 0v-4M21 9v5',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  layers: 'M12 4l9 5-9 5-9-5zM3 14l9 5 9-5',
  translate: 'M4 6h9M8.500 4v2M6 6c0 4 3 7 6 8M11 6c0 4-3 7-7 8M13 20l4-9 4 9M14.500 17h5',
  dots: 'M6 12h.010M12 12h.010M18 12h.010',
  external: 'M14 5h5v5M19 5l-8 8M11 7H5v12h12v-6',
  refresh: 'M20 12a8 8 0 1 1-2.500-5.800L20 8M20 4v4h-4',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.010',
  filter: 'M4 6h16l-6 7v5l-4 2v-7z',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  wand: 'M4 20L15 9M13 7l2-2 4 4-2 2zM6 3v3M4.5 4.5h3M19 15v3M17.5 16.5h3M10 3l.5 1.5L12 5l-1.5.5L10 7l-.5-1.5L8 5l1.5-.5z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  call: 'M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  building: 'M4 21V5l8-2v18M12 8h8v13M3 21h18M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  tag: 'M3 12V4h8l10 10-8 8zM7.500 8a.500.500 0 1 0 .010 0',
  note: 'M5 4h14v11l-5 5H5zM14 20v-5h5M8 9h8M8 13h5',
  merge: 'M6 4v4a6 6 0 0 0 6 6h6M15 11l3 3-3 3M6 20v-6',
  userplus: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 3-5 6-5s6 2 6 5M19 8v6M16 11h6',
  sidebar: 'M4 5h16v14H4zM9.500 5v14',
  chevron: 'M6 9l6 6 6-6',
  chevrons: 'M8 10l4-4 4 4M8 14l4 4 4-4',
  crm: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.500 20c0-3 2.500-5 5.500-5s5.500 2 5.500 5M14 5h7M14 9h7M16 13h5',
}
export function Icon({ n, s = 18, className = '' }: { n: string; s?: number; className?: string }) {
  return (
    <svg className={`ic ${className}`} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[n] ?? P.dots} />
    </svg>
  )
}

/* ───────── przyciski i drobiazgi ───────── */
type BtnProps = { children?: ReactNode; icon?: string; kind?: 'primary' | 'ghost' | 'plain' | 'danger' | 'gold'; small?: boolean; onClick?: (e: React.MouseEvent) => void; disabled?: boolean; busy?: boolean; title?: string; type?: 'button' | 'submit'; className?: string }
export function Btn({ children, icon, kind = 'ghost', small, onClick, disabled, busy, title, type = 'button', className = '' }: BtnProps) {
  return (
    <button type={type} className={`ab ab--${kind} ${small ? 'ab--sm' : ''} ${!children ? 'ab--icon' : ''} ${className}`} onClick={onClick} disabled={disabled || busy} title={title} aria-label={!children ? title : undefined}>
      {busy ? <span className="spin" /> : icon && <Icon n={icon} s={small ? 15 : 17} />}
      {children && <span>{children}</span>}
    </button>
  )
}

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'gold' | 'green' | 'red' | 'blue' | 'amber' }) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}

/** Karta w stylu „tacki”: szare obramowanie z nagłówkiem, w środku biały panel. */
export function Card({ title, aside, children, className = '', pad = true }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`card ${title || aside ? '' : 'card--bare'} ${className}`}>
      {(title || aside) && (
        <header className="card__head">
          <h2>{title}</h2>
          {aside && <div className="card__aside">{aside}</div>}
        </header>
      )}
      <div className={`card__in ${pad ? 'card__body' : ''}`}>{children}</div>
    </section>
  )
}

export function PageHead({ title, desc, children }: { title: ReactNode; desc?: ReactNode; children?: ReactNode }) {
  return (
    <header className="phd">
      <div>
        <h1>{title}</h1>
        {desc && <p>{desc}</p>}
      </div>
      {children && <div className="phd__actions">{children}</div>}
    </header>
  )
}

export function Empty({ icon = 'inbox', title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <Icon n={icon} s={30} />
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  )
}

export const Spinner = ({ label = 'Wczytywanie…' }: { label?: string }) => (
  <div className="loading">
    <span className="spin" /> {label}
  </div>
)

/* ───────── okna ───────── */
export function Modal({ title, onClose, children, footer, wide, side, aside, className = '' }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean; side?: boolean; aside?: ReactNode; className?: string }) {
  const [leaving, setLeaving] = useState(false)
  // zamknięcie z animacją wyjścia (tło, Esc, krzyżyk)
  const close = () => {
    if (leaving) return
    setLeaving(true)
    setTimeout(onClose, 180)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, leaving])
  return (
    <div className={`ov ${side ? 'ov--side' : ''} ${leaving ? 'is-leaving' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      {aside}
      <div className={`modal ${wide ? 'modal--wide' : ''} ${side ? 'modal--side' : ''} ${className}`} role="dialog" aria-modal="true">
        <header className="modal__head">
          <h2>{title}</h2>
          <Btn icon="x" kind="plain" title="Zamknij" onClick={close} />
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </div>
  )
}

/** Potwierdzenie w oknie (zamiast systemowego confirm). */
let askImpl: (q: { title: string; text?: string; yes?: string; danger?: boolean }) => Promise<boolean> = async () => false
export const ask = (q: { title: string; text?: string; yes?: string; danger?: boolean }) => askImpl(q)
export function AskHost() {
  const [q, setQ] = useState<{ title: string; text?: string; yes?: string; danger?: boolean; done: (v: boolean) => void } | null>(null)
  useEffect(() => {
    askImpl = (x) => new Promise((done) => setQ({ ...x, done }))
  }, [])
  if (!q) return null
  const close = (v: boolean) => {
    q.done(v)
    setQ(null)
  }
  return (
    <Modal
      title={q.title}
      onClose={() => close(false)}
      footer={
        <>
          <Btn onClick={() => close(false)}>Anuluj</Btn>
          <Btn kind={q.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
            {q.yes ?? 'Tak'}
          </Btn>
        </>
      }
    >
      {q.text && <p className="muted-t">{q.text}</p>}
    </Modal>
  )
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts)
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((x) => (
        <div key={x.id} className={`toast toast--${x.kind}`}>
          <Icon n={x.kind === 'err' ? 'info' : 'check'} s={16} />
          {x.text}
        </div>
      ))}
    </div>
  )
}

export function Tabs<V extends string>({ value, onChange, items }: { value: V; onChange: (v: V) => void; items: { value: V; label: ReactNode; count?: number }[] }) {
  return (
    <div className="tabs-a" role="tablist">
      {items.map((x) => (
        <button key={x.value} role="tab" aria-selected={value === x.value} className={value === x.value ? 'on' : ''} onClick={() => onChange(x.value)}>
          {x.label}
          {x.count != null && <em>{x.count}</em>}
        </button>
      ))}
    </div>
  )
}

export function Stat({ label, value, delta, hint, icon }: { label: string; value: ReactNode; delta?: number | null; hint?: string; icon?: string }) {
  return (
    <div className="stat-a">
      <div className="stat-a__main">
        <div>
          <span className="stat-a__l">{label}</span>
          <strong>{value}</strong>
        </div>
        {icon && (
          <span className="stat-a__ic">
            <Icon n={icon} s={16} />
          </span>
        )}
      </div>
      <div className="stat-a__foot">
        {delta != null && Number.isFinite(delta) && (
          <span className={`delta ${delta > 0 ? 'delta--up' : delta < 0 ? 'delta--down' : ''}`}>
            {delta > 0 ? '+' : delta < 0 ? '−' : ''}
            {Math.abs(delta)}%
          </span>
        )}
        <span>{hint ?? '\u00a0'}</span>
      </div>
    </div>
  )
}

/* ───────── wykresy (SVG, jedna oś, podpowiedź pod kursorem) ───────── */
export const SERIES = ['#1a1a18', '#a3a39c', '#16a34a', '#d97706', '#2563eb', '#d4d4cf']
const nice = (max: number) => {
  if (max <= 4) return 4
  const p = 10 ** Math.floor(Math.log10(max))
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((v) => v >= max)!
}
const dayLabel = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(600)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, e.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

type Serie = { name: string; color: string; values: number[] }

/** Wykres w czasie: linia z wypełnieniem (jedna seria) albo słupki skumulowane (kilka serii). */
export function TimeChart({ days, series, kind = 'line', height = 220 }: { days: string[]; series: Serie[]; kind?: 'line' | 'bars'; height?: number }) {
  const [ref, W] = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const m = { l: 36, r: 12, t: 12, b: 26 }
  const iw = W - m.l - m.r
  const ih = height - m.t - m.b
  const totals = days.map((_, i) => (kind === 'bars' ? series.reduce((s, x) => s + (x.values[i] ?? 0), 0) : Math.max(...series.map((x) => x.values[i] ?? 0))))
  const top = nice(Math.max(1, ...totals))
  const n = days.length
  const x = (i: number) => m.l + (kind === 'bars' ? (i + 0.5) * (iw / n) : n > 1 ? (i * iw) / (n - 1) : iw / 2)
  const y = (v: number) => m.t + ih - (v / top) * ih
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top)
  const every = Math.ceil(n / Math.max(2, Math.floor(iw / 70)))
  const bw = Math.max(2, Math.min(26, iw / n - 2))
  const empty = totals.every((v) => !v)

  return (
    <div className="chart" ref={ref}>
      {series.length > 1 && (
        <div className="chart__legend">
          {series.map((s) => (
            <span key={s.name}>
              <i style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <svg
        width={W}
        height={height}
        role="img"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const px = e.clientX - r.left - m.l
          setHover(Math.max(0, Math.min(n - 1, kind === 'bars' ? Math.floor(px / (iw / n)) : Math.round((px / iw) * (n - 1)))))
        }}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} className="chart__grid" />
            <text x={m.l - 8} y={y(v) + 4} textAnchor="end" className="chart__tick">
              {Number.isInteger(v) ? v : v.toFixed(1)}
            </text>
          </g>
        ))}
        {days.map((d, i) =>
          i % every === 0 ? (
            <text key={d} x={x(i)} y={height - 6} textAnchor="middle" className="chart__tick">
              {dayLabel(d)}
            </text>
          ) : null,
        )}
        {kind === 'line' &&
          series.map((s) => {
            const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
            return (
              <g key={s.name}>
                {series.length === 1 && n > 1 && <polygon points={`${x(0)},${y(0)} ${pts} ${x(n - 1)},${y(0)}`} fill={s.color} opacity="0.1" />}
                <polyline points={pts} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {hover != null && <circle cx={x(hover)} cy={y(s.values[hover] ?? 0)} r="4.5" fill={s.color} stroke="#fff" strokeWidth="2" />}
              </g>
            )
          })}
        {kind === 'bars' &&
          days.map((d, i) => {
            let acc = 0
            return (
              <g key={d} opacity={hover == null || hover === i ? 1 : 0.55}>
                {series.map((s) => {
                  const v = s.values[i] ?? 0
                  if (!v) return null
                  const y1 = y(acc + v)
                  const h = y(acc) - y1
                  acc += v
                  return <rect key={s.name} x={x(i) - bw / 2} y={y1 + 1} width={bw} height={Math.max(1, h - 2)} rx="2" fill={s.color} />
                })}
              </g>
            )
          })}
        {hover != null && kind === 'line' && <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} className="chart__cross" />}
      </svg>
      {empty && <p className="chart__empty">Brak danych w tym okresie</p>}
      {hover != null && !empty && (
        <div className="tip" style={{ left: Math.min(W - 150, Math.max(0, x(hover) - 70)), top: 4 }}>
          <b>{dayLabel(days[hover])}</b>
          {series.map((s) => (
            <span key={s.name}>
              <i style={{ background: s.color }} />
              {s.name} <em>{s.values[hover] ?? 0}</em>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/** Ranking: poziome paski z wartością — czytelniejsze niż koło. */
export function BarList({ items, color = '#1a1a18', fmt = (v: number) => String(v) }: { items: { label: string; value: number; color?: string }[]; color?: string; fmt?: (v: number) => string }) {
  const max = Math.max(1, ...items.map((x) => x.value))
  const total = items.reduce((s, x) => s + x.value, 0)
  if (!items.length || !total) return <p className="chart__empty chart__empty--static">Brak danych w tym okresie</p>
  return (
    <ul className="barlist">
      {items.map((x) => (
        <li key={x.label} title={`${x.label}: ${fmt(x.value)} (${Math.round((x.value / total) * 100)}%)`}>
          <span className="barlist__l">{x.label}</span>
          <span className="barlist__bar">
            <i style={{ width: `${(x.value / max) * 100}%`, background: x.color ?? color }} />
          </span>
          <span className="barlist__v">{fmt(x.value)}</span>
        </li>
      ))}
    </ul>
  )
}

/** Uzupełnia dni bez danych zerami. */
export function dayRange(from: string, to = new Date().toISOString().slice(0, 10)): string[] {
  const out: string[] = []
  const d = new Date(from + 'T12:00:00')
  const end = new Date(to + 'T12:00:00')
  while (d <= end && out.length < 400) {
    out.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return out
}
