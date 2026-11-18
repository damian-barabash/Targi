import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Head } from 'vite-react-ssg'
import type { Locale } from '../i18n'
import { imgSet, imgSrc } from '../lib/img'
import { link } from '../lib/link'
import { trackAd } from '../lib/track'
import { RT, S } from '../content/site'
import type { Banner } from '../content/types'
import { E, Im, useEdit } from '../blocks/edit'

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
  if (/^(https?:|mailto:|tel:|#)/.test(to) || !to) return <a className={cls} href={to || '#'}>{inner}</a>
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
  const target = new Date(S.event.startsAt).getTime()
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

export function Seo({ title, description, image }: { title: string; description: string; image?: string }) {
  const l = useLocale()
  const full = title.includes(S.event.brand) ? title : `${title} · ${S.event.brand}`
  image ||= S.settings.ogImage || 'mc-team'
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

/** Banery pasujące do miejsca reklamowego i terminu emisji. */
export function bannersFor(slot: string, formats: Banner['format'][], now = Date.now()): Banner[] {
  const day = new Date(now).toISOString().slice(0, 10)
  return (S.banners ?? []).filter(
    (b) => b.active !== false && formats.includes(b.format) && b.slots?.includes(slot) && (!b.from || b.from <= day) && (!b.to || b.to >= day),
  )
}

/** Wybór kreacji: w HTML-u pierwsza pasująca, w przeglądarce losowa wg wagi (rotacja) + licznik wyświetleń. */
function useBanner(slot: string, formats: Banner['format'][]) {
  const ed = useEdit()
  const [id, setId] = useState<string | undefined>(() => bannersFor(slot, formats)[0]?.id)
  const ref = useRef<HTMLElement>(null)
  const list = bannersFor(slot, formats)
  const banner = list.find((b) => b.id === id) ?? list[0]

  useEffect(() => {
    if (RT.preview) return
    const all = bannersFor(slot, formats)
    if (all.length < 2) return setId(all[0]?.id)
    let r = Math.random() * all.reduce((s, b) => s + (b.weight || 1), 0)
    setId((all.find((b) => (r -= b.weight || 1) < 0) ?? all[0]).id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot])

  useEffect(() => {
    const el = ref.current
    if (!el || !banner || ed || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          trackAd(banner.id, slot, 'i')
          io.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [banner?.id, slot, ed])

  const idx = banner ? S.banners.indexOf(banner) : -1
  return { banner, ref, at: `banners.${idx}`, ed }
}

function AdLink({ banner, slot, className, children, innerRef }: { banner: Banner; slot: string; className: string; children: ReactNode; innerRef: React.Ref<any> }) {
  const l = useLocale()
  const url = link(l, banner.url)
  const common = { className, 'data-ad-slot': slot, ref: innerRef }
  if (!url) return <aside {...common}>{children}</aside>
  return (
    <a {...common} href={url} target={/^https?:/.test(url) ? '_blank' : undefined} rel="sponsored noopener" onClick={() => trackAd(banner.id, slot, 'c')}>
      {children}
    </a>
  )
}

function EmptySlot({ slot }: { slot: string }) {
  return (
    <div className="e-empty" data-ad-slot={slot}>
      Miejsce reklamowe „{slot}” — brak aktywnego banera
    </div>
  )
}

/** Miejsce reklamowe. bar = pasek partnera głównego, wide = baner 1200×300, tile = kafel 600×600. */
export function AdSlot({ slot, format = 'wide' }: { slot: string; format?: 'wide' | 'tile' | 'bar' }) {
  const l = useLocale()
  const { banner: b, ref, at, ed } = useBanner(slot, [format])
  if (!b) return ed ? <EmptySlot slot={slot} /> : null
  const label = l === 'pl' ? 'Reklama' : 'Advertisement'
  if (format === 'bar')
    return (
      <AdLink banner={b} slot={slot} className="adbar" innerRef={ref}>
        <E at={`${at}.kicker`} className="adbar__k" />
        <E at={`${at}.brand`} className="adbar__logo" />
        <E at={`${at}.claim`} className="adbar__txt" />
      </AdLink>
    )
  return (
    <AdLink banner={b} slot={slot} className={`ad ad--${format}`} innerRef={ref}>
      <div className="ad__media">
        <Im at={`${at}.img`} sizes={format === 'wide' ? '(max-width: 800px) 100vw, 50vw' : '(max-width: 800px) 50vw, 25vw'} />
      </div>
      <div className="ad__body">
        <span className="ad__label">
          {label} · {format === 'wide' ? '1200 × 300' : '600 × 600'}
        </span>
        <E at={`${at}.brand`} className="ad__brand" />
        <E at={`${at}.claim`} className="ad__claim" />
        {(b.cta?.[l] || ed) && (
          <span className="ad__cta">
            <E at={`${at}.cta`} /> →
          </span>
        )}
      </div>
    </AdLink>
  )
}

/** Baner partnera z tłem: złoty, ciemny albo ze zdjęciem. */
export function BannerSlot({ slot, wide = false }: { slot: string; wide?: boolean }) {
  const l = useLocale()
  const { banner: b, ref, at, ed } = useBanner(slot, ['banner'])
  if (!b) return ed ? <EmptySlot slot={slot} /> : null
  const style = b.style ?? 'gold'
  return (
    <AdLink banner={b} slot={slot} className={`bnr bnr--${style} ${wide ? 'bnr--wide' : ''}`} innerRef={ref}>
      {style === 'photo' && (
        <span className="bnr__bg">
          <Im at={`${at}.img`} sizes="(max-width: 800px) 100vw, 50vw" />
        </span>
      )}
      <span className="bnr__label">
        {l === 'pl' ? 'Reklama' : 'Ad'} · {wide ? '1440 × 360' : '720 × 360'}
      </span>
      <E at={`${at}.kicker`} className="bnr__kicker" />
      <E at={`${at}.brand`} className="bnr__brand" />
      <E at={`${at}.claim`} className="bnr__claim" />
      {(b.cta?.[l] || ed) && (
        <span className="bnr__cta">
          <E at={`${at}.cta`} /> →
        </span>
      )}
    </AdLink>
  )
}
