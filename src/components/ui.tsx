import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import type { Locale } from '../i18n'
import { imgSet, imgSrc } from '../lib/img'
import { EVENT } from '../content/site'

export const LocaleCtx = createContext<Locale>('pl')
export const useLocale = () => useContext(LocaleCtx)

export function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg className={`arrow ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type BtnProps = {
  to: string
  children: ReactNode
  variant?: 'dark' | 'light' | 'outline' | 'gold' | 'glass'
  arrow?: boolean
  className?: string
}

export function Btn({ to, children, variant = 'dark', arrow = true, className = '' }: BtnProps) {
  const cls = `btn btn--${variant} ${className}`
  const inner = (
    <>
      <span>{children}</span>
      {arrow && (
        <span className="btn__icon">
          <Arrow />
        </span>
      )}
    </>
  )
  if (/^(https?:|mailto:|#)/.test(to)) return <a className={cls} href={to}>{inner}</a>
  return <Link className={cls} to={to}>{inner}</Link>
}

export function Img({
  name,
  alt = '',
  className = '',
  sizes = '(max-width: 800px) 100vw, 50vw',
  eager = false,
}: {
  name: string
  alt?: string
  className?: string
  sizes?: string
  eager?: boolean
}) {
  return (
    <img
      className={className}
      src={imgSrc(name)}
      srcSet={imgSet(name)}
      sizes={sizes}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
    />
  )
}

/** Delikatne pojawianie się przy przewijaniu. Bez JS treść jest widoczna. */
export function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }: { children: ReactNode; className?: string; delay?: number; as?: 'div' | 'section' | 'li' | 'article' }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return
    el.classList.add('reveal--wait')
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('reveal--in')
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    // @ts-expect-error polymorphic ref
    <Tag ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  )
}

export function Countdown({ labels }: { labels: { days: string; hours: string; minutes: string } }) {
  const target = new Date(EVENT.startsAt).getTime()
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])
  const diff = Math.max(0, target - (now ?? target))
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  const cell = (v: number, l: string) => (
    <div className="count__cell">
      <span className="count__num">{now === null ? '—' : String(v).padStart(2, '0')}</span>
      <span className="count__lbl">{l}</span>
    </div>
  )
  return (
    <div className="count" aria-live="off">
      {cell(d, labels.days)}
      {cell(h, labels.hours)}
      {cell(m, labels.minutes)}
    </div>
  )
}

export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <span className={`eyebrow ${light ? 'eyebrow--light' : ''}`}>{children}</span>
}

export function Seo({ title, description, image = 'hero' }: { title: string; description: string; image?: string }) {
  const l = useLocale()
  const full = title.includes(EVENT.brand) ? title : `${title} · ${EVENT.brand}`
  return (
    <Head>
      <html lang={l} />
      <title>{full}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={full} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={imgSrc(image, 1600)} />
      <meta property="og:locale" content={l === 'pl' ? 'pl_PL' : 'en_GB'} />
      <meta name="twitter:card" content="summary_large_image" />
    </Head>
  )
}

/** Miejsce reklamowe. Treść (baner, okres emisji, statystyki) przyjdzie z panelu. */
export function AdSlot({ id, label, variant = 'wide' }: { id: string; label: string; variant?: 'wide' | 'card' }) {
  const l = useLocale()
  return (
    <aside className={`ad ad--${variant}`} data-ad-slot={id} aria-label={label}>
      <span className="ad__label">{label}</span>
      <div className="ad__body">
        <span className="ad__brand">Atelier Lumière</span>
        <span className="ad__claim">
          {l === 'pl' ? 'Nowa kolekcja pomadek — przetestuj na stoisku B04' : 'New lipstick collection — try it at stand B04'}
        </span>
      </div>
      <Img name="product-brush" className="ad__img" sizes="400px" />
    </aside>
  )
}
