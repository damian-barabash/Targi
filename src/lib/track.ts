// Statystyki bez cookies: jedno małe wywołanie na odsłonę + zbiorcze zdarzenia banerów.
// W bazie zapisują się tylko sumy dzienne (patrz supabase/migrations/*admin_panel.sql).
import { RT, S } from '../content/site'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

function enabled() {
  if (typeof window === 'undefined' || !URL || !KEY || RT.preview) return false
  if (S.settings?.tracking === false || navigator.webdriver) return false
  if (/^(localhost|127\.|192\.168\.)/.test(location.hostname) || location.pathname.includes('/admin')) return false
  return true
}

function rpc(fn: string, body: unknown) {
  fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    keepalive: true,
    headers: { apikey: KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}

function source(): string {
  const r = document.referrer
  if (!r) return 'direct'
  let h = ''
  try {
    h = new window.URL(r).hostname
  } catch {
    return 'other'
  }
  if (h === location.hostname) return 'direct'
  if (/google\./.test(h)) return 'google'
  if (/facebook|fb\.com|fb\.me/.test(h)) return 'facebook'
  if (/instagram/.test(h)) return 'instagram'
  if (/tiktok/.test(h)) return 'tiktok'
  if (/bing\.|duckduckgo|yahoo\.|ecosia|qwant/.test(h)) return 'search'
  return 'other'
}

export function trackVisit(path: string, lang: string) {
  if (!enabled()) return
  let src = 'direct'
  let fresh = false
  try {
    const saved = sessionStorage.getItem('bhe-src')
    if (saved) src = saved
    else {
      src = source()
      fresh = true
      sessionStorage.setItem('bhe-src', src)
    }
  } catch {
    src = source()
  }
  const w = window.innerWidth
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const p = (path.startsWith(base) ? path.slice(base.length) : path).replace(/\/+$/, '') || '/'
  rpc('track_visit', { p_path: p, p_lang: lang, p_device: w < 700 ? 'mobile' : w < 1100 ? 'tablet' : 'desktop', p_source: src, p_new: fresh })
}

type Ev = { b: string; s: string; i: number; c: number }
let queue: Record<string, Ev> = {}
let timer: ReturnType<typeof setTimeout> | undefined
let bound = false

function flush() {
  clearTimeout(timer)
  timer = undefined
  const events = Object.values(queue)
  queue = {}
  if (events.length) rpc('track_ads', { p_events: events })
}

export function trackAd(banner: string, slot: string, kind: 'i' | 'c') {
  if (!enabled()) return
  const k = `${banner}|${slot}`
  const e = (queue[k] ??= { b: banner, s: slot, i: 0, c: 0 })
  e[kind] += 1
  if (!bound) {
    bound = true
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush())
  }
  if (kind === 'c') flush()
  else timer ??= setTimeout(flush, 5000)
}
