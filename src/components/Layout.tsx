import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useMatches } from 'react-router-dom'
import { href, t, ui, type Locale } from '../i18n'
import { EVENT } from '../content/site'
import { Btn, LocaleCtx } from './ui'

export type RouteHandle = { alt: Record<Locale, string>; plain?: boolean }

export default function Layout({ locale }: { locale: Locale }) {
  return (
    <LocaleCtx.Provider value={locale}>
      <Header locale={locale} />
      <main id="main">
        <Outlet />
      </main>
      <Footer locale={locale} />
      <ScrollRestoration />
    </LocaleCtx.Provider>
  )
}

function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className={`wordmark ${light ? 'wordmark--light' : ''}`}>
      <span className="wordmark__main">Beauty&nbsp;&amp;&nbsp;Hair</span>
      <span className="wordmark__sub">Expo · Rzeszów</span>
    </span>
  )
}

function Header({ locale: l }: { locale: Locale }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const matches = useMatches()
  const handle = matches.at(-1)?.handle as RouteHandle | undefined
  const alt = handle?.alt
  // strony bez zdjęcia na górze — pasek od razu jasny
  const solid = scrolled || !!handle?.plain

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open)
  }, [open])

  const links = [
    { to: href(l, 'about'), label: t(ui.nav.about, l) },
    { to: href(l, 'program'), label: t(ui.nav.program, l) },
    { to: href(l, 'tickets'), label: t(ui.nav.tickets, l) },
    { to: href(l, 'exhibitors'), label: t(ui.nav.exhibitors, l) },
    { to: href(l, 'partners'), label: t(ui.nav.partners, l) },
    { to: href(l, 'news'), label: t(ui.nav.news, l) },
    { to: href(l, 'contact'), label: t(ui.nav.contact, l) },
  ]
  const other: Locale = l === 'pl' ? 'en' : 'pl'

  return (
    <header className={`hdr ${solid ? 'hdr--solid' : ''} ${open ? 'hdr--open' : ''}`}>
      <div className="hdr__bar">
        <Link to={href(l, 'home')} className="hdr__logo" aria-label={EVENT.brand}>
          <Wordmark light={!solid && !open} />
        </Link>
        <nav className="hdr__nav" aria-label="Menu">
          {links.map((x) => (
            <NavLink key={x.to} to={x.to} className="hdr__link">
              {x.label}
            </NavLink>
          ))}
        </nav>
        <div className="hdr__actions">
          <Link className="hdr__lang" to={alt?.[other] ?? href(other, 'home')} hrefLang={other} lang={other}>
            {other.toUpperCase()}
          </Link>
          <Btn to={href(l, 'tickets')} variant={solid || open ? 'dark' : 'light'} arrow={false} className="hdr__cta">
            {t(ui.buyTicket, l)}
          </Btn>
          <button
            className="hdr__burger"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t(ui.close, l) : t(ui.menu, l)}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>

      <div id="mobile-menu" className="mnav" hidden={!open}>
        <nav>
          {links.map((x, i) => (
            <NavLink key={x.to} to={x.to} className="mnav__link" style={{ transitionDelay: `${i * 30}ms` }}>
              {x.label}
            </NavLink>
          ))}
        </nav>
        <div className="mnav__cta">
          <Btn to={href(l, 'tickets')}>{t(ui.buyTicket, l)}</Btn>
          <Btn to={href(l, 'exhibit')} variant="outline">
            {t(ui.becomeExhibitor, l)}
          </Btn>
        </div>
      </div>
    </header>
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
        [href(l, 'visit'), { pl: 'Informacje praktyczne', en: 'Plan your visit' }],
      ],
    },
    {
      title: { pl: 'Współpraca', en: 'Work with us' },
      links: [
        [href(l, 'exhibit'), ui.becomeExhibitor],
        [href(l, 'exhibitors'), { pl: 'Katalog wystawców', en: 'Exhibitor directory' }],
        [href(l, 'partners'), { pl: 'Partnerzy i reklama', en: 'Partners & advertising' }],
        [href(l, 'media'), { pl: 'Dla mediów', en: 'Press' }],
      ],
    },
    {
      title: { pl: 'Informacje', en: 'Info' },
      links: [
        [href(l, 'news'), ui.nav.news],
        [href(l, 'contact'), ui.nav.contact],
        [href(l, 'terms'), { pl: 'Regulamin', en: 'Terms' }],
        [href(l, 'privacy'), { pl: 'Polityka prywatności', en: 'Privacy policy' }],
      ],
    },
  ] as const

  return (
    <footer className="ftr">
      <div className="ftr__top wrap">
        <div className="ftr__intro">
          <p className="ftr__date">
            {t(EVENT.dates, l)}
            <br />
            {EVENT.venue}, {t(EVENT.city, l)}
          </p>
          <div className="ftr__btns">
            <Btn to={href(l, 'tickets')} variant="light">
              {t(ui.buyTicket, l)}
            </Btn>
            <Btn to={href(l, 'exhibit')} variant="outline" className="btn--on-dark">
              {t(ui.becomeExhibitor, l)}
            </Btn>
          </div>
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
            <li>
              <a href={`mailto:${EVENT.emails.kontakt}`}>{EVENT.emails.kontakt}</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="ftr__mark" aria-hidden="true">
        Beauty &amp; Hair
      </div>
      <div className="ftr__bottom wrap">
        <span>
          © 2028 {EVENT.brand}. {l === 'pl' ? 'Organizator' : 'Organiser'}: {EVENT.organizer}
        </span>
        <span className="ftr__draft">{t(ui.sample, l)}</span>
      </div>
    </footer>
  )
}
