import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useMatches } from 'react-router-dom'
import { href, t, ui, type Locale } from '../i18n'
import { EVENT, PARTNERS } from '../content/site'
import { LocaleCtx } from './ui'
import Motion from './Motion'

export type RouteHandle = { alt: Record<Locale, string>; plain?: boolean }

export default function Layout({ locale }: { locale: Locale }) {
  return (
    <LocaleCtx.Provider value={locale}>
      <Header locale={locale} />
      <main id="main">
        <Outlet />
      </main>
      <PartnerStrip locale={locale} />
      <Footer locale={locale} />
      <Motion />
      <ScrollRestoration />
    </LocaleCtx.Provider>
  )
}

/** Cienki pasek z linkami tekstowymi, jak w referencji. */
function Header({ locale: l }: { locale: Locale }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const matches = useMatches()
  const handle = matches.at(-1)?.handle as RouteHandle | undefined
  const alt = handle?.alt
  const isHome = /^\/(en\/?)?$/.test(pathname)

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

  const left = [
    { to: href(l, 'program'), label: t(ui.nav.program, l) },
    { to: href(l, 'tickets'), label: t(ui.nav.tickets, l) },
    { to: href(l, 'exhibitors'), label: t(ui.nav.exhibitors, l) },
    { to: href(l, 'about'), label: t(ui.nav.about, l) },
  ]
  const right = [
    { to: href(l, 'partners'), label: t(ui.nav.partners, l) },
    { to: href(l, 'news'), label: t(ui.nav.news, l) },
    { to: href(l, 'contact'), label: t(ui.nav.contact, l) },
  ]
  const other: Locale = l === 'pl' ? 'en' : 'pl'

  return (
    <header className={`hdr ${scrolled ? 'hdr--solid' : ''} ${open ? 'hdr--open' : ''} ${isHome && !scrolled && !open ? 'hdr--onphoto' : ''}`}>
      <div className="hdr__bar">
        <nav className="hdr__nav" aria-label="Menu">
          {left.map((x) => (
            <NavLink key={x.to} to={x.to} className="hdr__link">
              {x.label}
            </NavLink>
          ))}
        </nav>
        <Link to={href(l, 'home')} className={`hdr__logo ${!isHome || scrolled || open ? 'hdr__logo--on' : ''}`} aria-label={EVENT.brand}>
          Beauty &amp; Hair Expo
        </Link>
        <div className="hdr__right">
          <nav className="hdr__nav" aria-label="Menu 2">
            {right.map((x) => (
              <NavLink key={x.to} to={x.to} className="hdr__link">
                {x.label}
              </NavLink>
            ))}
          </nav>
          <Link className="hdr__link hdr__lang" to={alt?.[other] ?? href(other, 'home')} hrefLang={other} lang={other}>
            {other.toUpperCase()}
          </Link>
          <Link className="hdr__cta" to={href(l, 'tickets')}>
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
          <Link className="btn btn--dark" to={href(l, 'tickets')}>
            {t(ui.buyTicket, l)}
          </Link>
          <Link className="btn btn--outline" to={href(l, 'exhibit')}>
            {t(ui.becomeExhibitor, l)}
          </Link>
          <Link className="mnav__lang" to={alt?.[other] ?? href(other, 'home')}>
            {other === 'en' ? 'English' : 'Polski'}
          </Link>
        </div>
      </div>
    </header>
  )
}

/** Pas partnerów na każdej stronie — stałe miejsce na logotypy sponsorów. */
function PartnerStrip({ locale: l }: { locale: Locale }) {
  const names = PARTNERS.slice(0, 3).flatMap((g) => g.names)
  return (
    <section className="pstrip wrap" aria-label={l === 'pl' ? 'Partnerzy' : 'Partners'}>
      <div className="pstrip__head">
        <p className="kicker">{l === 'pl' ? 'Partnerzy Beauty & Hair Expo' : 'Beauty & Hair Expo partners'}</p>
        <Link className="more" to={href(l, 'partners')}>
          {l === 'pl' ? 'Zostań partnerem →' : 'Become a partner →'}
        </Link>
      </div>
      <div className="pstrip__row">
        {names.map((n, i) => (
          <span key={n} className={`pstrip__logo ${i === 0 ? 'pstrip__logo--main' : ''}`}>
            {n}
          </span>
        ))}
      </div>
    </section>
  )
}

function Footer({ locale: l }: { locale: Locale }) {
  const cols = [
    {
      title: { pl: 'Targi', en: 'Expo' },
      links: [
        [href(l, 'about'), ui.nav.about],
        [href(l, 'program'), ui.nav.program],
        [href(l, 'tickets'), ui.nav.tickets],
        [href(l, 'visit'), { pl: 'Dojazd', en: 'Getting there' }],
      ],
    },
    {
      title: { pl: 'Współpraca', en: 'Work with us' },
      links: [
        [href(l, 'exhibit'), ui.becomeExhibitor],
        [href(l, 'exhibitors'), { pl: 'Katalog wystawców', en: 'Exhibitors' }],
        [href(l, 'partners'), { pl: 'Partnerzy i reklama', en: 'Partners & ads' }],
        [href(l, 'media'), { pl: 'Media', en: 'Press' }],
      ],
    },
    {
      title: { pl: 'Więcej', en: 'More' },
      links: [
        [href(l, 'news'), ui.nav.news],
        [href(l, 'contact'), ui.nav.contact],
        [href(l, 'terms'), { pl: 'Regulamin', en: 'Terms' }],
        [href(l, 'privacy'), { pl: 'Prywatność', en: 'Privacy' }],
      ],
    },
  ] as const

  return (
    <footer className="ftr wrap">
      <div className="ftr__top">
        <div className="ftr__brand">
          <p className="ftr__logo">Beauty &amp; Hair Expo</p>
          <p className="ftr__meta">
            {t(EVENT.dates, l)}
            <br />
            {EVENT.venue}, {t(EVENT.city, l)}
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title.pl} className="ftr__col">
            <h3>{t(c.title, l)}</h3>
            <ul>
              {c.links.map(([to, label]) => (
                <li key={to}>
                  <Link to={to}>{t(label, l)}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="ftr__col">
          <h3>{l === 'pl' ? 'Obserwuj' : 'Follow'}</h3>
          <ul>
            {EVENT.social.map((s) => (
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
          © 2028 {EVENT.brand} · {l === 'pl' ? 'Organizator' : 'Organiser'}: {EVENT.organizer}
        </span>
        <span>{t(ui.sample, l)}</span>
      </div>
    </footer>
  )
}
