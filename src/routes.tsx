import type { ReactElement } from 'react'
import type { RouteRecord } from 'vite-react-ssg'
import Layout from './components/Layout'
import { LOCALES, type Locale } from './i18n'
import { S } from './content/site'
import { pageHref, postHref, zoneHref } from './lib/link'
import PageView from './blocks/PageView'
import { NotFound, PostPage, ZonePage } from './pages/Pages'

type Page = { path: (l: Locale) => string; el: ReactElement; plain?: boolean }

// Strony z panelu (systemowe i własne) + szablony stref i wpisów.
const pages: Page[] = [
  ...S.pages.map((p): Page => ({ path: (l) => pageHref(l, p.id), el: <PageView id={p.id} />, plain: p.plain })),
  ...S.zones.map((z, i): Page => ({ path: (l) => zoneHref(l, z), el: <ZonePage index={i} /> })),
  ...S.posts.map((p, i): Page | null => (p.draft ? null : { path: (l) => postHref(l, p), el: <PostPage index={i} />, plain: true })).filter((x): x is Page => !!x),
]

/** Każda podstrona to osobny, wygenerowany plik HTML (SSG) — bez parametrów w trasach. */
const site: RouteRecord[] = LOCALES.map((l) => {
  const root = l === 'pl' ? '/' : `/${l}`
  return {
    path: root,
    element: <Layout locale={l} />,
    children: [
      ...pages.map((p) => {
        const handle = { alt: { pl: p.path('pl'), en: p.path('en') }, plain: p.plain }
        const rel = p.path(l).slice(root.length).replace(/^\//, '')
        return rel ? { path: rel, element: p.el, handle } : { index: true as const, element: p.el, handle }
      }),
      // 404: '404' generuje plik (kopiowany do dist/404.html dla GitHub Pages), '*' łapie resztę w przeglądarce
      ...(l === 'pl' ? [{ path: '404', element: <NotFound />, handle: { alt: { pl: '/', en: '/en' }, plain: true } }] : []),
      { path: '*', element: <NotFound />, handle: { alt: { pl: '/', en: '/en' }, plain: true } },
    ],
  }
})

/** Panel i podgląd edytora ładują się osobno (lazy) — nie obciążają strony publicznej. */
export const routes: RouteRecord[] = [
  { path: '/admin', lazy: () => import('./admin/entry').then((m) => ({ Component: m.AdminPage })) },
  { path: '/admin/preview', lazy: () => import('./admin/Preview').then((m) => ({ Component: m.PreviewPage })) },
  ...site,
]
