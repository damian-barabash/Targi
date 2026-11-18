// Panel administracyjny: logowanie, menu, górny pasek (zapis / publikacja), ekrany.
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import './admin.css'
import { db, ROLE_LABEL, type Profile } from './api'
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
        <p className="login__claim">Strona, bilety, wystawcy i reklama — w jednym miejscu.</p>
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
  const [newLeads, setNewLeads] = useState(0)
  const path = route.join('/')
  const active = (to: string) => (to === '' ? path === '' : path === to || path.startsWith(`${to}/`) || (subTabs(path)?.[0].to === to && subTabs(path)?.some((x) => x.to === path)))

  useEffect(() => setOpen(false), [path])
  useEffect(() => {
    db.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')
      .then(({ count }) => setNewLeads(count ?? 0))
  }, [path === 'leads'])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        save()
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

  async function switchEdition(id: string) {
    if (get().dirty.length && !(await ask({ title: 'Porzucić niezapisane zmiany?', text: 'Zmiana edycji wczyta jej dane od nowa.', yes: 'Porzuć i przełącz', danger: true }))) return
    await loadContent(id)
    toast('Wczytano dane wybranej edycji')
  }

  return (
    <div className={`adm ${open ? 'adm--nav' : ''}`}>
      <aside className="side">
        <a className="side__brand" href="#/">
          <span>B&amp;H</span>
          <div>
            <strong>Beauty &amp; Hair Expo</strong>
            <small>Panel administracyjny</small>
          </div>
        </a>
        <nav className="side__nav">
          {MENU.map((g, i) => {
            const items = g.items.filter((x) => !x.show || x.show(me.role))
            if (!items.length) return null
            return (
              <div key={i} className="side__group">
                {g.title && <p>{g.title}</p>}
                {items.map((x) => (
                  <a key={x.to} href={`#/${x.to}`} className={active(x.to) ? 'on' : ''}>
                    <Icon n={x.icon} />
                    <span>{x.label}</span>
                    {x.to === 'leads' && newLeads > 0 && <em>{newLeads}</em>}
                  </a>
                ))}
              </div>
            )
          })}
        </nav>
        <div className="side__me">
          <span className="avatar">{(me.name || me.email)[0].toUpperCase()}</span>
          <div>
            <strong>{me.name || me.email}</strong>
            <small>{ROLE_LABEL[me.role]}</small>
          </div>
          <Btn kind="plain" icon="logout" title="Wyloguj" onClick={signOut} />
        </div>
      </aside>
      <div className="side__shade" onClick={() => setOpen(false)} />

      <div className="main">
        <header className="top">
          <Btn kind="plain" icon="menu" title="Menu" className="top__burger" onClick={() => setOpen(!open)} />
          <label className="top__edition" title="Edycja targów, której dane edytujesz">
            <Icon n="layers" s={15} />
            <select value={editionId} onChange={(e) => switchEdition(e.target.value)}>
              {editions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.is_current ? ' · na stronie' : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="seg" role="group" aria-label="Język edycji treści">
            {(['pl', 'en'] as const).map((l) => (
              <button key={l} className={loc === l ? 'on' : ''} onClick={() => setLoc(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <span className="grow" />
          {dirty > 0 && (
            <>
              <span className="top__dirty">Niezapisane zmiany</span>
              <Btn kind="plain" small onClick={async () => (await ask({ title: 'Cofnąć wszystkie niezapisane zmiany?', yes: 'Cofnij zmiany', danger: true })) && discard()}>
                Odrzuć
              </Btn>
            </>
          )}
          <Btn kind="primary" icon="check" busy={saving} disabled={!dirty} onClick={() => save()} title="Zapisz wersję roboczą (Ctrl/⌘ + S)">
            Zapisz
          </Btn>
          {me.role !== 'reports' && (
            <Btn kind="gold" icon="rocket" onClick={() => setPub(true)} className={pending || dirty ? 'has-dot' : ''} title={pending ? 'Są zmiany, których nie ma jeszcze na stronie' : 'Strona jest aktualna'}>
              Opublikuj
            </Btn>
          )}
          <a className="ab ab--plain ab--icon" href={import.meta.env.BASE_URL} target="_blank" rel="noopener" title="Otwórz stronę">
            <Icon n="external" s={17} />
          </a>
        </header>
        <div className="content">{children}</div>
      </div>
      {pub && <PublishDialog onClose={() => setPub(false)} />}
    </div>
  )
}

function Screen({ route }: { route: string[] }) {
  const [a, b, c] = route
  if (!a) return <Dashboard />
  if (a === 'pages') return <PagesList />
  if (a === 'c' && COLLECTIONS[b]) return <CollectionScreen key={b} id={b} index={c} />
  if (a === 'media') return <MediaScreen />
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
