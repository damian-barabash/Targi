// CRM: baza osób i firm (z formularzy, newslettera, zakupów i dodanych ręcznie), zadania „oddzwonić”, oś kontaktów.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ago, db, downloadCsv, fmtDate, rpc, type Profile } from '../api'
import { fail, toast, useStore } from '../store'
import { Badge, Btn, Card, Empty, Icon, Modal, PageHead, Spinner, Stat, Tabs, ask } from '../ui'
import { go } from '../entry'
import { COMPANY_KIND, SEGMENT, SOURCE, STAGE, TAG, dueGroup, dueText, initials, tagLabel, type Activity, type Company, type Contact } from './data'
import { Composer, Timeline } from './Timeline'
import './crm.css'

type Counts = { contacts: number; companies: number; new7: number; overdue: number; today: number; mineDue: number }
const C_COLS = 'id,created_at,updated_at,email,name,phone,position,company_id,stage,tags,sources,newsletter,newsletter_segments,orders_count,orders_total,locale,owner,notes,next_action_at,next_action,last_activity_at'

/** Wspólne dane CRM dla wszystkich zakładek (jedno wczytanie, odświeżane po zmianach). */
function useCrm() {
  const [contacts, setContacts] = useState<Contact[] | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [tasks, setTasks] = useState<Activity[]>([])
  const [staff, setStaff] = useState<Profile[]>([])
  const [counts, setCounts] = useState<Counts | null>(null)
  const load = useCallback(async () => {
    const since = new Date(Date.now() - 14 * 86400e3).toISOString()
    const [c, co, t, s, n] = await Promise.all([
      db.from('crm_contacts').select(C_COLS).order('last_activity_at', { ascending: false }).limit(5000),
      db.from('crm_companies').select('*').order('name').limit(3000),
      db.from('crm_activities').select('*').eq('type', 'task').or(`done_at.is.null,done_at.gte.${since}`).order('due_at', { ascending: true, nullsFirst: false }).limit(1000),
      db.from('profiles').select('*').eq('active', true),
      rpc<Counts>('crm_counts').catch(() => null),
    ])
    if (c.error) return fail(c.error)
    setContacts(c.data as Contact[])
    setCompanies((co.data ?? []) as Company[])
    setTasks((t.data ?? []) as Activity[])
    setStaff((s.data ?? []) as Profile[])
    setCounts(n)
  }, [])
  useEffect(() => {
    load()
  }, [load])
  return { contacts, companies, tasks, staff, counts, load }
}
type Crm = ReturnType<typeof useCrm>

export default function CrmScreen({ sub, id }: { sub?: string; id?: string }) {
  const crm = useCrm()
  const role = useStore((s) => s.me!.role)
  const canWrite = role !== 'reports'
  const [adding, setAdding] = useState<'person' | 'company' | null>(null)
  const tab = sub === 'firmy' || sub === 'f' ? 'companies' : sub === 'zadania' ? 'tasks' : 'people'
  const n = crm.counts

  return (
    <>
      <PageHead title="Klienci" desc="Jedna baza osób i firm: zgłoszenia z formularzy, zapisy na newsletter, kupujący i kontakty dodane ręcznie.">
        {canWrite && (
          <>
            <Btn icon="building" onClick={() => setAdding('company')}>
              Dodaj firmę
            </Btn>
            <Btn kind="primary" icon="userplus" onClick={() => setAdding('person')}>
              Dodaj osobę
            </Btn>
          </>
        )}
      </PageHead>

      <div className="stats-a">
        <Stat label="Osoby w bazie" value={n?.contacts ?? '—'} icon="users" hint={n ? `+${n.new7} w ostatnich 7 dniach` : undefined} />
        <Stat label="Firmy" value={n?.companies ?? '—'} icon="building" />
        <Stat label="Zadania na dziś" value={n ? n.today + n.overdue : '—'} icon="clock" hint={n?.overdue ? `${n.overdue} zaległych` : 'nic zaległego'} />
        <Stat label="Klienci (kupili / umowa)" value={crm.contacts ? crm.contacts.filter((c) => c.stage === 'client').length : '—'} icon="star" />
      </div>

      <div className="tabs-a tabs-a--page">
        <a href="#/crm" className={tab === 'people' ? 'on' : ''}>
          Osoby
        </a>
        <a href="#/crm/firmy" className={tab === 'companies' ? 'on' : ''}>
          Firmy
        </a>
        <a href="#/crm/zadania" className={tab === 'tasks' ? 'on' : ''}>
          Zadania {n && n.today + n.overdue > 0 && <em className={n.overdue ? 'hot' : ''}>{n.today + n.overdue}</em>}
        </a>
      </div>

      {!crm.contacts ? <Spinner /> : tab === 'people' ? <People crm={crm} /> : tab === 'companies' ? <Companies crm={crm} /> : <Tasks crm={crm} />}

      {crm.contacts && sub === 'o' && id && <PersonDrawer key={id} id={id} crm={crm} onClose={() => go('crm')} canWrite={canWrite} />}
      {crm.contacts && sub === 'f' && id && <CompanyDrawer key={id} id={id} crm={crm} onClose={() => go('crm/firmy')} canWrite={canWrite} />}
      {adding === 'person' && <NewPerson crm={crm} onClose={() => setAdding(null)} />}
      {adding === 'company' && <NewCompany crm={crm} onClose={() => setAdding(null)} />}
    </>
  )
}

/* ───────── Osoby ───────── */
function People({ crm }: { crm: Crm }) {
  const me = useStore((s) => s.me!)
  const [tag, setTag] = useState('all')
  const [stage, setStage] = useState('all')
  const [owner, setOwner] = useState('all')
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(200)
  const coName = useMemo(() => Object.fromEntries(crm.companies.map((c) => [c.id, c.name])), [crm.companies])
  const all = crm.contacts!
  const list = useMemo(
    () =>
      all.filter(
        (c) =>
          (tag === 'all' || c.tags.includes(tag)) &&
          (stage === 'all' || c.stage === stage) &&
          (owner === 'all' || (owner === 'me' ? c.owner === me.id : owner === 'none' ? !c.owner : c.owner === owner)) &&
          (!q || `${c.name} ${c.email ?? ''} ${c.phone ?? ''} ${coName[c.company_id ?? ''] ?? ''} ${c.position ?? ''}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [all, tag, stage, owner, q, coName],
  )
  const count = (t: string) => all.filter((c) => t === 'all' || c.tags.includes(t)).length
  const tags = ['newsletter', 'kupujacy', 'wystawca', 'partner', 'media', 'kontakt', 'vip'].filter((t) => count(t) > 0 || ['newsletter', 'kupujacy', 'wystawca'].includes(t))

  return (
    <>
      <div className="row row--between row--wrap">
        <Tabs value={tag} onChange={setTag} items={[{ value: 'all', label: 'Wszyscy', count: count('all') }, ...tags.map((t) => ({ value: t, label: TAG[t], count: count(t) }))]} />
        <div className="row row--wrap">
          <select className="in in--sm" value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Etap">
            <option value="all">Każdy etap</option>
            {Object.entries(STAGE).map(([k, [l]]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <select className="in in--sm" value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Opiekun">
            <option value="all">Każdy opiekun</option>
            <option value="me">Moi klienci</option>
            <option value="none">Bez opiekuna</option>
            {crm.staff
              .filter((s) => s.id !== me.id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.email}
                </option>
              ))}
          </select>
          <label className="search">
            <Icon n="search" s={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Imię, e-mail, firma, telefon…" />
          </label>
          <Btn
            small
            icon="download"
            title="Eksport do Excela"
            onClick={() =>
              downloadCsv('klienci.csv', [
                ['Imię i nazwisko', 'E-mail', 'Telefon', 'Stanowisko', 'Firma', 'Etap', 'Tagi', 'Newsletter', 'Grupy newslettera', 'Zamówienia', 'Wartość zamówień', 'Następny krok', 'Termin', 'Ostatni kontakt', 'Dodano', 'Notatki'],
                ...list.map((c) => [c.name, c.email, c.phone, c.position, coName[c.company_id ?? ''], STAGE[c.stage]?.[0], c.tags.map(tagLabel).join(', '), c.newsletter ? 'tak' : 'nie', c.newsletter_segments.map((s) => SEGMENT[s] ?? s).join(', '), c.orders_count, c.orders_total, c.next_action, fmtDate(c.next_action_at), fmtDate(c.last_activity_at), fmtDate(c.created_at), c.notes]),
              ])
            }
          />
        </div>
      </div>
      <Card pad={false}>
        {!list.length ? (
          <Empty icon="users" title={all.length ? 'Nikt nie pasuje do filtrów' : 'Baza jest jeszcze pusta'}>
            {all.length ? 'Zmień grupę, etap albo wyszukiwanie.' : 'Osoby pojawią się tu same, gdy ktoś wyśle formularz albo zapisze się na newsletter. Możesz też dodać kogoś ręcznie.'}
          </Empty>
        ) : (
          <div className="tw">
            <table className="tbl crm-tbl">
              <thead>
                <tr>
                  <th>Osoba</th>
                  <th>Firma</th>
                  <th style={{ width: 130 }}>Etap</th>
                  <th>Grupy</th>
                  <th style={{ width: 190 }}>Następny krok</th>
                  <th style={{ width: 130 }}>Ostatni kontakt</th>
                </tr>
              </thead>
              <tbody>
                {list.slice(0, limit).map((c) => {
                  const g = dueGroup(c.next_action_at)
                  return (
                    <tr key={c.id} className="clickable" onClick={() => go(`crm/o/${c.id}`)}>
                      <td>
                        <span className="who">
                          <span className="ava">{initials(c.name || c.email || '')}</span>
                          <span>
                            <strong>{c.name || c.email || 'Bez nazwy'}</strong>
                            <small>{c.name ? c.email || c.phone : c.phone}</small>
                          </span>
                        </span>
                      </td>
                      <td>{c.company_id ? coName[c.company_id] : <span className="muted-t">—</span>}</td>
                      <td>
                        <Badge tone={STAGE[c.stage]?.[1]}>{STAGE[c.stage]?.[0]}</Badge>
                      </td>
                      <td>
                        <span className="tags">
                          {c.tags.slice(0, 3).map((t) => (
                            <span key={t} className={`tg tg--${t}`}>
                              {tagLabel(t)}
                            </span>
                          ))}
                          {c.tags.length > 3 && <span className="tg">+{c.tags.length - 3}</span>}
                        </span>
                      </td>
                      <td>
                        {c.next_action_at ? (
                          <span className="nx">
                            <span className={`due due--${g}`}>{dueText(c.next_action_at)}</span>
                            <small>{c.next_action}</small>
                          </span>
                        ) : (
                          <span className="muted-t">—</span>
                        )}
                      </td>
                      <td title={fmtDate(c.last_activity_at)}>{ago(c.last_activity_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {list.length > limit && (
        <div className="row row--center mt">
          <Btn onClick={() => setLimit(limit + 300)}>Pokaż więcej ({list.length - limit})</Btn>
        </div>
      )}
    </>
  )
}

/* ───────── Firmy ───────── */
function Companies({ crm }: { crm: Crm }) {
  const [kind, setKind] = useState('all')
  const [q, setQ] = useState('')
  const people = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of crm.contacts!) if (c.company_id) m[c.company_id] = (m[c.company_id] ?? 0) + 1
    return m
  }, [crm.contacts])
  const list = crm.companies.filter((c) => (kind === 'all' || c.kind === kind) && (!q || `${c.name} ${c.nip ?? ''} ${c.city ?? ''}`.toLowerCase().includes(q.toLowerCase())))
  const count = (k: string) => crm.companies.filter((c) => k === 'all' || c.kind === k).length
  return (
    <>
      <div className="row row--between row--wrap">
        <Tabs value={kind} onChange={setKind} items={[{ value: 'all', label: 'Wszystkie', count: count('all') }, ...Object.entries(COMPANY_KIND).filter(([k]) => count(k) > 0).map(([value, label]) => ({ value, label, count: count(value) }))]} />
        <div className="row">
          <label className="search">
            <Icon n="search" s={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nazwa, NIP, miasto…" />
          </label>
          <Btn
            small
            icon="download"
            title="Eksport do Excela"
            onClick={() => downloadCsv('firmy.csv', [['Nazwa', 'NIP', 'Rodzaj', 'Miasto', 'Adres', 'WWW', 'E-mail', 'Telefon', 'Osoby', 'Ostatni kontakt', 'Notatki'], ...list.map((c) => [c.name, c.nip, COMPANY_KIND[c.kind], c.city, c.address, c.website, c.email, c.phone, people[c.id] ?? 0, fmtDate(c.last_activity_at), c.notes])])}
          />
        </div>
      </div>
      <Card pad={false}>
        {!list.length ? (
          <Empty icon="building" title={crm.companies.length ? 'Brak firm dla tych filtrów' : 'Nie ma jeszcze firm'}>
            Firmy tworzą się same z formularzy (pole „Firma”) albo dodajesz je ręcznie.
          </Empty>
        ) : (
          <div className="tw">
            <table className="tbl crm-tbl">
              <thead>
                <tr>
                  <th>Firma</th>
                  <th style={{ width: 160 }}>Rodzaj</th>
                  <th style={{ width: 90 }}>Osoby</th>
                  <th>Miasto</th>
                  <th style={{ width: 140 }}>Ostatni kontakt</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="clickable" onClick={() => go(`crm/f/${c.id}`)}>
                    <td>
                      <span className="who">
                        <span className="ava ava--co">
                          <Icon n="building" s={15} />
                        </span>
                        <span>
                          <strong>{c.name}</strong>
                          <small>{c.nip ? `NIP ${c.nip}` : c.website || c.email || ''}</small>
                        </span>
                      </span>
                    </td>
                    <td>{COMPANY_KIND[c.kind]}</td>
                    <td>{people[c.id] ?? 0}</td>
                    <td>{c.city || <span className="muted-t">—</span>}</td>
                    <td title={fmtDate(c.last_activity_at)}>{ago(c.last_activity_at)}</td>
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

/* ───────── Zadania ───────── */
const GROUPS: [string, string][] = [
  ['overdue', 'Zaległe'],
  ['today', 'Dziś'],
  ['tomorrow', 'Jutro'],
  ['week', 'W tym tygodniu'],
  ['later', 'Później'],
  ['none', 'Bez terminu'],
]
function Tasks({ crm }: { crm: Crm }) {
  const me = useStore((s) => s.me!)
  const [mine, setMine] = useState<'me' | 'all'>('me')
  const [showDone, setShowDone] = useState(false)
  const names = useMemo(() => {
    const co = Object.fromEntries(crm.companies.map((c) => [c.id, c.name]))
    const m: Record<string, string> = {}
    for (const c of crm.contacts!) m[c.id] = (c.name || c.email || 'Bez nazwy') + (c.company_id && co[c.company_id] ? ` · ${co[c.company_id]}` : '')
    return { m, co }
  }, [crm.contacts, crm.companies])
  const [leaving, setLeaving] = useState<string[]>([])
  const scoped = crm.tasks.filter((t) => mine === 'all' || t.assigned_to === me.id || !t.assigned_to)
  const open = scoped.filter((t) => !t.done_at)
  const done = scoped.filter((t) => t.done_at).sort((a, b) => b.done_at!.localeCompare(a.done_at!))
  const who = (id: string | null) => crm.staff.find((s) => s.id === id)

  async function toggle(t: Activity, v: boolean) {
    if (v) setLeaving((l) => [...l, t.id])
    const { error } = await db.from('crm_activities').update({ done_at: v ? new Date().toISOString() : null }).eq('id', t.id)
    if (error) return fail(error)
    setTimeout(() => (crm.load(), setLeaving((l) => l.filter((x) => x !== t.id))), v ? 450 : 0)
    if (v) toast('Zrobione ✓')
  }
  const open_ = (t: Activity) => go(t.contact_id ? `crm/o/${t.contact_id}` : `crm/f/${t.company_id}`)

  return (
    <>
      <div className="row row--between row--wrap">
        <Tabs
          value={mine}
          onChange={setMine}
          items={[
            { value: 'me', label: 'Moje', count: crm.tasks.filter((t) => !t.done_at && (t.assigned_to === me.id || !t.assigned_to)).length },
            { value: 'all', label: 'Cały zespół', count: crm.tasks.filter((t) => !t.done_at).length },
          ]}
        />
        <p className="muted-t">Zadania dodajesz na karcie klienta: „Oddzwonić” albo po zapisaniu rozmowy.</p>
      </div>
      {!open.length ? (
        <Card>
          <Empty icon="check" title="Nic do zrobienia">
            Wszystkie zadania odhaczone. Nowe pojawią się, gdy zaplanujesz kontakt na karcie klienta.
          </Empty>
        </Card>
      ) : (
        <div className="tgroups">
          {GROUPS.map(([g, label]) => {
            const items = open.filter((t) => dueGroup(t.due_at) === g)
            if (!items.length) return null
            return (
              <section key={g} className={`tgroup tgroup--${g}`}>
                <p className="tgroup__h">
                  {label} <em>{items.length}</em>
                </p>
                {items.map((t) => (
                  <div key={t.id} className={`task task--row task--${g} ${leaving.includes(t.id) ? 'is-done' : ''}`}>
                    <button type="button" className="task__chk" onClick={() => toggle(t, true)} title="Oznacz jako zrobione" aria-label="Zrobione">
                      <Icon n="check" s={13} />
                    </button>
                    <div className="grow clickable" onClick={() => open_(t)}>
                      <strong>{t.body || 'Zadanie'}</strong>
                      <small>
                        {t.contact_id ? names.m[t.contact_id] : names.co[t.company_id ?? '']}
                        {mine === 'all' && t.assigned_to && <> · {t.assigned_to === me.id ? 'Ty' : who(t.assigned_to)?.name || who(t.assigned_to)?.email}</>}
                      </small>
                    </div>
                    <span className={`due due--${g}`}>{dueText(t.due_at)}</span>
                    <Btn small kind="plain" icon="right" title="Otwórz kartę" onClick={() => open_(t)} />
                  </div>
                ))}
              </section>
            )
          })}
        </div>
      )}
      {done.length > 0 && (
        <div className="mt">
          <button type="button" className="linkbtn" onClick={() => setShowDone(!showDone)}>
            {showDone ? 'Ukryj zrobione' : `Zrobione w ostatnich 14 dniach (${done.length})`}
          </button>
          {showDone && (
            <div className="tgroup tgroup--done mt">
              {done.map((t) => (
                <div key={t.id} className="task task--row task--donel">
                  <button type="button" className="task__chk on" onClick={() => toggle(t, false)} title="Przywróć" aria-label="Przywróć">
                    <Icon n="check" s={13} />
                  </button>
                  <div className="grow clickable" onClick={() => open_(t)}>
                    <strong>{t.body || 'Zadanie'}</strong>
                    <small>{t.contact_id ? names.m[t.contact_id] : names.co[t.company_id ?? '']}</small>
                  </div>
                  <span className="muted-t">{ago(t.done_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

/* ───────── pola edytowane w miejscu (zapis po wyjściu z pola) ───────── */
function InlineField({ label, value, onSave, type = 'text', disabled, placeholder, area }: { label: string; value: string | null; onSave: (v: string | null) => Promise<void> | void; type?: string; disabled?: boolean; placeholder?: string; area?: boolean }) {
  const [v, setV] = useState(value ?? '')
  const [saved, setSaved] = useState(false)
  useEffect(() => setV(value ?? ''), [value])
  const commit = async () => {
    const nv = v.trim()
    if (nv === (value ?? '')) return
    await onSave(nv || null)
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }
  return (
    <label className={`if ${saved ? 'is-saved' : ''}`}>
      <span className="if__l">
        {label}
        {saved && <Icon n="check" s={12} />}
      </span>
      {area ? (
        <textarea className="if__in" rows={4} value={v} disabled={disabled} placeholder={placeholder ?? '—'} onChange={(e) => setV(e.target.value)} onBlur={commit} />
      ) : (
        <input className="if__in" type={type} value={v} disabled={disabled} placeholder={placeholder ?? '—'} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
      )}
    </label>
  )
}

function TagEditor({ tags, onChange, disabled }: { tags: string[]; onChange: (t: string[]) => void; disabled?: boolean }) {
  const [adding, setAdding] = useState(false)
  const [v, setV] = useState('')
  const free = Object.keys(TAG).filter((t) => !tags.includes(t) && t !== 'newsletter' && t !== 'kupujacy')
  return (
    <div className="tags tags--edit">
      {tags.map((t) => (
        <span key={t} className={`tg tg--${t}`}>
          {tagLabel(t)}
          {!disabled && !['newsletter', 'kupujacy'].includes(t) && (
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} aria-label={`Usuń ${tagLabel(t)}`}>
              ×
            </button>
          )}
        </span>
      ))}
      {!disabled &&
        (adding ? (
          <span className="tg-add">
            <input
              autoFocus
              list="crm-tags"
              value={v}
              onChange={(e) => setV(e.target.value)}
              onBlur={() => (setAdding(false), setV(''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && v.trim()) {
                  const key = Object.entries(TAG).find(([, l]) => l.toLowerCase() === v.trim().toLowerCase())?.[0] ?? v.trim().toLowerCase().slice(0, 30)
                  if (!tags.includes(key)) onChange([...tags, key])
                  setV(''), setAdding(false)
                }
                if (e.key === 'Escape') setAdding(false)
              }}
              placeholder="np. VIP"
            />
            <datalist id="crm-tags">
              {free.map((t) => (
                <option key={t} value={TAG[t]} />
              ))}
            </datalist>
          </span>
        ) : (
          <button type="button" className="tg tg--plus" onClick={() => setAdding(true)}>
            + tag
          </button>
        ))}
    </div>
  )
}

/* ───────── Karta osoby ───────── */
function PersonDrawer({ id, crm, onClose, canWrite }: { id: string; crm: Crm; onClose: () => void; canWrite: boolean }) {
  const me = useStore((s) => s.me!)
  const c = crm.contacts!.find((x) => x.id === id)
  const [acts, setActs] = useState<Activity[] | null>(null)
  const [leads, setLeads] = useState<{ id: string; created_at: string; kind: string; status: string; topic: string | null }[]>([])
  const [initial, setInitial] = useState<'note' | 'call' | 'task'>('note')
  const [ck, setCk] = useState(0)
  const [merge, setMerge] = useState(false)
  const loadActs = useCallback(() => {
    db.from('crm_activities')
      .select('*')
      .eq('contact_id', id)
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data, error }) => (error ? fail(error) : setActs(data as Activity[])))
    db.from('leads')
      .select('id,created_at,kind,status,topic')
      .eq('contact_id', id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setLeads((data ?? []) as any))
  }, [id])
  useEffect(() => loadActs(), [loadActs])

  if (!c)
    return (
      <Modal side title="Nie znaleziono" onClose={onClose}>
        <p className="muted-t">Ta karta została usunięta albo połączona z inną.</p>
      </Modal>
    )
  const company = crm.companies.find((x) => x.id === c.company_id)
  const refresh = () => (loadActs(), crm.load())
  async function patch(p: Partial<Contact>) {
    const { error } = await db.from('crm_contacts').update(p).eq('id', id)
    if (error) return fail(/duplicate|23505/.test(error.message) ? new Error('Inna karta ma już ten adres e-mail. Użyj „Połącz z inną kartą”.') : error)
    refresh()
  }
  async function setCompanyByName(name: string | null) {
    if (!name) return patch({ company_id: null })
    let co = crm.companies.find((x) => x.name.trim().toLowerCase() === name.trim().toLowerCase())
    if (!co) {
      const { data, error } = await db.from('crm_companies').insert({ name: name.trim() }).select('*').single()
      if (error) return fail(error)
      co = data as Company
      toast(`Dodano firmę „${co.name}”`)
    }
    await patch({ company_id: co.id })
  }
  const quick = (k: 'note' | 'call' | 'task') => (setInitial(k), setCk((x) => x + 1), document.querySelector('.crm-d .cmp')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  const title = c.name || c.email || 'Bez nazwy'

  return (
    <Modal
      side
      className="modal--crm"
      title={
        <span className="dh">
          <span className="ava ava--lg">{initials(c.name || c.email || '')}</span>
          <span>
            <span className="dh__n">{title}</span>
            <span className="dh__s">
              {[c.position, company?.name].filter(Boolean).join(' · ') || (c.email && c.name ? c.email : 'Osoba')}
            </span>
          </span>
        </span>
      }
      onClose={onClose}
    >
      <div className="crm-d">
        <div className="crm-d__acts">
          {c.phone ? (
            <a className="qa qa--call" href={`tel:${c.phone.replace(/\s/g, '')}`} onClick={() => quick('call')}>
              <Icon n="call" s={16} /> Zadzwoń
            </a>
          ) : (
            <span className="qa qa--off" title="Brak numeru telefonu">
              <Icon n="call" s={16} /> Zadzwoń
            </span>
          )}
          {c.email ? (
            <a className="qa" href={`mailto:${c.email}?subject=${encodeURIComponent('Beauty & Hair Expo')}`}>
              <Icon n="mail" s={16} /> Napisz
            </a>
          ) : (
            <span className="qa qa--off">
              <Icon n="mail" s={16} /> Napisz
            </span>
          )}
          {canWrite && (
            <>
              <button type="button" className="qa" onClick={() => quick('call')}>
                <Icon n="note" s={16} /> Zapisz rozmowę
              </button>
              <button type="button" className="qa qa--gold" onClick={() => quick('task')}>
                <Icon n="clock" s={16} /> Oddzwonić
              </button>
            </>
          )}
        </div>

        <div className="pipe" role="group" aria-label="Etap">
          {Object.entries(STAGE).map(([k, [l]], i) => {
            const idx = Object.keys(STAGE).indexOf(c.stage)
            return (
              <button key={k} type="button" disabled={!canWrite} className={`${c.stage === k ? 'on' : ''} ${k !== 'inactive' && i < idx && c.stage !== 'inactive' ? 'past' : ''} pipe--${k}`} onClick={() => c.stage !== k && patch({ stage: k })}>
                {l}
              </button>
            )
          })}
        </div>

        <div className="crm-d__grid">
          <div className="crm-d__main">
            {c.next_action_at && (
              <p className={`nextbar nextbar--${dueGroup(c.next_action_at)}`}>
                <Icon n="clock" s={15} /> <b>{c.next_action || 'Zadanie'}</b> · {dueText(c.next_action_at)}
              </p>
            )}
            {canWrite && <Composer key={ck} initial={initial} target={{ contact_id: id }} staff={crm.staff} onDone={refresh} />}
            {!acts ? <Spinner /> : <Timeline items={acts} staff={crm.staff} onChange={refresh} />}
          </div>

          <aside className="crm-d__side">
            <section className="box">
              <p className="box__t">Dane kontaktowe</p>
              <InlineField label="Imię i nazwisko" value={c.name} disabled={!canWrite} onSave={(v) => patch({ name: v ?? '' })} />
              <InlineField label="E-mail" type="email" value={c.email} disabled={!canWrite} onSave={(v) => patch({ email: v?.toLowerCase() ?? null })} />
              <InlineField label="Telefon" type="tel" value={c.phone} disabled={!canWrite} onSave={(v) => patch({ phone: v })} />
              <InlineField label="Stanowisko / rola" value={c.position} disabled={!canWrite} onSave={(v) => patch({ position: v })} placeholder="np. właścicielka salonu" />
              <label className="if">
                <span className="if__l">
                  Firma
                  {company && (
                    <a href={`#/crm/f/${company.id}`} className="if__link">
                      otwórz →
                    </a>
                  )}
                </span>
                <CompanyInput value={company?.name ?? ''} companies={crm.companies} disabled={!canWrite} onSave={setCompanyByName} />
              </label>
              <label className="if">
                <span className="if__l">Opiekun</span>
                <select className="if__in" value={c.owner ?? ''} disabled={!canWrite} onChange={(e) => patch({ owner: e.target.value || null })}>
                  <option value="">— nieprzypisany —</option>
                  {crm.staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id === me.id ? `Ja (${s.name || s.email})` : s.name || s.email}
                    </option>
                  ))}
                </select>
              </label>
              <div className="if">
                <span className="if__l">Grupy / tagi</span>
                <TagEditor tags={c.tags} disabled={!canWrite} onChange={(tags) => patch({ tags })} />
              </div>
            </section>

            <section className="box">
              <p className="box__t">Skąd jest w bazie</p>
              <ul className="crm-facts">
                {c.sources.map((s) => (
                  <li key={s}>
                    <Icon n={s === 'newsletter' ? 'send' : s === 'order' ? 'cart' : s === 'manual' ? 'userplus' : 'inbox'} s={14} /> {SOURCE[s] ?? s}
                  </li>
                ))}
                <li>
                  <Icon n="calendar" s={14} /> W bazie od {fmtDate(c.created_at, false)}
                </li>
                <li>
                  <Icon n="send" s={14} /> Newsletter: {c.newsletter ? c.newsletter_segments.map((s) => SEGMENT[s] ?? s).join(', ') || 'tak' : 'nie zapisany'}
                </li>
                <li>
                  <Icon n="cart" s={14} /> Zakupy: {c.orders_count ? `${c.orders_count} · ${Number(c.orders_total).toLocaleString('pl-PL')} zł` : 'brak'}
                </li>
              </ul>
              {leads.length > 0 && (
                <div className="mini-leads">
                  {leads.map((l) => (
                    <a key={l.id} href="#/leads">
                      <Icon n="inbox" s={13} /> Zgłoszenie {fmtDate(l.created_at, false)}
                      {l.topic ? `: ${l.topic}` : ''}
                    </a>
                  ))}
                </div>
              )}
            </section>

            <section className="box">
              <InlineField label="Notatka stała (najważniejsze informacje)" area value={c.notes} disabled={!canWrite} onSave={(v) => patch({ notes: v })} placeholder="np. preferuje kontakt po 16:00, zainteresowana strefą Hair" />
            </section>

            {canWrite && (
              <section className="box box--quiet">
                {['admin', 'marketing', 'exhibitors'].includes(me.role) && (
                  <Btn small icon="merge" onClick={() => setMerge(true)}>
                    Połącz z inną kartą
                  </Btn>
                )}
                {me.role === 'admin' && (
                  <Btn
                    small
                    kind="danger"
                    icon="trash"
                    onClick={async () => {
                      if (!(await ask({ title: `Usunąć ${title} z bazy?`, text: 'Usunie kartę i całą historię kontaktów (np. na prośbę osoby, RODO). Zgłoszenia z formularzy zostaną w „Zgłoszeniach”.', yes: 'Usuń na stałe', danger: true }))) return
                      const { error } = await db.from('crm_contacts').delete().eq('id', id)
                      if (error) return fail(error)
                      toast('Karta usunięta')
                      crm.load()
                      onClose()
                    }}
                  >
                    Usuń
                  </Btn>
                )}
              </section>
            )}
          </aside>
        </div>
      </div>
      {merge && <MergeDialog keep={c} crm={crm} onClose={() => setMerge(false)} onDone={refresh} />}
    </Modal>
  )
}

function CompanyInput({ value, companies, onSave, disabled }: { value: string; companies: Company[]; onSave: (v: string | null) => void; disabled?: boolean }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  return (
    <>
      <input
        className="if__in"
        list="crm-companies"
        value={v}
        disabled={disabled}
        placeholder="Wpisz albo wybierz firmę"
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v.trim() !== value && onSave(v.trim() || null)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <datalist id="crm-companies">
        {companies.slice(0, 500).map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
    </>
  )
}

function MergeDialog({ keep, crm, onClose, onDone }: { keep: Contact; crm: Crm; onClose: () => void; onDone: () => void }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const list = crm.contacts!.filter((c) => c.id !== keep.id && q.length > 1 && `${c.name} ${c.email ?? ''} ${c.phone ?? ''}`.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
  return (
    <Modal title="Połącz z inną kartą" onClose={onClose}>
      <p className="muted-t">Wybierz drugą kartę tej samej osoby. Jej historia, tagi i zgłoszenia przejdą tutaj, a druga karta zniknie.</p>
      <label className="search mt" style={{ width: '100%' }}>
        <Icon n="search" s={15} />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj po imieniu, e-mailu, telefonie…" style={{ width: '100%' }} />
      </label>
      <div className="pick mt">
        {list.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await rpc('crm_merge_contacts', { p_keep: keep.id, p_drop: c.id })
                toast('Karty połączone')
                onClose()
                onDone()
              } catch (e) {
                fail(e)
              }
              setBusy(false)
            }}
          >
            <span className="ava">{initials(c.name || c.email || '')}</span>
            <span>
              <strong>{c.name || c.email}</strong>
              <small>{[c.email, c.phone].filter(Boolean).join(' · ')}</small>
            </span>
          </button>
        ))}
        {q.length > 1 && !list.length && <p className="muted-t">Nic nie znaleziono.</p>}
      </div>
    </Modal>
  )
}

/* ───────── Karta firmy ───────── */
function CompanyDrawer({ id, crm, onClose, canWrite }: { id: string; crm: Crm; onClose: () => void; canWrite: boolean }) {
  const me = useStore((s) => s.me!)
  const co = crm.companies.find((x) => x.id === id)
  const people = crm.contacts!.filter((c) => c.company_id === id)
  const [acts, setActs] = useState<Activity[] | null>(null)
  const ids = people.map((p) => p.id).join(',')
  const loadActs = useCallback(() => {
    const q = db.from('crm_activities').select('*').order('created_at', { ascending: false }).limit(400)
    ;(ids ? q.or(`company_id.eq.${id},contact_id.in.(${ids})`) : q.eq('company_id', id)).then(({ data, error }) => (error ? fail(error) : setActs(data as Activity[])))
  }, [id, ids])
  useEffect(() => loadActs(), [loadActs])
  if (!co)
    return (
      <Modal side title="Nie znaleziono" onClose={onClose}>
        <p className="muted-t">Ta firma została usunięta.</p>
      </Modal>
    )
  const refresh = () => (loadActs(), crm.load())
  async function patch(p: Partial<Company>) {
    const { error } = await db.from('crm_companies').update(p).eq('id', id)
    if (error) return fail(/duplicate|23505/.test(error.message) ? new Error('Firma z tym NIP-em już jest w bazie.') : error)
    crm.load()
  }
  const names = Object.fromEntries(people.map((p) => [p.id, p.name || p.email || 'Bez nazwy']))

  return (
    <Modal
      side
      className="modal--crm"
      title={
        <span className="dh">
          <span className="ava ava--lg ava--co">
            <Icon n="building" s={20} />
          </span>
          <span>
            <span className="dh__n">{co.name}</span>
            <span className="dh__s">{[COMPANY_KIND[co.kind], co.nip && `NIP ${co.nip}`, co.city].filter(Boolean).join(' · ')}</span>
          </span>
        </span>
      }
      onClose={onClose}
    >
      <div className="crm-d">
        {(co.phone || co.email || co.website) && (
        <div className="crm-d__acts">
          {co.phone && (
            <a className="qa qa--call" href={`tel:${co.phone.replace(/\s/g, '')}`}>
              <Icon n="call" s={16} /> Zadzwoń
            </a>
          )}
          {co.email && (
            <a className="qa" href={`mailto:${co.email}`}>
              <Icon n="mail" s={16} /> Napisz
            </a>
          )}
          {co.website && (
            <a className="qa" href={/^https?:/.test(co.website) ? co.website : `https://${co.website}`} target="_blank" rel="noopener">
              <Icon n="external" s={16} /> Strona
            </a>
          )}
        </div>
        )}
        <div className="crm-d__grid">
          <div className="crm-d__main">
            <section className="box">
              <p className="box__t">
                Osoby w firmie <em>{people.length}</em>
              </p>
              {!people.length ? (
                <p className="muted-t">Brak osób. Przypisz firmę na karcie osoby.</p>
              ) : (
                <div className="pick">
                  {people.map((p) => (
                    <button key={p.id} type="button" onClick={() => go(`crm/o/${p.id}`)}>
                      <span className="ava">{initials(p.name || p.email || '')}</span>
                      <span>
                        <strong>{p.name || p.email}</strong>
                        <small>{[p.position, p.email, p.phone].filter(Boolean).join(' · ')}</small>
                      </span>
                      <Badge tone={STAGE[p.stage]?.[1]}>{STAGE[p.stage]?.[0]}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </section>
            {canWrite && <Composer target={{ company_id: id }} staff={crm.staff} onDone={refresh} />}
            {!acts ? <Spinner /> : <Timeline items={acts} staff={crm.staff} names={names} onChange={refresh} showWho />}
          </div>
          <aside className="crm-d__side">
            <section className="box">
              <p className="box__t">Dane firmy</p>
              <InlineField label="Nazwa" value={co.name} disabled={!canWrite} onSave={async (v) => { if (v) await patch({ name: v }) }} />
              <InlineField label="NIP" value={co.nip} disabled={!canWrite} onSave={(v) => patch({ nip: v?.replace(/[^0-9A-Za-z]/g, '') || null })} />
              <label className="if">
                <span className="if__l">Rodzaj</span>
                <select className="if__in" value={co.kind} disabled={!canWrite} onChange={(e) => patch({ kind: e.target.value })}>
                  {Object.entries(COMPANY_KIND).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <InlineField label="Telefon" type="tel" value={co.phone} disabled={!canWrite} onSave={(v) => patch({ phone: v })} />
              <InlineField label="E-mail" type="email" value={co.email} disabled={!canWrite} onSave={(v) => patch({ email: v })} />
              <InlineField label="Strona / social media" value={co.website} disabled={!canWrite} onSave={(v) => patch({ website: v })} />
              <InlineField label="Miasto" value={co.city} disabled={!canWrite} onSave={(v) => patch({ city: v })} />
              <InlineField label="Adres" value={co.address} disabled={!canWrite} onSave={(v) => patch({ address: v })} />
              <label className="if">
                <span className="if__l">Opiekun</span>
                <select className="if__in" value={co.owner ?? ''} disabled={!canWrite} onChange={(e) => patch({ owner: e.target.value || null })}>
                  <option value="">— nieprzypisany —</option>
                  {crm.staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id === me.id ? `Ja (${s.name || s.email})` : s.name || s.email}
                    </option>
                  ))}
                </select>
              </label>
            </section>
            <section className="box">
              <InlineField label="Notatka stała" area value={co.notes} disabled={!canWrite} onSave={(v) => patch({ notes: v })} placeholder="np. stoisko 2027: 12 m², decyzje podejmuje właścicielka" />
            </section>
            {me.role === 'admin' && (
              <section className="box box--quiet">
                <Btn
                  small
                  kind="danger"
                  icon="trash"
                  onClick={async () => {
                    if (!(await ask({ title: `Usunąć firmę „${co.name}”?`, text: 'Osoby zostaną w bazie, tylko bez przypisanej firmy.', yes: 'Usuń', danger: true }))) return
                    const { error } = await db.from('crm_companies').delete().eq('id', id)
                    if (error) return fail(error)
                    crm.load()
                    onClose()
                  }}
                >
                  Usuń firmę
                </Btn>
              </section>
            )}
          </aside>
        </div>
      </div>
    </Modal>
  )
}

/* ───────── Nowa osoba / firma ───────── */
function Row({ children }: { children: ReactNode }) {
  return <div className="grid2">{children}</div>
}
function NewPerson({ crm, onClose }: { crm: Crm; onClose: () => void }) {
  const me = useStore((s) => s.me!)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<{ text: string; id?: string } | null>(null)
  return (
    <Modal title="Nowa osoba" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
          if (!f.name.trim() && !f.email.trim() && !f.phone.trim()) return setErr({ text: 'Podaj przynajmniej imię, e-mail albo telefon.' })
          setBusy(true)
          setErr(null)
          let company_id: string | null = null
          if (f.company.trim()) {
            const ex = crm.companies.find((c) => c.name.trim().toLowerCase() === f.company.trim().toLowerCase())
            if (ex) company_id = ex.id
            else {
              const { data, error } = await db.from('crm_companies').insert({ name: f.company.trim() }).select('id').single()
              if (error) return setBusy(false), fail(error)
              company_id = data.id
            }
          }
          const email = f.email.trim().toLowerCase() || null
          const { data, error } = await db
            .from('crm_contacts')
            .insert({ name: f.name.trim(), email, phone: f.phone.trim() || null, position: f.position.trim() || null, company_id, stage: f.stage, tags: f.tag ? [f.tag] : [], sources: ['manual'], owner: me.id })
            .select('id')
            .single()
          setBusy(false)
          if (error) {
            if (/duplicate|23505/.test(error.message)) {
              const ex = crm.contacts!.find((c) => c.email === email)
              return setErr({ text: 'Ta osoba (ten e-mail) jest już w bazie.', id: ex?.id })
            }
            return fail(error)
          }
          await crm.load()
          onClose()
          go(`crm/o/${data.id}`)
        }}
      >
        <Row>
          <div>
            <label className="ff__l">Imię i nazwisko</label>
            <input className="in" name="name" autoFocus />
          </div>
          <div>
            <label className="ff__l">Telefon</label>
            <input className="in" name="phone" type="tel" />
          </div>
        </Row>
        <label className="ff__l mt">E-mail</label>
        <input className="in" name="email" type="email" />
        <Row>
          <div className="mt">
            <label className="ff__l">Firma</label>
            <input className="in" name="company" list="crm-companies-new" placeholder="Nowa albo istniejąca" />
            <datalist id="crm-companies-new">
              {crm.companies.slice(0, 500).map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>
          <div className="mt">
            <label className="ff__l">Stanowisko / rola</label>
            <input className="in" name="position" />
          </div>
        </Row>
        <Row>
          <div className="mt">
            <label className="ff__l">Etap</label>
            <select className="in" name="stage" defaultValue="new">
              {Object.entries(STAGE).map(([k, [l]]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="mt">
            <label className="ff__l">Grupa</label>
            <select className="in" name="tag" defaultValue="">
              <option value="">— bez grupy —</option>
              {['wystawca', 'partner', 'media', 'kontakt', 'vip'].map((t) => (
                <option key={t} value={t}>
                  {TAG[t]}
                </option>
              ))}
            </select>
          </div>
        </Row>
        {err && (
          <p className="notice notice--warn mt">
            <Icon n="info" /> {err.text}{' '}
            {err.id && (
              <a href={`#/crm/o/${err.id}`} onClick={onClose}>
                Otwórz kartę →
              </a>
            )}
          </p>
        )}
        <div className="row row--end mt">
          <Btn onClick={onClose}>Anuluj</Btn>
          <Btn kind="primary" type="submit" busy={busy}>
            Dodaj osobę
          </Btn>
        </div>
      </form>
    </Modal>
  )
}

function NewCompany({ crm, onClose }: { crm: Crm; onClose: () => void }) {
  const me = useStore((s) => s.me!)
  const [busy, setBusy] = useState(false)
  return (
    <Modal title="Nowa firma" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
          setBusy(true)
          const nip = f.nip.replace(/[^0-9A-Za-z]/g, '') || null
          const { data, error } = await db
            .from('crm_companies')
            .insert({ name: f.name.trim(), nip, kind: f.kind, city: f.city.trim() || null, website: f.website.trim() || null, phone: f.phone.trim() || null, email: f.email.trim() || null, owner: me.id })
            .select('id')
            .single()
          setBusy(false)
          if (error) return fail(/duplicate|23505/.test(error.message) ? new Error('Firma z tym NIP-em już jest w bazie.') : error)
          await crm.load()
          onClose()
          go(`crm/f/${data.id}`)
        }}
      >
        <label className="ff__l">Nazwa firmy</label>
        <input className="in" name="name" required autoFocus />
        <Row>
          <div className="mt">
            <label className="ff__l">NIP</label>
            <input className="in" name="nip" />
          </div>
          <div className="mt">
            <label className="ff__l">Rodzaj</label>
            <select className="in" name="kind" defaultValue="exhibitor">
              {Object.entries(COMPANY_KIND).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </Row>
        <Row>
          <div className="mt">
            <label className="ff__l">Telefon</label>
            <input className="in" name="phone" type="tel" />
          </div>
          <div className="mt">
            <label className="ff__l">E-mail</label>
            <input className="in" name="email" type="email" />
          </div>
        </Row>
        <Row>
          <div className="mt">
            <label className="ff__l">Miasto</label>
            <input className="in" name="city" />
          </div>
          <div className="mt">
            <label className="ff__l">Strona / social media</label>
            <input className="in" name="website" />
          </div>
        </Row>
        <div className="row row--end mt">
          <Btn onClick={onClose}>Anuluj</Btn>
          <Btn kind="primary" type="submit" busy={busy}>
            Dodaj firmę
          </Btn>
        </div>
      </form>
    </Modal>
  )
}
