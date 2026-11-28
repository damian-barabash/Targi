import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useMatches } from 'react-router-dom'
import { t, ui, type Locale } from '../i18n'
import { S } from '../content/site'
import { link, pageHref } from '../lib/link'
import { trackVisit } from '../lib/track'
import { LocaleCtx } from './ui'
import Motion from './Motion'
import { LogoRun } from '../blocks/blocks'

export type RouteHandle = { alt: Record<Locale, string>; plain?: boolean }

export default function Layout({ locale }: { locale: Locale }) {
  const { pathname } = useLocation()
  useEffect(() => trackVisit(pathname, locale), [pathname, locale])
  return (
    <LocaleCtx.Provider value={locale}>
      <Header locale={locale} />
      <main id="main">
        <Outlet />
      </main>
      {S.settings.partnerStrip !== false && <PartnerStrip locale={locale} />}
      <Footer locale={locale} />
      <Motion />
      <ScrollRestoration />
    </LocaleCtx.Provider>
  )
}

/** Cienki pasek z linkami tekstowymi, jak w referencji. */
export function Header({ locale: l, home }: { locale: Locale; home?: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const matches = useMatches()
  const handle = matches.at(-1)?.handle as RouteHandle | undefined
  const alt = handle?.alt
  const isHome = home ?? /^\/(en\/?)?$/.test(pathname)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open)
  }, [open])

  const nav = (items: typeof S.nav.left) => items.map((x) => ({ to: link(l, x.link) || '#', label: t(x.label, l) }))
  const left = nav(S.nav.left)
  const right = nav(S.nav.right)
  const other: Locale = l === 'pl' ? 'en' : 'pl'

  return (
    <header className={`hdr ${scrolled ? 'hdr--solid' : ''} ${open ? 'hdr--open' : ''}`}>
      <div className="hdr__bar">
        <nav className="hdr__nav" aria-label="Menu">
          {left.map((x) => (
            <NavLink key={x.to} to={x.to} className="hdr__link">
              {x.label}
            </NavLink>
          ))}
        </nav>
        <Link to={pageHref(l, 'home')} className={`hdr__logo ${!isHome || scrolled || open ? 'hdr__logo--on' : ''}`} aria-label={S.event.brand}>
          <span className="ohmark">
            oh<b>!</b>targi.pl
          </span>
        </Link>
        <div className="hdr__right">
          <nav className="hdr__nav" aria-label="Menu 2">
            {right.map((x) => (
              <NavLink key={x.to} to={x.to} className="hdr__link">
                {x.label}
              </NavLink>
            ))}
          </nav>
          <Link className="hdr__link hdr__lang" to={alt?.[other] ?? pageHref(other, 'home')} hrefLang={other} lang={other}>
            {other.toUpperCase()}
          </Link>
          <Link className="hdr__cta" to={pageHref(l, 'tickets')}>
            {t(ui.buyTicket, l)}
          </Link>
          <button className="hdr__burger" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((v) => !v)}>
            {open ? t(ui.close, l) : t(ui.menu, l)}
          </button>
        </div>
      </div>

      <div id="mobile-menu" className="mnav" hidden={!open}>
        <nav>
          {[...left, ...right].map((x) => (
            <NavLink key={x.to} to={x.to} className="mnav__link">
              {x.label}
            </NavLink>
          ))}
        </nav>
        <div className="mnav__foot">
          <Link className="btn btn--dark" to={pageHref(l, 'tickets')}>
            {t(ui.buyTicket, l)}
          </Link>
          <Link className="btn btn--outline" to={pageHref(l, 'exhibit')}>
            {t(ui.becomeExhibitor, l)}
          </Link>
          <Link className="mnav__lang" to={alt?.[other] ?? pageHref(other, 'home')}>
            {other === 'en' ? 'English' : 'Polski'}
          </Link>
        </div>
      </div>
    </header>
  )
}

/** Pas partnerów na każdej stronie — stałe miejsce na logotypy sponsorów. */
export function PartnerStrip({ locale: l }: { locale: Locale }) {
  const { pathname } = useLocation()
  const items = S.partners.slice(0, 3).flatMap((g) => g.items ?? [])
  // brak partnerów = brak paska; na stronie głównej i na stronie partnerów logotypy są już w treści
  if (!items.length || /^\/(en\/)?$/.test(pathname) || /\/(partnerzy|partners)\/?$/.test(pathname)) return null
  return (
    <section className="pstrip wrap" aria-label={l === 'pl' ? 'Partnerzy' : 'Partners'}>
      <div className="pstrip__head">
        <p className="kicker">{l === 'pl' ? 'Partnerzy Beauty & Hair Expo' : 'Beauty & Hair Expo partners'}</p>
        <Link className="more" to={pageHref(l, 'partners')}>
          {l === 'pl' ? 'Zostań partnerem →' : 'Become a partner →'}
        </Link>
      </div>
      <LogoRun tone="mono" speed={36} tiers={3} />
    </section>
  )
}

export function Footer({ locale: l }: { locale: Locale }) {
  const EVENT = S.event
  return (
    <footer className="ftr wrap">
      <div className="ftr__top">
        <div className="ftr__brand">
          <p className="ftr__logo">
            <span className="ohmark">
              oh<b>!</b>targi.pl
            </span>
            <span className="ftr__brand-name">{EVENT.brand}</span>
          </p>
          <p className="ftr__meta">
            {t(EVENT.dates, l)}
            <br />
            {EVENT.venue}, {t(EVENT.city, l)}
          </p>
        </div>
        {S.nav.footer.map((c, i) => (
          <div key={i} className="ftr__col">
            <h3>{t(c.title, l)}</h3>
            <ul>
              {c.links.map((x, j) => (
                <li key={j}>
                  <Link to={link(l, x.link) || '#'}>{t(x.label, l)}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="ftr__col">
          <h3>{l === 'pl' ? 'Obserwuj' : 'Follow'}</h3>
          <ul>
            {S.settings.social.map((s) => (
              <li key={s.name}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="ftr__bottom">
        <span>
          © {new Date(EVENT.startsAt).getFullYear()} {EVENT.brand} · {l === 'pl' ? 'Organizator' : 'Organiser'}: {EVENT.organizer}
        </span>
        <span>{t(S.settings.footerNote, l)}</span>
      </div>
    </footer>
  )
}
