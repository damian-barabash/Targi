// Panel administracyjny: logowanie, menu, górny pasek (zapis / publikacja), ekrany.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import '@fontsource-variable/geist/index.css'
import '@fontsource-variable/geist-mono/index.css'
import './admin.css'
import { db, ROLE_LABEL, rpc, type Profile } from './api'
import { boot, canEdit, discard, fail, get, loadContent, publish, save, setLoc, setMe, signOut, toast, useStore } from './store'
import { AskHost, Btn, Icon, Modal, Spinner, Toasts, ask } from './ui'
import { MediaPickerHost } from './media'
import { COLLECTIONS } from './schema'
import Dashboard from './screens/Dashboard'
import CollectionScreen from './screens/Collection'
import PagesList from './screens/PagesList'
import Editor from './screens/Editor'
import MediaScreen from './screens/MediaScreen'
import Leads from './screens/Leads'
import Newsletter from './screens/Newsletter'
import Ads from './screens/Ads'
import Visits from './screens/Visits'
import CrmScreen from './crm/Crm'
import Orders from './screens/Orders'
import Scanner from './screens/Scanner'
import NotifySettings from './screens/NotifySettings'
import { Editions, History, NavScreen, PublishScreen, Users } from './screens/System'

/* ───────── prosty router po # (jedna statyczna strona /admin/) ───────── */
export function useRoute(): string[] {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [r, setR] = useState(read)
  useEffect(() => {
    const on = () => setR(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r
}
export const go = (to: string) => {
  window.location.hash = `/${to}`
}

/** Role z wąskim dostępem widzą tylko swoje ekrany. */
export const ONLY: Record<string, string[]> = { sales: ['crm'], scanner: ['scan'] }
const allowed = (role: string, to: string) => !ONLY[role] || ONLY[role].includes(to)

type Item = { to: string; label: string; icon: string; show?: (role: string) => boolean; badge?: number }
const staff = () => true
const notReports = (r: string) => r !== 'reports'
const MENU: { title?: string; items: Item[] }[] = [
  { items: [{ to: '', label: 'Pulpit', icon: 'home' }] },
  {
    title: 'Treść',
    items: [
      { to: 'pages', label: 'Strony', icon: 'pages' },
      { to: 'c/posts', label: 'Aktualności', icon: 'news' },
      { to: 'c/faq', label: 'FAQ', icon: 'faq' },
      { to: 'media', label: 'Media', icon: 'image' },
    ],
  },
  {
    title: 'Targi',
    items: [
      { to: 'editions', label: 'Edycje', icon: 'layers' },
      { to: 'c/event', label: 'Dane wydarzenia', icon: 'calendar' },
      { to: 'c/tickets', label: 'Bilety', icon: 'ticket' },
      { to: 'c/masterclasses', label: 'Masterclass', icon: 'cap' },
      { to: 'c/program', label: 'Program', icon: 'list' },
      { to: 'c/experts', label: 'Eksperci', icon: 'users' },
      { to: 'c/faces', label: 'Twarze', icon: 'star' },
      { to: 'c/zones', label: 'Strefy', icon: 'grid' },
      { to: 'c/exhibitors', label: 'Wystawcy', icon: 'book' },
      { to: 'c/partners', label: 'Partnerzy', icon: 'heart' },
    ],
  },
  {
    title: 'Sprzedaż i marketing',
    items: [
      { to: 'crm', label: 'Klienci (CRM)', icon: 'crm' },
      { to: 'orders', label: 'Sprzedaż biletów', icon: 'ticket', show: (r) => ['admin', 'tickets', 'reports'].includes(r) },
      { to: 'scan', label: 'Skaner biletów', icon: 'target', show: (r) => ['admin', 'tickets'].includes(r) },
      { to: 'leads', label: 'Zgłoszenia', icon: 'inbox' },
      { to: 'newsletter', label: 'Newsletter', icon: 'send' },
      { to: 'ads', label: 'Reklama', icon: 'ad' },
      { to: 'stats', label: 'Statystyki', icon: 'chart' },
    ],
  },
  {
    title: 'System',
    items: [
      { to: 'nav', label: 'Menu i stopka', icon: 'menu', show: notReports },
      { to: 'c/settings', label: 'Ustawienia strony', icon: 'settings', show: notReports },
      { to: 'notify', label: 'Powiadomienia e-mail', icon: 'mail', show: (r) => r === 'admin' },
      { to: 'users', label: 'Użytkownicy', icon: 'shield', show: (r) => r === 'admin' },
      { to: 'history', label: 'Historia zmian', icon: 'history', show: staff },
      { to: 'publish', label: 'Publikacja i wersje', icon: 'rocket', show: staff },
    ],
  },
]
const SUB: Record<string, { to: string; label: string }[]> = {
  'c/tickets': [
    { to: 'c/tickets', label: 'Rodzaje i ceny' },
    { to: 'c/ticketDays', label: 'Dni' },
    { to: 'c/catering', label: 'Catering' },
    { to: 'c/promoCodes', label: 'Kody rabatowe' },
  ],
  'c/program': [
    { to: 'c/program', label: 'Harmonogram' },
    { to: 'c/stats', label: 'Liczby' },
  ],
}
export const subTabs = (route: string) => Object.values(SUB).find((g) => g.some((x) => x.to === route))

/* ───────── logowanie ───────── */
function Login({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [reset, setReset] = useState(false)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    setErr('')
    const email = String(fd.get('email')).trim()
    if (reset) {
      const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${import.meta.env.BASE_URL}admin/` })
      setBusy(false)
      return setErr(error ? error.message : 'Jeśli konto istnieje, wysłaliśmy link do ustawienia hasła.')
    }
    const { error } = await db.auth.signInWithPassword({ email, password: String(fd.get('password')) })
    setBusy(false)
    if (error) setErr(/Invalid login/.test(error.message) ? 'Nieprawidłowy e-mail lub hasło.' : error.message)
    else onDone()
  }
  return (
    <div className="login">
      <div className="login__art" aria-hidden="true">
        <p className="login__mark">
          Beauty &amp; Hair
          <span>Expo · panel</span>
        </p>
        <p className="login__claim">Strona, bilety, wystawcy i klienci w jednym miejscu.</p>
      </div>
      <form className="login__form" onSubmit={submit}>
        <h1>{reset ? 'Ustaw nowe hasło' : 'Zaloguj się'}</h1>
        <p className="muted-t">{reset ? 'Podaj e-mail konta — wyślemy link.' : 'Konta zakłada administrator panelu.'}</p>
        <label className="ff__l" htmlFor="l-email">
          E-mail
        </label>
        <input id="l-email" className="in" name="email" type="email" required autoComplete="username" autoFocus />
        {!reset && (
          <>
            <label className="ff__l" htmlFor="l-pass">
              Hasło
            </label>
            <input id="l-pass" className="in" name="password" type="password" required autoComplete="current-password" />
          </>
        )}
        {err && <p className="login__err">{err}</p>}
        <Btn kind="primary" type="submit" busy={busy} className="login__btn">
          {reset ? 'Wyślij link' : 'Zaloguj się'}
        </Btn>
        <button type="button" className="linkbtn" onClick={() => (setReset(!reset), setErr(''))}>
          {reset ? '← Wróć do logowania' : 'Nie pamiętasz hasła?'}
        </button>
      </form>
    </div>
  )
}

function NewPassword({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal title="Ustaw nowe hasło" onClose={onDone}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          const { error } = await db.auth.updateUser({ password: String(new FormData(e.currentTarget).get('p')) })
          setBusy(false)
          if (error) return fail(error)
          toast('Hasło zmienione')
          onDone()
        }}
      >
        <label className="ff__l">Nowe hasło (min. 8 znaków)</label>
        <input className="in" name="p" type="password" minLength={8} required autoComplete="new-password" />
        <div className="row row--end mt">
          <Btn kind="primary" type="submit" busy={busy}>
            Zapisz hasło
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

/* ───────── publikacja (okno) ───────── */
function PublishDialog({ onClose }: { onClose: () => void }) {
  const dirty = useStore((s) => s.dirty.length)
  const busy = useStore((s) => s.publishing || s.saving)
  const [note, setNote] = useState('')
  const [done, setDone] = useState<{ dispatched: boolean; reason?: string } | null>(null)
  return (
    <Modal
      title="Opublikuj zmiany na stronie"
      onClose={onClose}
      footer={
        done ? (
          <>
            <Btn onClick={() => (onClose(), go('publish'))}>Zobacz postęp</Btn>
            <Btn kind="primary" onClick={onClose}>
              Gotowe
            </Btn>
          </>
        ) : (
          <>
            <Btn onClick={onClose}>Anuluj</Btn>
            <Btn kind="gold" icon="rocket" busy={busy} onClick={async () => setDone(await publish(note))}>
              Opublikuj
            </Btn>
          </>
        )
      }
    >
      {done ? (
        done.dispatched ? (
          <p className="notice notice--ok">
            <Icon n="check" /> Wersja zapisana, strona właśnie się buduje. Zmiany będą widoczne za 2–3 minuty.
          </p>
        ) : (
          <p className="notice notice--warn">
            <Icon n="info" /> Wersja została zapisana, ale nie udało się uruchomić budowania strony ({done.reason ?? 'brak tokenu GitHub'}). Uruchom wdrożenie ręcznie w GitHub Actions.
          </p>
        )
      ) : (
        <>
          <p className="muted-t">
            Wszystko, co jest w wersji roboczej (wszystkie sekcje, nie tylko bieżąca), trafi na stronę publiczną. Budowanie trwa 2–3 minuty.
            {dirty > 0 && ' Niezapisane zmiany zostaną najpierw zapisane.'}
          </p>
          <label className="ff__l">Opis wersji (opcjonalnie)</label>
          <input className="in" value={note} onChange={(e) => setNote(e.target.value)} placeholder="np. Nowe ceny biletów, wpis o masterclass" maxLength={200} />
        </>
      )}
    </Modal>
  )
}

/* ───────── powłoka ───────── */
const ls = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* tryb prywatny */
    }
  },
}
const menuFor = (role: string) =>
  MENU.map((g) => ({ ...g, items: g.items.filter((x) => (!x.show || x.show(role)) && allowed(role, x.to)) })).filter((g) => g.items.length)

/** Szybkie przejście do ekranu: ⌘K / Ctrl+K. */
function CommandPalette({ role, onClose }: { role: string; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const all = useMemo(
    () =>
      menuFor(role).flatMap((g) =>
        g.items.flatMap((x) => [{ to: x.to, label: x.label, icon: x.icon, group: g.title ?? 'Panel' }, ...(SUB[x.to] ?? []).slice(1).map((s) => ({ to: s.to, label: `${x.label} · ${s.label}`, icon: x.icon, group: g.title ?? 'Panel' }))]),
      ),
    [role],
  )
  const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
  const list = all.filter((x) => fold(`${x.label} ${x.group}`).includes(fold(q)))
  const pick = (to: string) => (go(to), onClose())
  return (
    <div className="cmdk" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cmdk__box" role="dialog" aria-label="Szukaj w panelu">
        <label className="cmdk__in">
          <Icon n="search" s={17} />
          <input
            autoFocus
            value={q}
            placeholder="Dokąd chcesz przejść?"
            onChange={(e) => (setQ(e.target.value), setI(0))}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') (e.preventDefault(), setI((v) => Math.min(list.length - 1, v + 1)))
              if (e.key === 'ArrowUp') (e.preventDefault(), setI((v) => Math.max(0, v - 1)))
              if (e.key === 'Enter' && list[i]) pick(list[i].to)
              if (e.key === 'Escape') onClose()
            }}
          />
          <kbd>esc</kbd>
        </label>
        <ul className="cmdk__list">
          {list.map((x, n) => (
            <li key={x.to}>
              <button type="button" className={n === i ? 'on' : ''} onMouseEnter={() => setI(n)} onClick={() => pick(x.to)}>
                <Icon n={x.icon} s={16} />
                <span>{x.label}</span>
                <small>{x.group}</small>
              </button>
            </li>
          ))}
          {!list.length && <li className="cmdk__none">Nic nie znaleziono</li>}
        </ul>
      </div>
    </div>
  )
}

function Shell({ route, children }: { route: string[]; children: ReactNode }) {
  const me = useStore((s) => s.me)!
  const dirty = useStore((s) => s.dirty.length)
  const saving = useStore((s) => s.saving)
  const editions = useStore((s) => s.editions)
  const editionId = useStore((s) => s.editionId)
  const loc = useStore((s) => s.loc)
  const pending = useStore((s) => Boolean(s.lastChange && (!s.lastPublish || s.lastChange > s.lastPublish)))
  const [open, setOpen] = useState(false)
  const [pub, setPub] = useState(false)
  const [cmd, setCmd] = useState(false)
  const [rail, setRail] = useState(() => ls.get('bhe-rail') === '1')
  const [closed, setClosed] = useState<string[]>(() => JSON.parse(ls.get('bhe-groups') || '[]'))
  const [newLeads, setNewLeads] = useState(0)
  const [crmDue, setCrmDue] = useState(0)
  const [pill, setPill] = useState<{ top: number; h: number; on: boolean }>({ top: 0, h: 34, on: false })
  const nav = useRef<HTMLDivElement>(null)
  const path = route.join('/')
  const limited = Boolean(ONLY[me.role])
  const active = (to: string) => (to === '' ? path === '' : path === to || path.startsWith(`${to}/`) || (subTabs(path)?.[0].to === to && subTabs(path)?.some((x) => x.to === path)))
  const groups = menuFor(me.role)
  const current = groups.flatMap((g) => g.items.map((x) => ({ ...x, group: g.title }))).find((x) => active(x.to))
  const sub = subTabs(path)?.find((x) => x.to === path)
  const edition = editions.find((e) => e.id === editionId)

  useEffect(() => setOpen(false), [path])
  useEffect(() => ls.set('bhe-rail', rail ? '1' : '0'), [rail])
  useEffect(() => ls.set('bhe-groups', JSON.stringify(closed)), [closed])
  useEffect(() => {
    db.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')
      .then(({ count }) => setNewLeads(count ?? 0))
  }, [path === 'leads'])
  useEffect(() => {
    rpc<{ mineDue: number } | null>('crm_counts')
      .then((n) => setCrmDue(n?.mineDue ?? 0))
      .catch(() => {})
  }, [route[0]])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        save()
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmd((v) => !v)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        setRail((v) => !v)
      }
    }
    const onLeave = (e: BeforeUnloadEvent) => {
      if (get().dirty.length) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('beforeunload', onLeave)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('beforeunload', onLeave)
    }
  }, [])

  // przesuwany znacznik aktywnej pozycji menu
  useLayoutEffect(() => {
    const box = nav.current
    if (!box) return
    const place = () => {
      const a = box.querySelector<HTMLElement>('a.on')
      const hidden = !a || a.closest('.side__group.is-closed')
      if (!a || hidden) return setPill((p) => ({ ...p, on: false }))
      const r = a.getBoundingClientRect()
      const b = box.getBoundingClientRect()
      setPill({ top: r.top - b.top, h: r.height, on: true })
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(box)
    const t = setTimeout(place, 320)
    return () => (ro.disconnect(), clearTimeout(t))
  }, [path, rail, closed.join(), groups.length])

  async function switchEdition(id: string) {
    if (get().dirty.length && !(await ask({ title: 'Porzucić niezapisane zmiany?', text: 'Zmiana edycji wczyta jej dane od nowa.', yes: 'Porzuć i przełącz', danger: true }))) return
    await loadContent(id)
    toast('Wczytano dane wybranej edycji')
  }
  const toggleGroup = (t: string) => setClosed((c) => (c.includes(t) ? c.filter((x) => x !== t) : [...c, t]))

  // dolny pasek na telefonie: najważniejsze ekrany dla roli + „Menu”
  const flat = groups.flatMap((g) => g.items)
  const tabs = (
    me.role === 'sales'
      ? [
          { to: 'crm', label: 'Osoby', icon: 'users' },
          { to: 'crm/firmy', label: 'Firmy', icon: 'building' },
          { to: 'crm/zadania', label: 'Zadania', icon: 'clock' },
        ]
      : (['', 'crm', flat.some((x) => x.to === 'orders') ? 'orders' : 'leads', flat.some((x) => x.to === 'scan') ? 'scan' : 'c/posts'] as string[])
          .map((to) => flat.find((x) => x.to === to))
          .filter((x): x is Item => Boolean(x))
          .map((x) => ({ to: x.to, label: { '': 'Pulpit', crm: 'Klienci', orders: 'Bilety', leads: 'Zgłoszenia', scan: 'Skaner', 'c/posts': 'Wpisy' }[x.to] ?? x.label, icon: x.icon }))
  ).slice(0, 4)
  const tabOn = (to: string) => (me.role === 'sales' ? (to === 'crm' ? !['firmy', 'f', 'zadania'].includes(route[1] ?? '') && route[0] === 'crm' : to === 'crm/firmy' ? ['firmy', 'f'].includes(route[1] ?? '') : route[1] === 'zadania') : active(to))

  return (
    <div className={`adm ${open ? 'adm--nav' : ''} ${rail ? 'adm--rail' : ''}`}>
      <aside className="side">
        <div className="side__grab" onClick={() => setOpen(false)} />
        <label className={`side__ws ${limited || editions.length < 2 ? 'side__ws--static' : ''}`} title={limited ? undefined : 'Edycja targów, której dane edytujesz'}>
          <span className="side__logo">B&amp;H</span>
          <span className="side__wst">
            <small>{limited ? 'Panel' : 'Edycja'}</small>
            <strong>{limited ? 'Beauty & Hair Expo' : (edition?.name ?? 'Beauty & Hair Expo')}</strong>
          </span>
          {!limited && editions.length > 1 && (
            <>
              <Icon n="chevrons" s={15} className="side__wsc" />
              <select value={editionId} onChange={(e) => switchEdition(e.target.value)} aria-label="Edycja targów">
                {editions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                    {e.is_current ? ' · na stronie' : ''}
                  </option>
                ))}
              </select>
            </>
          )}
        </label>

        <nav className="side__nav">
          <div className="side__navin" ref={nav}>
            <span className={`side__pill ${pill.on ? 'on' : ''}`} style={{ transform: `translateY(${pill.top}px)`, height: pill.h }} />
            {groups.map((g, i) => {
              const key = g.title ?? `g${i}`
              const isClosed = !rail && Boolean(g.title) && closed.includes(key)
              return (
                <div key={key} className={`side__group ${isClosed ? 'is-closed' : ''}`}>
                  {g.title && (
                    <button type="button" className="side__gt" onClick={() => toggleGroup(key)} aria-expanded={!isClosed}>
                      <span>{g.title}</span>
                      <Icon n="chevron" s={13} />
                    </button>
                  )}
                  <div className="side__items">
                    <div>
                      {g.items.map((x) => (
                        <a key={x.to} href={`#/${x.to}`} className={active(x.to) ? 'on' : ''} title={rail ? x.label : undefined} tabIndex={isClosed ? -1 : undefined}>
                          <Icon n={x.icon} s={17} />
                          <span>{x.label}</span>
                          {x.to === 'leads' && newLeads > 0 && <em>{newLeads}</em>}
                          {x.to === 'crm' && crmDue > 0 && <em title="Twoje zadania na dziś i zaległe">{crmDue}</em>}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </nav>

        <div className="side__me">
          <span className="avatar">
            {(me.name || me.email)[0].toUpperCase()}
            <i />
          </span>
          <div>
            <strong>{me.name || me.email}</strong>
            <small>{ROLE_LABEL[me.role]}</small>
          </div>
          <Btn kind="plain" small icon="logout" title="Wyloguj" onClick={signOut} />
        </div>
      </aside>
      <div className="side__shade" onClick={() => setOpen(false)} />

      <div className="main">
        <header className="top">
          <Btn kind="plain" small icon="sidebar" title={rail ? 'Rozwiń menu (⌘\\)' : 'Zwiń menu (⌘\\)'} className="top__rail" onClick={() => setRail(!rail)} />
          <nav className="crumbs" aria-label="Ścieżka">
            <span>{current?.group ?? 'Panel'}</span>
            <Icon n="right" s={12} />
            <strong key={current?.to ?? 'x'}>{current?.label ?? 'Pulpit'}</strong>
            {sub && sub.to !== current?.to && (
              <>
                <Icon n="right" s={12} />
                <strong key={sub.to}>{sub.label}</strong>
              </>
            )}
          </nav>
          <span className="grow" />
          <button type="button" className="top__search" onClick={() => setCmd(true)}>
            <Icon n="search" s={15} />
            <span>Szukaj…</span>
            <kbd>⌘K</kbd>
          </button>
          {!limited && (
            <div className="seg" role="group" aria-label="Język edycji treści">
              {(['pl', 'en'] as const).map((l) => (
                <button key={l} className={loc === l ? 'on' : ''} onClick={() => setLoc(l)}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          {dirty > 0 && (
            <>
              <span className="top__dirty">Niezapisane</span>
              <Btn kind="plain" small onClick={async () => (await ask({ title: 'Cofnąć wszystkie niezapisane zmiany?', yes: 'Cofnij zmiany', danger: true })) && discard()}>
                Odrzuć
              </Btn>
            </>
          )}
          {!limited && (
            <Btn icon="check" busy={saving} disabled={!dirty} onClick={() => save()} title="Zapisz wersję roboczą (Ctrl/⌘ + S)" className={`top__save ${dirty ? 'is-dirty' : ''}`}>
              Zapisz
            </Btn>
          )}
          {me.role !== 'reports' && !limited && (
            <Btn kind="primary" icon="rocket" onClick={() => setPub(true)} className={`top__pub ${pending || dirty ? 'has-dot' : ''}`} title={pending ? 'Są zmiany, których nie ma jeszcze na stronie' : 'Strona jest aktualna'}>
              Opublikuj
            </Btn>
          )}
          <a className="ab ab--icon top__ext" href={import.meta.env.BASE_URL} target="_blank" rel="noopener" title="Otwórz stronę">
            <Icon n="external" s={16} />
          </a>
        </header>
        <div className="content" key={route[0] === 'c' ? `c/${route[1]}` : (route[0] ?? '')}>
          {children}
        </div>
      </div>

      <nav className="tabbar" aria-label="Główne ekrany">
        {tabs.map((x) => (
          <a key={x.to} href={`#/${x.to}`} className={tabOn(x.to) && !open ? 'on' : ''}>
            <Icon n={x.icon} s={21} />
            <span>{x.label}</span>
            {x.to === 'crm' && crmDue > 0 && <em>{crmDue}</em>}
            {x.to === 'leads' && newLeads > 0 && <em>{newLeads}</em>}
          </a>
        ))}
        <button type="button" className={open ? 'on' : ''} onClick={() => setOpen(!open)}>
          <Icon n={open ? 'x' : 'menu'} s={21} />
          <span>Menu</span>
        </button>
      </nav>
      {pub && <PublishDialog onClose={() => setPub(false)} />}
      {cmd && <CommandPalette role={me.role} onClose={() => setCmd(false)} />}
    </div>
  )
}

function Screen({ route }: { route: string[] }) {
  const role = useStore((s) => s.me!.role)
  let [a, b, c] = route
  if (ONLY[role] && !ONLY[role].includes(a ?? '')) [a, b, c] = [ONLY[role][0], undefined as any, undefined as any]
  if (!a) return <Dashboard />
  if (a === 'pages') return <PagesList />
  if (a === 'c' && COLLECTIONS[b]) return <CollectionScreen key={b} id={b} index={c} />
  if (a === 'media') return <MediaScreen />
  if (a === 'crm') return <CrmScreen sub={b} id={c} />
  if (a === 'orders') return <Orders id={b} />
  if (a === 'scan') return <Scanner />
  if (a === 'notify') return <NotifySettings />
  if (a === 'leads') return <Leads />
  if (a === 'newsletter') return <Newsletter />
  if (a === 'ads') return <Ads sub={b} />
  if (a === 'stats') return <Visits />
  if (a === 'nav') return <NavScreen />
  if (a === 'users') return <Users />
  if (a === 'history') return <History />
  if (a === 'publish') return <PublishScreen />
  if (a === 'editions') return <Editions />
  return (
    <div className="empty">
      <strong>Nie ma takiego ekranu</strong>
      <a href="#/">Wróć do pulpitu</a>
    </div>
  )
}

function App() {
  const me = useStore((s) => s.me)
  const ready = useStore((s) => s.ready)
  const [checked, setChecked] = useState(false)
  const [denied, setDenied] = useState(false)
  const [recover, setRecover] = useState(false)
  const route = useRoute()

  async function load() {
    const { data } = await db.auth.getSession()
    if (!data.session) {
      setMe(null)
      return setChecked(true)
    }
    const { data: p } = await db.from('profiles').select('*').eq('id', data.session.user.id).maybeSingle()
    setChecked(true)
    if (!p || !p.active) {
      setDenied(true)
      return
    }
    setDenied(false)
    // skaner nie potrzebuje treści strony (i nie ma do nich dostępu)
    if (p.role === 'scanner') return setMe(p as Profile)
    await boot(p as Profile).catch(fail)
  }
  useEffect(() => {
    load()
    const { data } = db.auth.onAuthStateChange((ev) => {
      if (ev === 'PASSWORD_RECOVERY') setRecover(true)
      if (ev === 'SIGNED_OUT') setMe(null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (!checked) return <Spinner />
  if (denied)
    return (
      <div className="login login--msg">
        <div className="login__form">
          <h1>Brak dostępu</h1>
          <p className="muted-t">To konto nie ma uprawnień do panelu. Poproś administratora o nadanie roli.</p>
          <Btn kind="primary" onClick={async () => (await signOut(), setDenied(false))}>
            Wyloguj
          </Btn>
        </div>
      </div>
    )
  if (!me) return <Login onDone={load} />
  if (me.role === 'scanner') return <Scanner standalone />
  if (!ready) return <Spinner label="Wczytuję treści…" />
  return (
    <>
      {route[0] === 'edit' ? <Editor pageId={route[1]} /> : <Shell route={route}><Screen route={route} /></Shell>}
      {recover && <NewPassword onDone={() => setRecover(false)} />}
    </>
  )
}

/** Trasa /admin — renderuje się tylko w przeglądarce (w wygenerowanym HTML jest pusta). */
export function AdminPage() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    document.documentElement.classList.add('adm-root')
    document.title = 'Panel · Beauty & Hair Expo'
    const m = document.createElement('meta')
    m.name = 'robots'
    m.content = 'noindex, nofollow'
    document.head.appendChild(m)
    setOn(true)
    return () => document.documentElement.classList.remove('adm-root')
  }, [])
  if (!on) return null
  return (
    <>
      <App />
      <Toasts />
      <AskHost />
      <MediaPickerHost />
    </>
  )
}
export { canEdit }
