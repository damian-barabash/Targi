// Oś aktywności klienta: dodawanie notatek, rozmów, zadań „oddzwonić” + historia pogrupowana po dniach.
import { useState } from 'react'
import { ago, db, fmtDate, type Profile } from '../api'
import { fail, toast, useStore } from '../store'
import { Badge, Btn, Icon, ask } from '../ui'
import { ACT, OUTCOME, actText, dayLabel, dueGroup, dueText, fromLocalInput, quickDue, type Activity } from './data'

type Kind = 'note' | 'call' | 'email' | 'meeting' | 'task'
const KINDS: { k: Kind; label: string; icon: string }[] = [
  { k: 'note', label: 'Notatka', icon: 'note' },
  { k: 'call', label: 'Rozmowa', icon: 'call' },
  { k: 'task', label: 'Oddzwonić', icon: 'clock' },
  { k: 'email', label: 'E-mail', icon: 'mail' },
  { k: 'meeting', label: 'Spotkanie', icon: 'users' },
]
const QUICK: { k: Parameters<typeof quickDue>[0]; label: string }[] = [
  { k: 'today', label: 'Dziś' },
  { k: 'tomorrow', label: 'Jutro 10:00' },
  { k: 'd3', label: 'Za 3 dni' },
  { k: 'week', label: 'Za tydzień' },
  { k: 'month', label: 'Za miesiąc' },
]

export function Composer({ target, staff, onDone, initial = 'note' }: { target: { contact_id?: string; company_id?: string }; staff: Profile[]; onDone: () => void; initial?: Kind }) {
  const me = useStore((s) => s.me!)
  const [kind, setKind] = useState<Kind>(initial)
  const [body, setBody] = useState('')
  const [outcome, setOutcome] = useState('')
  const [follow, setFollow] = useState(false)
  const [due, setDue] = useState(quickDue('tomorrow'))
  const [who, setWho] = useState(me.id)
  const [busy, setBusy] = useState(false)

  const isTask = kind === 'task'
  const withDue = isTask || follow
  const can = isTask ? true : kind === 'call' ? Boolean(outcome) : body.trim().length > 0

  async function submit() {
    setBusy(true)
    const rows: Partial<Activity>[] = []
    if (isTask) rows.push({ ...target, type: 'task', body: body.trim() || 'Oddzwonić', due_at: fromLocalInput(due), assigned_to: who || null })
    else {
      rows.push({ ...target, type: kind, body: body.trim() || null, outcome: kind === 'call' ? outcome : null })
      if (follow) rows.push({ ...target, type: 'task', body: kind === 'call' ? 'Oddzwonić' : 'Odezwać się ponownie', due_at: fromLocalInput(due), assigned_to: who || null })
    }
    const { error } = await db.from('crm_activities').insert(rows)
    setBusy(false)
    if (error) return fail(error)
    toast(isTask ? 'Zadanie zaplanowane' : follow ? 'Zapisano i zaplanowano kolejny kontakt' : 'Zapisano')
    setBody(''), setOutcome(''), setFollow(false), setDue(quickDue('tomorrow'))
    onDone()
  }

  return (
    <div className="cmp">
      <div className="cmp__kinds" role="tablist">
        {KINDS.map((x) => (
          <button key={x.k} type="button" role="tab" aria-selected={kind === x.k} className={kind === x.k ? 'on' : ''} onClick={() => (setKind(x.k), x.k !== 'call' && setOutcome(''))}>
            <Icon n={x.icon} s={15} />
            <span>{x.label}</span>
          </button>
        ))}
      </div>
      <div className="cmp__box" key={kind}>
        {kind === 'call' && (
          <div className="cmp__chips">
            {Object.entries(OUTCOME).map(([k, l]) => (
              <button
                key={k}
                type="button"
                className={outcome === k ? 'on' : ''}
                onClick={() => {
                  setOutcome(k)
                  if (k === 'callback' || k === 'no_answer' || k === 'voicemail') setFollow(true)
                }}
              >
                {l}
              </button>
            ))}
          </div>
        )}
        <textarea
          className="cmp__in"
          rows={isTask ? 1 : 3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            isTask ? 'Co zrobić? (domyślnie: Oddzwonić)' : kind === 'call' ? 'O czym rozmawialiście? Ustalenia, kolejny krok…' : kind === 'email' ? 'Czego dotyczył e-mail?' : kind === 'meeting' ? 'Gdzie i z kim? Ustalenia…' : 'Notatka widoczna dla całego zespołu…'
          }
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && can && submit()}
        />
        {!isTask && (
          <label className="cmp__follow">
            <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
            <span>Zaplanuj kolejny kontakt</span>
          </label>
        )}
        {withDue && (
          <div className="cmp__due">
            <div className="cmp__quick">
              {QUICK.map((q) => (
                <button key={q.k} type="button" className={due === quickDue(q.k) ? 'on' : ''} onClick={() => setDue(quickDue(q.k))}>
                  {q.label}
                </button>
              ))}
            </div>
            <div className="cmp__row">
              <input className="in in--sm" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Termin" />
              <select className="in in--sm" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Kto">
                <option value="">— ktokolwiek —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id === me.id ? 'Ja' : s.name || s.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        <div className="cmp__foot">
          <span className="muted-t">{can ? '⌘/Ctrl + Enter' : kind === 'call' ? 'Wybierz, jak poszła rozmowa' : ''}</span>
          <Btn kind="primary" small icon="check" busy={busy} disabled={!can} onClick={submit}>
            {isTask ? 'Zaplanuj' : 'Zapisz'}
          </Btn>
        </div>
      </div>
    </div>
  )
}

/** Lista otwartych zadań (z odhaczaniem) + historia. */
export function Timeline({ items, staff, names, onChange, showWho }: { items: Activity[]; staff: Profile[]; names?: Record<string, string>; onChange: () => void; showWho?: boolean }) {
  const me = useStore((s) => s.me!)
  const [leaving, setLeaving] = useState<string[]>([])
  const open = items.filter((a) => a.type === 'task' && !a.done_at).sort((a, b) => (a.due_at ?? '9').localeCompare(b.due_at ?? '9'))
  const hist = items.filter((a) => !(a.type === 'task' && !a.done_at)).sort((a, b) => (b.done_at ?? b.created_at).localeCompare(a.done_at ?? a.created_at))
  const who = (id: string | null) => staff.find((s) => s.id === id)

  async function done(a: Activity, v: boolean) {
    if (v) setLeaving((l) => [...l, a.id])
    const { error } = await db.from('crm_activities').update({ done_at: v ? new Date().toISOString() : null }).eq('id', a.id)
    if (error) return (setLeaving((l) => l.filter((x) => x !== a.id)), fail(error))
    setTimeout(() => (onChange(), setLeaving((l) => l.filter((x) => x !== a.id))), v ? 450 : 0)
  }
  async function remove(a: Activity) {
    if (!(await ask({ title: 'Usunąć ten wpis?', yes: 'Usuń', danger: true }))) return
    const { error } = await db.from('crm_activities').delete().eq('id', a.id)
    if (error) return fail(error)
    onChange()
  }

  const groups: { day: string; items: Activity[] }[] = []
  for (const a of hist) {
    const day = dayLabel(a.done_at ?? a.created_at)
    const g = groups[groups.length - 1]
    if (g && g.day === day) g.items.push(a)
    else groups.push({ day, items: [a] })
  }
  const target = (a: Activity) => (names && a.contact_id ? names[a.contact_id] : null)

  return (
    <div className="tl">
      {open.length > 0 && (
        <div className="tl__tasks">
          <p className="tl__h">
            <Icon n="clock" s={14} /> Do zrobienia
          </p>
          {open.map((a) => {
            const g = dueGroup(a.due_at)
            return (
              <div key={a.id} className={`task task--${g} ${leaving.includes(a.id) ? 'is-done' : ''}`}>
                <button type="button" className="task__chk" onClick={() => done(a, true)} title="Oznacz jako zrobione" aria-label="Zrobione">
                  <Icon n="check" s={13} />
                </button>
                <div className="grow">
                  <strong>{a.body || 'Zadanie'}</strong>
                  <small>
                    <span className={`due due--${g}`}>{dueText(a.due_at)}</span>
                    {target(a) && <> · {target(a)}</>}
                    {a.assigned_to && <> · {a.assigned_to === me.id ? 'Ty' : who(a.assigned_to)?.name || who(a.assigned_to)?.email}</>}
                  </small>
                </div>
                {(a.created_by === me.id || me.role === 'admin') && <Btn small kind="plain" icon="trash" title="Usuń zadanie" onClick={() => remove(a)} />}
              </div>
            )
          })}
        </div>
      )}
      {!hist.length && !open.length && <p className="tl__empty">Brak historii. Dodaj pierwszą notatkę albo zapisz rozmowę.</p>}
      {groups.map((g) => (
        <div key={g.day} className="tl__day">
          <p className="tl__date">{g.day}</p>
          {g.items.map((a) => {
            const t = ACT[a.type] ?? ACT.system
            const auto = ['lead', 'newsletter', 'order', 'stage', 'system'].includes(a.type)
            return (
              <div key={a.id} className={`ev ev--${t.tone}`}>
                <span className="ev__ic">
                  <Icon n={a.type === 'task' ? 'check' : t.icon} s={14} />
                </span>
                <div className="ev__main">
                  <p className="ev__t">
                    <strong>{a.type === 'task' ? 'Zrobione' : t.label}</strong>
                    {a.outcome && <Badge tone={a.outcome === 'talked' ? 'green' : a.outcome === 'wrong_number' ? 'red' : 'amber'}>{OUTCOME[a.outcome]}</Badge>}
                    {showWho && target(a) && <span className="ev__who">{target(a)}</span>}
                    <span className="ev__time" title={fmtDate(a.done_at ?? a.created_at)}>
                      {new Date(a.done_at ?? a.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </p>
                  {actText(a) && <p className={`ev__b ${a.type === 'task' ? 'ev__b--done' : ''}`}>{actText(a)}</p>}
                  <p className="ev__m">
                    {auto ? 'automatycznie' : a.created_email || 'zespół'}
                    {a.type === 'task' && a.done_at && <> · zaplanowane {ago(a.created_at)}</>}
                    {a.type === 'lead' && a.ref && (
                      <>
                        {' · '}
                        <a href="#/leads">zobacz zgłoszenie</a>
                      </>
                    )}
                  </p>
                </div>
                {a.type === 'task' && a.done_at && <Btn small kind="plain" icon="undo" title="Przywróć jako niezrobione" onClick={() => done(a, false)} />}
                {!auto && a.type !== 'task' && (a.created_by === me.id || me.role === 'admin') && <Btn small kind="plain" icon="trash" title="Usuń wpis" onClick={() => remove(a)} />}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
