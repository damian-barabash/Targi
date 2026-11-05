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
    <svg className={`arrow ${className}`} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 10h13M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
    </svg>
  )
}

type BtnProps = {
  to: string
  children: ReactNode
  variant?: 'dark' | 'light' | 'outline' | 'gold'
  arrow?: boolean
  className?: string
}

/** Mała prostokątna etykieta-przycisk, jak w referencji. */
export function Btn({ to, children, variant = 'dark', arrow = false, className = '' }: BtnProps) {
  const cls = `btn btn--${variant} ${className}`
  const inner = (
    <>
      <span>{children}</span>
      {arrow && <Arrow />}
    </>
  )
  if (/^(https?:|mailto:|#)/.test(to)) return <a className={cls} href={to}>{inner}</a>
  return <Link className={cls} to={to}>{inner}</Link>
}

/** Link tekstowy ze strzałką. */
export function More({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="more" to={to}>
      <span>{children}</span>
      <Arrow />
    </Link>
  )
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

export function Eyebrow({ children }: { children: ReactNode; light?: boolean }) {
  return <p className="kicker">{children}</p>
}

export function Seo({ title, description, image = 'mc-team' }: { title: string; description: string; image?: string }) {
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

/** Miejsce reklamowe. Baner, okres emisji i statystyki przyjdą z panelu.
 *  bar = pasek partnera głównego, wide = baner 1200×300, tile = kafel 600×600. */
export function AdSlot({ id, label, variant = 'wide', img = 'salon-pink' }: { id: string; label: string; variant?: 'wide' | 'tile' | 'bar'; img?: string }) {
  const l = useLocale()
  const pl = l === 'pl'
  if (variant === 'bar')
    return (
      <aside className="adbar" data-ad-slot={id} aria-label={label}>
        <span className="adbar__k">{pl ? 'Partner główny' : 'Main partner'}</span>
        <span className="adbar__logo">Maison Coiffure</span>
        <span className="adbar__txt">{pl ? 'Oficjalny partner strefy Hair' : 'Official Hair Zone partner'}</span>
      </aside>
    )
  return (
    <aside className={`ad ad--${variant}`} data-ad-slot={id} aria-label={label}>
      <div className="ad__media">
        <Img name={img} sizes={variant === 'wide' ? '(max-width: 800px) 100vw, 50vw' : '(max-width: 800px) 50vw, 25vw'} />
      </div>
      <div className="ad__body">
        <span className="ad__label">
          {label} · {variant === 'wide' ? '1200 × 300' : '600 × 600'}
        </span>
        <span className="ad__brand">Atelier Lumière</span>
        <span className="ad__claim">{pl ? 'Nowa kolekcja na targach — stoisko B04' : 'New collection at the expo — stand B04'}</span>
        <span className="ad__cta">{pl ? 'Sprawdź →' : 'Discover →'}</span>
      </div>
    </aside>
  )
}

/** Przykładowe banery partnerów (kreacje robocze). Docelowo: grafika z panelu, okres emisji, licznik wyświetleń i kliknięć. */
const BANNERS = {
  gold: {
    brand: 'Maison Coiffure',
    claim: { pl: 'Kolekcja Lumière 2028 — premiera na scenie głównej', en: 'Lumière 2028 collection — premiere on the main stage' },
    cta: { pl: 'Zobacz pokaz', en: 'See the show' },
    kicker: { pl: 'Partner strategiczny', en: 'Strategic partner' },
  },
  dark: {
    brand: 'Derma Lab',
    claim: { pl: '−20% na aparaturę tylko w dniach targów', en: '−20% on devices during the expo only' },
    cta: { pl: 'Stoisko D01', en: 'Stand D01' },
    kicker: { pl: 'Oferta targowa', en: 'Expo offer' },
  },
  photo: {
    brand: 'Nude Studio',
    claim: { pl: 'Mistrzostwa stylizacji paznokci — zapisz się', en: 'Nail art championship — sign up' },
    cta: { pl: 'Zapisy', en: 'Sign up' },
    kicker: { pl: 'Partner strefy Nails', en: 'Nails Zone partner' },
  },
} as const

export function Banner({ id, variant, wide = false }: { id: string; variant: keyof typeof BANNERS; wide?: boolean }) {
  const l = useLocale()
  const b = BANNERS[variant]
  return (
    <a className={`bnr bnr--${variant} ${wide ? 'bnr--wide' : ''}`} href="#" onClick={(e) => e.preventDefault()} data-ad-slot={id}>
      {variant === 'photo' && (
        <span className="bnr__bg">
          <Img name="zone-nails" sizes="(max-width: 800px) 100vw, 50vw" />
        </span>
      )}
      <span className="bnr__label">
        {l === 'pl' ? 'Reklama' : 'Ad'} · {wide ? '1440 × 360' : '720 × 360'}
      </span>
      <span className="bnr__kicker">{b.kicker[l]}</span>
      <span className="bnr__brand">{b.brand}</span>
      <span className="bnr__claim">{b.claim[l]}</span>
      <span className="bnr__cta">{b.cta[l]} →</span>
    </a>
  )
}
