// Ekrany systemowe: edycje, menu i stopka, użytkownicy, historia zmian, publikacja i wersje.
import { useEffect, useState } from 'react'
import { ROLE_HELP, ROLE_LABEL, ago, db, downloadCsv, fmtDate, fn, rpc, type Profile, type Role } from '../api'
import { NAV_FIELDS } from '../schema'
import { canEdit, fail, get, loadContent, reloadEditions, toast, useStore } from '../store'
import { FieldForm } from '../fields'
import { Badge, Btn, Card, Empty, Icon, Modal, PageHead, Spinner, ask } from '../ui'
import { TranslateBtn } from './Collection'

/* ───────── Edycje ───────── */
export function Editions() {
  const editions = useStore((s) => s.editions)
  const editionId = useStore((s) => s.editionId)
  const role = useStore((s) => s.me!.role)
  const can = role === 'admin' || role === 'tickets'
  const [form, setForm] = useState<{ id?: string; name: string; year: number; copy: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!form) return
    setBusy(true)
    try {
      if (form.id) await rpc('update_edition', { p_id: form.id, p_name: form.name, p_year: form.year, p_current: null })
      else {
        const id = await rpc<string>('create_edition', { p_name: form.name, p_year: form.year, p_copy_from: form.copy || null })
        await reloadEditions()
        await loadContent(id)
        toast('Utworzono edycję — edytujesz teraz jej dane')
      }
      await reloadEditions()
      setForm(null)
    } catch (e) {
      fail(e)
    }
    setBusy(false)
  }

  return (
    <>
      <PageHead title="Edycje" desc="Każda edycja targów ma własne bilety, program, ekspertów, wystawców i partnerów. Strony, aktualności i banery są wspólne.">
        {can && (
          <Btn kind="primary" icon="plus" onClick={() => setForm({ name: `Rzeszów ${new Date().getFullYear() + 2}`, year: new Date().getFullYear() + 2, copy: editions.find((e) => e.is_current)?.id ?? '' })}>
            Nowa edycja
          </Btn>
        )}
      </PageHead>
      <div className="cards3">
        {editions.map((e) => (
          <Card key={e.id} className={e.id === editionId ? 'card--on' : ''}>
            <div className="ed">
              <div>
                <p className="ed__year">{e.year}</p>
                <h3>{e.name}</h3>
                <p className="muted-t">Utworzona {fmtDate(e.created_at, false)}</p>
              </div>
              <div className="ed__badges">
                {e.is_current && <Badge tone="green">Na stronie</Badge>}
                {e.id === editionId && <Badge tone="gold">Edytujesz</Badge>}
              </div>
            </div>
            <div className="row mt">
              {e.id !== editionId && (
                <Btn
                  small
                  onClick={async () => {
                    if (get().dirty.length && !(await ask({ title: 'Porzucić niezapisane zmiany?', yes: 'Porzuć i przełącz', danger: true }))) return
                    await loadContent(e.id)
                  }}
                >
                  Edytuj dane
                </Btn>
              )}
              {can && (
                <Btn small kind="plain" icon="edit" onClick={() => setForm({ id: e.id, name: e.name, year: e.year, copy: '' })}>
                  Nazwa
                </Btn>
              )}
              {role === 'admin' && !e.is_current && (
                <>
                  <Btn
                    small
                    kind="plain"
                    icon="globe"
                    onClick={async () => {
                      if (!(await ask({ title: `Pokazywać na stronie edycję „${e.name}”?`, text: 'Po publikacji strona zacznie pokazywać bilety, program i wystawców tej edycji.', yes: 'Ustaw jako aktualną' }))) return
                      await rpc('update_edition', { p_id: e.id, p_name: e.name, p_year: e.year, p_current: true }).catch(fail)
                      await reloadEditions()
                      toast('Ustawiono aktualną edycję — opublikuj, aby zmienić stronę')
                    }}
                  >
                    Ustaw jako aktualną
                  </Btn>
                  <Btn
                    small
                    kind="plain"
                    icon="trash"
                    title="Usuń edycję"
                    onClick={async () => {
                      if (!(await ask({ title: `Usunąć edycję „${e.name}” z wszystkimi jej danymi?`, text: 'Tej operacji nie można cofnąć.', yes: 'Usuń edycję', danger: true }))) return
                      await rpc('delete_edition', { p_id: e.id }).catch(fail)
                      await reloadEditions()
                      if (e.id === editionId) await loadContent(get().editions.find((x) => x.is_current)?.id ?? '')
                    }}
                  />
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
      {form && (
        <Modal
          title={form.id ? 'Zmień nazwę edycji' : 'Nowa edycja'}
          onClose={() => setForm(null)}
          footer={
            <>
              <Btn onClick={() => setForm(null)}>Anuluj</Btn>
              <Btn kind="primary" busy={busy} disabled={form.name.trim().length < 2} onClick={submit}>
                {form.id ? 'Zapisz' : 'Utwórz edycję'}
              </Btn>
            </>
          }
        >
          <div className="ff">
            <div className="ff__f ff__f--half">
              <label className="ff__l">Nazwa</label>
              <input className="in" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="ff__f ff__f--half">
              <label className="ff__l">Rok</label>
              <input className="in" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
            </div>
            {!form.id && (
              <div className="ff__f">
                <label className="ff__l">Skopiuj dane z edycji</label>
                <select className="in" value={form.copy} onChange={(e) => setForm({ ...form, copy: e.target.value })}>
                  <option value="">— zacznij od pustych danych —</option>
                  {editions.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
                <p className="ff__h">Kopiują się bilety, program, eksperci, strefy, wystawcy i partnerzy — potem zmieniasz tylko to, co nowe.</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}

/* ───────── Menu i stopka ───────── */
export function NavScreen() {
  const nav = useStore((s) => s.site.nav)
  const editable = canEdit('nav')
  return (
    <>
      <PageHead title="Menu i stopka" desc="Linki w górnym menu (po lewej i prawej stronie logo) oraz kolumny w stopce.">
        {editable && <TranslateBtn root={nav} base="nav" />}
      </PageHead>
      <Card className="narrow">
        <fieldset disabled={!editable} className="plain">
          <FieldForm fields={NAV_FIELDS} base="nav" />
        </fieldset>
      </Card>
    </>
  )
}

/* ───────── Użytkownicy ───────── */
export function Users() {
  const me = useStore((s) => s.me!)
  const [rows, setRows] = useState<Profile[] | null>(null)
  const [form, setForm] = useState<{ id?: string; email: string; name: string; role: Role; password: string; active: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const load = () => db.from('profiles').select('*').order('created_at').then(({ data, error }) => (error ? fail(error) : setRows(data as Profile[])))
  useEffect(() => {
    load()
  }, [])

  async function submit() {
    if (!form) return
    setBusy(true)
    try {
      await fn('users', form.id ? { action: 'update', id: form.id, name: form.name, role: form.role, active: form.active, password: form.password || undefined } : { action: 'create', ...form })
      toast(form.id ? 'Zapisano użytkownika' : 'Konto utworzone — przekaż e-mail i hasło tej osobie')
      setForm(null)
      load()
    } catch (e) {
      fail(e)
    }
    setBusy(false)
  }
  const gen = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 55]).join('')

  if (me.role !== 'admin') return <Empty icon="shield" title="Tylko administrator zarządza kontami" />
  return (
    <>
      <PageHead title="Użytkownicy" desc="Konta osób, które mają dostęp do panelu. Każda rola widzi i zmienia tylko swoją część.">
        <Btn kind="primary" icon="plus" onClick={() => setForm({ email: '', name: '', role: 'marketing', password: gen(), active: true })}>
          Dodaj użytkownika
        </Btn>
      </PageHead>
      <Card pad={false}>
        {!rows ? (
          <Spinner />
        ) : (
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Osoba</th>
                  <th>Rola</th>
                  <th>Ostatnio w panelu</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ width: 120 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td className="strong">
                      {u.name || '—'}
                      <small className="sub">{u.email}</small>
                    </td>
                    <td>
                      <Badge tone={u.role === 'admin' ? 'gold' : 'gray'}>{ROLE_LABEL[u.role]}</Badge>
                    </td>
                    <td>{ago(u.last_seen_at)}</td>
                    <td>{u.active ? <Badge tone="green">Aktywne</Badge> : <Badge tone="red">Wyłączone</Badge>}</td>
                    <td className="tbl__acts">
                      <Btn small kind="plain" icon="edit" title="Edytuj" onClick={() => setForm({ id: u.id, email: u.email, name: u.name, role: u.role, password: '', active: u.active })} />
                      {u.id !== me.id && (
                        <Btn
                          small
                          kind="plain"
                          icon="trash"
                          title="Usuń konto"
                          onClick={async () => {
                            if (!(await ask({ title: `Usunąć konto ${u.email}?`, yes: 'Usuń konto', danger: true }))) return
                            await fn('users', { action: 'delete', id: u.id }).then(load).catch(fail)
                          }}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="cards3 mt">
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <div key={r} className="rolecard">
            <strong>{ROLE_LABEL[r]}</strong>
            <p>{ROLE_HELP[r]}</p>
          </div>
        ))}
      </div>
      {form && (
        <Modal
          title={form.id ? 'Edytuj użytkownika' : 'Nowy użytkownik'}
          onClose={() => setForm(null)}
          footer={
            <>
              <Btn onClick={() => setForm(null)}>Anuluj</Btn>
              <Btn kind="primary" busy={busy} onClick={submit}>
                {form.id ? 'Zapisz' : 'Utwórz konto'}
              </Btn>
            </>
          }
        >
          <div className="ff">
            <div className="ff__f ff__f--half">
              <label className="ff__l">Imię i nazwisko</label>
              <input className="in" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="ff__f ff__f--half">
              <label className="ff__l">E-mail (login)</label>
              <input className="in" type="email" value={form.email} disabled={!!form.id} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="ff__f">
              <label className="ff__l">Rola</label>
              <select className="in" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
              <p className="ff__h">{ROLE_HELP[form.role]}</p>
            </div>
            <div className="ff__f">
              <label className="ff__l">{form.id ? 'Nowe hasło (zostaw puste, aby nie zmieniać)' : 'Hasło startowe'}</label>
              <div className="row">
                <input className="in mono" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <Btn icon="refresh" title="Wylosuj hasło" onClick={() => setForm({ ...form, password: gen() })} />
              </div>
              <p className="ff__h">Min. 8 znaków. Przekaż je tej osobie bezpiecznym kanałem — może je potem zmienić przez „Nie pamiętasz hasła?”.</p>
            </div>
            {form.id && (
              <label className="switch">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                <i />
                <span>Konto aktywne</span>
              </label>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}

/* ───────── Historia zmian ───────── */
type Audit = { id: number; at: string; user_email: string | null; action: string; entity: string; entity_key: string | null; summary: string | null }
const ACTION: Record<string, [string, 'gray' | 'green' | 'red' | 'gold' | 'blue']> = {
  create: ['Dodano', 'green'],
  update: ['Zmieniono', 'gray'],
  delete: ['Usunięto', 'red'],
  publish: ['Opublikowano', 'gold'],
  restore: ['Przywrócono', 'blue'],
}
const ENTITY: Record<string, string> = { content: 'Treść', edition: 'Edycja', site: 'Strona', lead: 'Zgłoszenie', user: 'Użytkownik' }

export function History() {
  const [rows, setRows] = useState<Audit[] | null>(null)
  const [limit, setLimit] = useState(100)
  const [who, setWho] = useState('')
  useEffect(() => {
    db.from('audit_log')
      .select('*')
      .order('id', { ascending: false })
      .limit(limit)
      .then(({ data, error }) => (error ? fail(error) : setRows(data as Audit[])))
  }, [limit])
  const people = [...new Set((rows ?? []).map((r) => r.user_email).filter(Boolean))] as string[]
  const list = (rows ?? []).filter((r) => !who || r.user_email === who)
  return (
    <>
      <PageHead title="Historia zmian" desc="Kto, co i kiedy zmienił w panelu. Wpisy starsze niż 18 miesięcy usuwają się same.">
        <select className="in in--sm" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Osoba">
          <option value="">Wszyscy</option>
          {people.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <Btn icon="download" onClick={() => downloadCsv('historia-zmian.csv', [['Data', 'Osoba', 'Akcja', 'Obszar', 'Element', 'Opis'], ...list.map((r) => [fmtDate(r.at), r.user_email, ACTION[r.action]?.[0] ?? r.action, ENTITY[r.entity] ?? r.entity, r.entity_key, r.summary])])}>
          Eksport do Excela
        </Btn>
      </PageHead>
      <Card pad={false}>
        {!rows ? (
          <Spinner />
        ) : !list.length ? (
          <Empty icon="history" title="Brak wpisów" />
        ) : (
          <ul className="log">
            {list.map((r) => (
              <li key={r.id}>
                <span className="avatar avatar--sm">{(r.user_email ?? '?')[0].toUpperCase()}</span>
                <div>
                  <p>
                    <b>{r.user_email ?? 'system'}</b> <Badge tone={ACTION[r.action]?.[1] ?? 'gray'}>{ACTION[r.action]?.[0] ?? r.action}</Badge> <span className="muted-t">{ENTITY[r.entity] ?? r.entity}</span>
                  </p>
                  {r.summary && <p className="log__sum">{r.summary}</p>}
                </div>
                <time title={fmtDate(r.at)}>{ago(r.at)}</time>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {rows && rows.length >= limit && (
        <div className="row row--center mt">
          <Btn onClick={() => setLimit(limit + 200)}>Pokaż starsze</Btn>
        </div>
      )}
    </>
  )
}

/* ───────── Publikacja i wersje ───────── */
type Run = { id: number; status: string; conclusion: string | null; event: string; created_at: string; updated_at: string; url: string }
type Snap = { id: number; created_at: string; created_email: string | null; note: string | null }

export function PublishScreen() {
  const role = useStore((s) => s.me!.role)
  const lastPublish = useStore((s) => s.lastPublish)
  const pending = useStore((s) => Boolean(s.lastChange && (!s.lastPublish || s.lastChange > s.lastPublish)))
  const [runs, setRuns] = useState<Run[] | null>(null)
  const [configured, setConfigured] = useState(true)
  const [snaps, setSnaps] = useState<Snap[] | null>(null)

  const loadRuns = () =>
    fn<{ configured: boolean; runs: Run[] }>('publish', { action: 'status' })
      .then((r) => {
        setRuns(r.runs)
        setConfigured(r.configured)
      })
      .catch(() => setRuns([]))
  useEffect(() => {
    loadRuns()
    db.from('snapshots')
      .select('id,created_at,created_email,note')
      .order('id', { ascending: false })
      .limit(40)
      .then(({ data }) => setSnaps((data ?? []) as Snap[]))
  }, [lastPublish])
  const building = runs?.some((r) => r.status !== 'completed')
  useEffect(() => {
    if (!building) return
    const id = setInterval(loadRuns, 8000)
    return () => clearInterval(id)
  }, [building])

  const runBadge = (r: Run) =>
    r.status !== 'completed' ? (
      <Badge tone="amber">
        <span className="spin spin--xs" /> Buduje się…
      </Badge>
    ) : r.conclusion === 'success' ? (
      <Badge tone="green">Na stronie</Badge>
    ) : r.conclusion === 'cancelled' ? (
      <Badge>Zastąpione nowszym</Badge>
    ) : (
      <Badge tone="red">Błąd</Badge>
    )

  return (
    <>
      <PageHead title="Publikacja i wersje" desc="Zmiany zapisujesz jako wersję roboczą. Na stronę trafiają dopiero po kliknięciu „Opublikuj” — wtedy powstaje wersja, do której można wrócić." />
      <div className="cards2">
        <Card title="Stan strony">
          <p className={`notice ${pending ? 'notice--warn' : 'notice--ok'}`}>
            <Icon n={pending ? 'info' : 'check'} />
            {pending ? 'W wersji roboczej są zmiany, których nie ma jeszcze na stronie.' : 'Strona pokazuje najnowszą opublikowaną wersję.'}
          </p>
          <p className="muted-t">Ostatnia publikacja: {lastPublish ? fmtDate(lastPublish) : 'jeszcze nie publikowano z panelu'}</p>
          {!configured && <p className="notice notice--warn">Brak tokenu GitHub w sekretach funkcji — publikacja zapisze wersję, ale nie uruchomi budowania strony.</p>}
        </Card>
        <Card title="Ostatnie budowania strony" aside={<Btn small kind="plain" icon="refresh" title="Odśwież" onClick={loadRuns} />}>
          {!runs ? (
            <Spinner />
          ) : !runs.length ? (
            <p className="muted-t">Brak danych.</p>
          ) : (
            <ul className="runs">
              {runs.map((r) => (
                <li key={r.id}>
                  {runBadge(r)}
                  <span>{fmtDate(r.created_at)}</span>
                  <span className="muted-t">{r.event === 'push' ? 'zmiana w kodzie' : 'z panelu'}</span>
                  <a href={r.url} target="_blank" rel="noopener" className="muted-t">
                    szczegóły
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card title="Opublikowane wersje" pad={false} className="mt">
        {!snaps ? (
          <Spinner />
        ) : !snaps.length ? (
          <Empty icon="rocket" title="Nie ma jeszcze żadnej wersji">
            Pierwsza powstanie po kliknięciu „Opublikuj”.
          </Empty>
        ) : (
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Wersja</th>
                  <th>Kiedy</th>
                  <th>Kto</th>
                  <th>Opis</th>
                  <th style={{ width: 170 }} />
                </tr>
              </thead>
              <tbody>
                {snaps.map((s, i) => (
                  <tr key={s.id}>
                    <td className="strong">#{s.id}</td>
                    <td>{fmtDate(s.created_at)}</td>
                    <td>{s.created_email ?? '—'}</td>
                    <td>{s.note || <span className="muted-t">—</span>}</td>
                    <td className="tbl__acts">
                      {i === 0 ? (
                        <Badge tone="green">Aktualna</Badge>
                      ) : (
                        role === 'admin' && (
                          <Btn
                            small
                            icon="history"
                            onClick={async () => {
                              if (!(await ask({ title: `Przywrócić wersję #${s.id}?`, text: 'Treść tej wersji zastąpi obecną wersję roboczą (strony, menu, bilety, program…). Na stronę trafi dopiero po publikacji.', yes: 'Przywróć do wersji roboczej' }))) return
                              try {
                                await rpc('restore_snapshot', { p_id: s.id })
                                await loadContent(get().editionId)
                                toast('Przywrócono wersję roboczą — sprawdź i opublikuj')
                              } catch (e) {
                                fail(e)
                              }
                            }}
                          >
                            Przywróć
                          </Btn>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
