import type { ReactElement } from 'react'
import type { RouteRecord } from 'vite-react-ssg'
import Layout from './components/Layout'
import { LOCALES, SLUGS, href, t, type Locale, type PageKey } from './i18n'
import { POSTS, ZONES } from './content/site'
import Home from './pages/Home'
import Tickets from './pages/Tickets'
import Program from './pages/Program'
import { Exhibit, Exhibitors } from './pages/Exhibitors'
import { About, Contact, Legal, Media, News, NotFound, Partners, PostPage, Visit, ZonePage } from './pages/Pages'

type Page = { key: PageKey; slug?: Record<Locale, string>; el: (l: Locale) => ReactElement }

const both = (s: string) => ({ pl: s, en: s })

const pages: Page[] = [
  { key: 'home', el: () => <Home /> },
  { key: 'about', el: () => <About /> },
  { key: 'program', el: () => <Program /> },
  { key: 'tickets', el: () => <Tickets /> },
  { key: 'exhibitors', el: () => <Exhibitors /> },
  { key: 'exhibit', el: () => <Exhibit /> },
  { key: 'partners', el: () => <Partners /> },
  { key: 'media', el: () => <Media /> },
  { key: 'news', el: () => <News /> },
  { key: 'visit', el: () => <Visit /> },
  { key: 'contact', el: () => <Contact /> },
  { key: 'terms', el: () => <Legal kind="terms" /> },
  { key: 'privacy', el: () => <Legal kind="privacy" /> },
  ...ZONES.map((z): Page => ({ key: 'zone', slug: { pl: t(z.slug, 'pl'), en: t(z.slug, 'en') }, el: () => <ZonePage zone={z} /> })),
  ...POSTS.map((p): Page => ({ key: 'post', slug: both(p.slug), el: () => <PostPage post={p} /> })),
]

/** Każda podstrona to osobny, wygenerowany plik HTML (SSG) — bez parametrów w trasach. */
export const routes: RouteRecord[] = LOCALES.map((l) => ({
  path: l === 'pl' ? '/' : `/${l}`,
  element: <Layout locale={l} />,
  children: [
    ...pages.map((p) => {
      const alt = { pl: href('pl', p.key, p.slug?.pl), en: href('en', p.key, p.slug?.en) }
      const rel = [SLUGS[p.key][l], p.slug?.[l]].filter(Boolean).join('/')
      const handle = { alt, plain: p.key === 'post' || p.key === 'terms' || p.key === 'privacy' }
      return rel ? { path: rel, element: p.el(l), handle } : { index: true as const, element: p.el(l), handle }
    }),
    // 404: '404' generuje plik (kopiowany do dist/404.html dla GitHub Pages), '*' łapie resztę w przeglądarce
    ...(l === 'pl' ? [{ path: '404', element: <NotFound />, handle: { alt: { pl: '/', en: '/en' }, plain: true } }] : []),
    { path: '*', element: <NotFound />, handle: { alt: { pl: '/', en: '/en' }, plain: true } },
  ],
}))
