// Wersja robocza treści w panelu: jedna kopia całej strony (SiteData), edycja po ścieżkach,
// zapis tylko zmienionych sekcji (RPC save_content), cofanie zmian, publikacja.
import { useSyncExternalStore } from 'react'
import { DEFAULT } from '../content/default'
import { EDITION_KEYS, type PageDoc, type SiteData } from '../content/types'
import { getIn, setIn } from '../lib/path'
import { db, fn, rpc, type Profile } from './api'

export type Edition = { id: string; name: string; year: number; is_current: boolean; created_at: string }
type Toast = { id: number; kind: 'ok' | 'err' | 'info'; text: string }

type State = {
  me: Profile | null
  ready: boolean
  site: SiteData
  saved: SiteData
  dirty: string[]
  stamps: Record<string, string>
  editions: Edition[]
  editionId: string
  saving: boolean
  publishing: boolean
  lastChange: string | null
  lastPublish: string | null
  loc: 'pl' | 'en'
  toasts: Toast[]
  undo: number
  redo: number
}

let state: State = {
  me: null,
  ready: false,
  site: DEFAULT,
  saved: DEFAULT,
  dirty: [],
  stamps: {},
  editions: [],
  editionId: '',
  saving: false,
  publishing: false,
  lastChange: null,
  lastPublish: null,
  loc: 'pl',
  toasts: [],
  undo: 0,
  redo: 0,
}
const subs = new Set<() => void>()
const emit = (patch: Partial<State>) => {
  state = { ...state, ...patch }
  subs.forEach((f) => f())
}
export const useStore = <R,>(sel: (s: State) => R): R =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => sel(state),
    () => sel(state),
  )
export const get = () => state

/* ───────── komunikaty ───────── */
let toastId = 0
export function toast(text: string, kind: Toast['kind'] = 'ok') {
  const id = ++toastId
  emit({ toasts: [...state.toasts, { id, kind, text }] })
  setTimeout(() => emit({ toasts: state.toasts.filter((x) => x.id !== id) }), kind === 'err' ? 7000 : 3500)
}
export const fail = (e: unknown) => toast(errText(e), 'err')
export function errText(e: unknown) {
  const m = String((e as Error)?.message ?? e)
  if (/forbidden|permission denied|42501/.test(m)) return 'Brak uprawnień do tej operacji.'
  if (/Failed to fetch|NetworkError/.test(m)) return 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.'
  return m
}

/* ───────── uprawnienia (to samo co can_edit_key w bazie) ───────── */
const ROLE_KEYS: Record<string, string[]> = {
  marketing: ['nav', 'settings', 'posts', 'faq', 'banners', 'faces', 'experts', 'program', 'zones', 'stats', 'partners'],
  exhibitors: ['exhibitors', 'partners', 'zones'],
  tickets: ['event', 'tickets', 'ticketDays', 'catering', 'masterclasses', 'promoCodes'],
}
export function canEdit(key: string, role = state.me?.role): boolean {
  if (!role) return false
  if (role === 'admin') return true
  if (key.startsWith('page:') || key === 'pages') return role === 'marketing'
  return ROLE_KEYS[role]?.includes(key) ?? false
}

/* ───────── ścieżka → sekcja ───────── */
export function keyOf(path: string, site = state.site): string {
  const [root, idx] = path.split('.')
  return root === 'pages' ? `page:${site.pages[Number(idx)]?.id}` : root
}
const scopeOf = (key: string) => ((EDITION_KEYS as readonly string[]).includes(key) ? state.editionId : 'global')
const dataOf = (site: SiteData, key: string) => (key.startsWith('page:') ? site.pages.find((p) => p.id === key.slice(5)) : (site as any)[key])

/* ───────── cofanie ───────── */
let undoStack: { site: SiteData; dirty: string[] }[] = []
let redoStack: { site: SiteData; dirty: string[] }[] = []
let lastEdit = { path: '', at: 0 }

function commit(site: SiteData, keys: string[], path = '') {
  const now = Date.now()
  // szybkie poprawki tego samego pola łączą się w jeden krok cofania
  if (!(path && path === lastEdit.path && now - lastEdit.at < 1200)) {
    undoStack.push({ site: state.site, dirty: state.dirty })
    if (undoStack.length > 80) undoStack.shift()
  }
  lastEdit = { path, at: now }
  redoStack = []
  emit({ site, dirty: [...new Set([...state.dirty, ...keys])], undo: undoStack.length, redo: 0 })
}

/** Zmiana jednego pola. Edycja polskiego tekstu oznacza angielski jako „do sprawdzenia”. */
export function set(path: string, value: unknown) {
  const key = keyOf(path)
  if (!canEdit(key)) return toast('Twoja rola nie pozwala zmieniać tej sekcji.', 'err')
  let site = setIn(state.site, path, value)
  if (path.endsWith('.pl')) {
    const base = path.slice(0, -3)
    const tv = getIn(site, base)
    if (tv?.en && tv.en !== value && !tv._s) site = setIn(site, `${base}._s`, true)
  } else if (path.endsWith('.en')) {
    const base = path.slice(0, -3)
    if (getIn(site, base)?._s) {
      const { _s, ...rest } = getIn(site, base)
      site = setIn(site, base, rest)
    }
  }
  commit(site, [key], path)
}

/** Zmiana wielu rzeczy naraz (np. kolejność bloków, nowa strona). */
export function mutate(fnc: (site: SiteData) => SiteData, keys: string[]) {
  const denied = keys.find((k) => !canEdit(k))
  if (denied) return toast('Twoja rola nie pozwala zmieniać tej sekcji.', 'err')
  commit(fnc(state.site), keys)
}

export function undo() {
  const prev = undoStack.pop()
  if (!prev) return
  redoStack.push({ site: state.site, dirty: state.dirty })
  lastEdit = { path: '', at: 0 }
  emit({ site: prev.site, dirty: diffKeys(prev.site), undo: undoStack.length, redo: redoStack.length })
}
export function redo() {
  const next = redoStack.pop()
  if (!next) return
  undoStack.push({ site: state.site, dirty: state.dirty })
  emit({ site: next.site, dirty: diffKeys(next.site), undo: undoStack.length, redo: redoStack.length })
}
function diffKeys(site: SiteData): string[] {
  const keys = new Set<string>()
  for (const k of Object.keys(site)) if (k !== 'pages' && (site as any)[k] !== (state.saved as any)[k]) keys.add(k)
  for (const p of site.pages) if (p !== state.saved.pages.find((x) => x.id === p.id)) keys.add(`page:${p.id}`)
  for (const p of state.saved.pages) if (!site.pages.some((x) => x.id === p.id)) keys.add(`page:${p.id}`)
  return [...keys].filter((k) => !['edition', 'publishedAt', 'snapshotId'].includes(k))
}
export function discard() {
  undoStack = []
  redoStack = []
  emit({ site: state.saved, dirty: [], undo: 0, redo: 0 })
}

/* ───────── opis zmiany do historii ───────── */
const KEY_LABEL: Record<string, string> = {
  event: 'Dane wydarzenia', stats: 'Liczby', tickets: 'Bilety', ticketDays: 'Dni biletów', catering: 'Catering', promoCodes: 'Kody rabatowe',
  faces: 'Twarze wydarzenia', zones: 'Strefy', masterclasses: 'Masterclass', experts: 'Eksperci', program: 'Program', exhibitors: 'Wystawcy',
  partners: 'Partnerzy', posts: 'Aktualności', faq: 'FAQ', banners: 'Banery', nav: 'Menu i stopka', settings: 'Ustawienia strony',
}
export const keyLabel = (key: string, site = state.site) =>
  key.startsWith('page:') ? `Strona „${site.pages.find((p) => p.id === key.slice(5))?.title.pl ?? key.slice(5)}”` : (KEY_LABEL[key] ?? key)

function changes(a: any, b: any, path = '', out: string[] = []): string[] {
  if (out.length >= 4 || a === b) return out
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length) out.push(`${path || 'lista'}: ${a.length} → ${b.length} poz.`)
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (k !== '_s') changes(a[k], b[k], path ? `${path}.${k}` : k, out)
  } else {
    const s = (v: unknown) => (v == null || v === '' ? '∅' : String(typeof v === 'object' ? '…' : v).slice(0, 40))
    out.push(`${path}: ${s(a)} → ${s(b)}`)
  }
  return out
}

/* ───────── zapis ───────── */
export async function save(force = false): Promise<boolean> {
  if (!state.dirty.length || state.saving) return true
  emit({ saving: true })
  const site = state.site
  const done: string[] = []
  const stamps = { ...state.stamps }
  let ok = true
  for (const key of state.dirty) {
    const data = dataOf(site, key)
    try {
      if (data === undefined && key.startsWith('page:')) {
        await rpc('delete_content', { p_scope: 'global', p_key: key, p_summary: `Usunięto: ${keyLabel(key, state.saved)}` })
        delete stamps[key]
      } else {
        const was = dataOf(state.saved, key)
        const summary = `${keyLabel(key, site)} — ${was === undefined ? 'utworzono' : changes(was, data).join('; ') || 'zmiana'}`
        stamps[key] = await rpc('save_content', { p_scope: scopeOf(key), p_key: key, p_data: data, p_summary: summary, p_expected: force ? null : (stamps[key] ?? null) })
      }
      done.push(key)
    } catch (e: any) {
      ok = false
      if (e.code === '40001') toast(`${keyLabel(key)}: ktoś zmienił tę sekcję w międzyczasie. Odśwież panel albo zapisz ponownie, aby nadpisać.`, 'err')
      else fail(e)
    }
  }
  // zapisane sekcje stają się punktem odniesienia
  let saved = state.saved
  for (const key of done) {
    if (key.startsWith('page:')) {
      const p = site.pages.find((x) => x.id === key.slice(5))
      const rest = saved.pages.filter((x) => x.id !== key.slice(5))
      saved = { ...saved, pages: (p ? [...rest, p] : rest).sort((a, b) => a.order - b.order) }
    } else saved = { ...saved, [key]: (site as any)[key] }
  }
  emit({ saving: false, saved, stamps, dirty: state.dirty.filter((k) => !done.includes(k)), lastChange: done.length ? new Date().toISOString() : state.lastChange })
  if (ok) toast('Zapisano wersję roboczą')
  return ok
}

/* ───────── wczytanie ───────── */
export async function boot(me: Profile) {
  emit({ me, ready: false })
  rpc('touch_seen').catch(() => {})
  let { data: editions } = await db.from('editions').select('*').order('year')
  if (!editions?.length && me.role === 'admin') {
    await seed()
    editions = (await db.from('editions').select('*').order('year')).data
  }
  const eds = (editions ?? []) as Edition[]
  const cur = eds.find((e) => e.is_current) ?? eds[eds.length - 1]
  emit({ editions: eds })
  await loadContent(cur?.id ?? '')
  const { data: snap } = await db.from('snapshots').select('created_at').order('id', { ascending: false }).limit(1)
  emit({ lastPublish: snap?.[0]?.created_at ?? null, ready: true })
}

export async function loadContent(editionId: string) {
  const { data, error } = await db.from('content').select('scope,key,data,updated_at').in('scope', ['global', editionId || '-'])
  if (error) return fail(error)
  const site: any = { ...DEFAULT, pages: [] as PageDoc[] }
  const stamps: Record<string, string> = {}
  let last: string | null = null
  for (const r of data ?? []) {
    stamps[r.key] = r.updated_at
    if (!last || r.updated_at > last) last = r.updated_at
    if (r.key.startsWith('page:')) site.pages.push(r.data)
    else site[r.key] = r.data
  }
  site.settings = { ...DEFAULT.settings, ...site.settings }
  site.event = { ...DEFAULT.event, ...site.event }
  site.pages.sort((a: PageDoc, b: PageDoc) => a.order - b.order)
  if (!site.pages.length) site.pages = DEFAULT.pages
  const ed = state.editions.find((e) => e.id === editionId)
  site.edition = ed ? { id: ed.id, name: ed.name, year: ed.year } : null
  undoStack = []
  redoStack = []
  emit({ site, saved: site, stamps, dirty: [], editionId, lastChange: last, undo: 0, redo: 0 })
}

/** Pierwsze uruchomienie: edycja 2028 + treści domyślne. */
async function seed() {
  const id = await rpc<string>('create_edition', { p_name: 'Rzeszów 2028', p_year: 2028, p_copy_from: null })
  await rpc('update_edition', { p_id: id, p_name: 'Rzeszów 2028', p_year: 2028, p_current: true })
  const jobs: Promise<unknown>[] = []
  for (const [key, data] of Object.entries(DEFAULT)) {
    if (key === 'pages' || key === 'edition') continue
    jobs.push(rpc('save_content', { p_scope: (EDITION_KEYS as readonly string[]).includes(key) ? id : 'global', p_key: key, p_data: data, p_summary: 'Treści początkowe' }))
  }
  for (const p of DEFAULT.pages) jobs.push(rpc('save_content', { p_scope: 'global', p_key: `page:${p.id}`, p_data: p, p_summary: 'Treści początkowe' }))
  await Promise.all(jobs)
}

export async function reloadEditions() {
  const { data } = await db.from('editions').select('*').order('year')
  emit({ editions: (data ?? []) as Edition[] })
}

/* ───────── publikacja ───────── */
export async function publish(note: string): Promise<{ dispatched: boolean; reason?: string } | null> {
  if (state.dirty.length && !(await save())) return null
  emit({ publishing: true })
  try {
    const r = await fn<{ snapshot: number; dispatched: boolean; reason?: string }>('publish', { note })
    emit({ publishing: false, lastPublish: new Date().toISOString() })
    return r
  } catch (e) {
    emit({ publishing: false })
    fail(e)
    return null
  }
}

export const setLoc = (loc: 'pl' | 'en') => emit({ loc })
export const signOut = async () => {
  await db.auth.signOut()
  emit({ me: null, ready: false })
}
export const setMe = (me: Profile | null) => emit({ me })

/* ───────── tłumaczenia ───────── */
/** Wszystkie pola dwujęzyczne w poddrzewie, którym brakuje EN albo EN jest nieaktualne. */
export function untranslated(root: any, base: string, out: { path: string; pl: string }[] = []): { path: string; pl: string }[] {
  if (!root || typeof root !== 'object') return out
  if (typeof root.pl === 'string' && 'en' in root) {
    if (root.pl.trim() && (!String(root.en ?? '').trim() || root._s)) out.push({ path: base, pl: root.pl })
    return out
  }
  for (const k of Object.keys(root)) untranslated(root[k], base ? `${base}.${k}` : k, out)
  return out
}

export async function translatePaths(items: { path: string; pl: string }[]): Promise<number> {
  if (!items.length) {
    toast('Wszystkie teksty mają już aktualną wersję angielską.', 'info')
    return 0
  }
  let n = 0
  try {
    for (let i = 0; i < items.length; i += 30) {
      const chunk = items.slice(i, i + 30)
      const { texts } = await fn<{ texts: string[] }>('translate', { texts: chunk.map((x) => x.pl), from: 'pl', to: 'en' })
      const keys = new Set<string>()
      let site = state.site
      chunk.forEach((x, j) => {
        const cur = getIn(site, x.path) ?? {}
        const { _s, ...rest } = cur
        site = setIn(site, x.path, { ...rest, en: texts[j] })
        keys.add(keyOf(x.path, site))
      })
      commit(site, [...keys])
      n += chunk.length
    }
    toast(`Przetłumaczono ${n} ${n === 1 ? 'tekst' : 'tekstów'} na angielski — sprawdź i zapisz.`)
  } catch (e: any) {
    if (/not_configured/.test(e.message)) toast('Tłumaczenie automatyczne nie jest jeszcze skonfigurowane (brak adresu i modelu AI w sekretach).', 'err')
    else fail(e)
  }
  return n
}
