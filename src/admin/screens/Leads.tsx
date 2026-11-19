// Zgłoszenia z formularzy strony: prosty CRM (status, notatki, opiekun, eksport).
import { useEffect, useMemo, useState } from 'react'
import { ago, db, downloadCsv, fmtDate, type Profile } from '../api'
import { fail, toast, useStore } from '../store'
import { Badge, Btn, Card, Empty, Icon, Modal, PageHead, Spinner, Tabs, ask } from '../ui'

export type Lead = {
  id: string; created_at: string; kind: string; locale: string; name: string; email: string; phone: string | null; company: string | null
  topic: string | null; message: string | null; details: Record<string, string>; status: string; source_path: string | null; notes: string | null; assigned_to: string | null; updated_at: string | null; contact_id: string | null
}
export const KIND: Record<string, string> = { exhibitor: 'Wystawca', partner: 'Partner / reklama', media: 'Media', contact: 'Kontakt' }
export const STATUS: Record<string, [string, 'gold' | 'blue' | 'green' | 'red' | 'gray']> = {
  new: ['Nowe', 'gold'],
  in_progress: ['W toku', 'blue'],
  won: ['Wygrane', 'green'],
  lost: ['Przegrane', 'red'],
  archived: ['Archiwum', 'gray'],
}
const DETAIL: Record<string, string> = { nip: 'NIP', zone: 'Strefa', stand_size: 'Wielkość stoiska', url: 'Link do medium' }

export default function Leads() {
  const role = useStore((s) => s.me!.role)
  const canWrite = ['admin', 'exhibitors', 'marketing'].includes(role)
  const [rows, setRows] = useState<Lead[] | null>(null)
  const [staff, setStaff] = useState<Profile[]>([])
  const [kind, setKind] = useState('all')
  const [status, setStatus] = useState('open')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Lead | null>(null)
  const [notes, setNotes] = useState('')

  const load = () =>
    db
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)
      .then(({ data, error }) => (error ? fail(error) : setRows(data as Lead[])))
  useEffect(() => {
    load()
    db.from('profiles').select('*').then(({ data }) => setStaff((data ?? []) as Profile[]))
  }, [])

  const list = useMemo(
    () =>
      (rows ?? []).filter(
        (r) =>
          (kind === 'all' || r.kind === kind) &&
          (status === 'all' || (status === 'open' ? ['new', 'in_progress'].includes(r.status) : r.status === status)) &&
          (!q || `${r.name} ${r.email} ${r.company ?? ''} ${r.message ?? ''}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [rows, kind, status, q],
  )
  const count = (k: string) => (rows ?? []).filter((r) => (k === 'all' || r.kind === k) && ['new', 'in_progress'].includes(r.status)).length

  async function patch(id: string, p: Partial<Lead>) {
    const { error } = await db.from('leads').update(p).eq('id', id)
    if (error) return fail(error)
    setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, ...p } : r)) ?? null)
    setOpen((o) => (o && o.id === id ? { ...o, ...p } : o))
  }
  const who = (id: string | null) => staff.find((s) => s.id === id)

  return (
    <>
      <PageHead title="Zgłoszenia" desc="Wszystko, co przyszło z formularzy: wystawcy, partnerzy, media i kontakt.">
        <Btn
          icon="download"
          onClick={() =>
            downloadCsv('zgloszenia.csv', [
              ['Data', 'Rodzaj', 'Status', 'Imię i nazwisko', 'Firma', 'E-mail', 'Telefon', 'Temat', 'Wiadomość', 'NIP', 'Strefa', 'Stoisko', 'Link', 'Opiekun', 'Notatki', 'Język', 'Strona'],
              ...list.map((r) => [fmtDate(r.created_at), KIND[r.kind], STATUS[r.status]?.[0], r.name, r.company, r.email, r.phone, r.topic, r.message, r.details?.nip, r.details?.zone, r.details?.stand_size, r.details?.url, who(r.assigned_to)?.email, r.notes, r.locale, r.source_path]),
            ])
          }
        >
          Eksport do Excela
        </Btn>
      </PageHead>
      <div className="row row--between row--wrap">
        <Tabs value={kind} onChange={setKind} items={[{ value: 'all', label: 'Wszystkie', count: count('all') }, ...Object.entries(KIND).map(([value, label]) => ({ value, label, count: count(value) }))]} />
        <div className="row">
          <select className="in in--sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="open">Otwarte (nowe i w toku)</option>
            <option value="all">Wszystkie statusy</option>
            {Object.entries(STATUS).map(([v, [l]]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <label className="search">
            <Icon n="search" s={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj…" />
          </label>
        </div>
      </div>
      <Card pad={false}>
        {!rows ? (
          <Spinner />
        ) : !list.length ? (
          <Empty title={rows.length ? 'Brak zgłoszeń dla tych filtrów' : 'Nie ma jeszcze zgłoszeń'}>{rows.length ? 'Zmień filtr statusu albo rodzaj.' : 'Pojawią się tutaj, gdy ktoś wyśle formularz na stronie.'}</Empty>
        ) : (
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Kto</th>
                  <th style={{ width: 150 }}>Rodzaj</th>
                  <th>Wiadomość</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th style={{ width: 130 }}>Kiedy</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} className={`clickable ${r.status === 'new' ? 'unread' : ''}`} onClick={() => (setOpen(r), setNotes(r.notes ?? ''))}>
                    <td className="strong">
                      {r.company || r.name}
                      <small className="sub">
                        {r.company ? `${r.name} · ` : ''}
                        {r.email}
                      </small>
                    </td>
                    <td>{KIND[r.kind]}</td>
                    <td className="clip">{r.message || r.topic || '—'}</td>
                    <td>
                      <Badge tone={STATUS[r.status]?.[1]}>{STATUS[r.status]?.[0]}</Badge>
                    </td>
                    <td title={fmtDate(r.created_at)}>{ago(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {open && (
        <Modal
          side
          title={open.company || open.name}
          onClose={() => setOpen(null)}
          footer={
            <>
              {role === 'admin' && (
                <Btn
                  kind="danger"
                  icon="trash"
                  onClick={async () => {
                    if (!(await ask({ title: 'Usunąć zgłoszenie na stałe?', text: 'Zwykle lepiej przenieść je do archiwum.', yes: 'Usuń', danger: true }))) return
                    const { error } = await db.from('leads').delete().eq('id', open.id)
                    if (error) return fail(error)
                    setRows((rs) => rs?.filter((r) => r.id !== open.id) ?? null)
                    setOpen(null)
                  }}
                >
                  Usuń
                </Btn>
              )}
              <span className="grow" />
              {open.contact_id && (
                <a className="ab" href={`#/crm/o/${open.contact_id}`}>
                  <Icon n="crm" s={17} />
                  <span>Karta klienta</span>
                </a>
              )}
              <a className="ab ab--primary" href={`mailto:${open.email}?subject=${encodeURIComponent('Beauty & Hair Expo')}`}>
                <Icon n="mail" s={17} />
                <span>Odpisz e-mailem</span>
              </a>
            </>
          }
        >
          <div className="lead">
            <div className="row row--wrap">
              <Badge tone="gray">{KIND[open.kind]}</Badge>
              <span className="muted-t">
                {fmtDate(open.created_at)} · {open.locale.toUpperCase()} · {open.source_path}
              </span>
            </div>
            <div className="statusbar">
              {Object.entries(STATUS).map(([v, [l]]) => (
                <button key={v} className={open.status === v ? 'on' : ''} disabled={!canWrite} onClick={() => patch(open.id, { status: v })}>
                  {l}
                </button>
              ))}
            </div>
            <dl className="dl">
              <dt>Osoba</dt>
              <dd>{open.name}</dd>
              {open.company && (
                <>
                  <dt>Firma</dt>
                  <dd>{open.company}</dd>
                </>
              )}
              <dt>E-mail</dt>
              <dd>
                <a href={`mailto:${open.email}`}>{open.email}</a>
              </dd>
              {open.phone && (
                <>
                  <dt>Telefon</dt>
                  <dd>
                    <a href={`tel:${open.phone}`}>{open.phone}</a>
                  </dd>
                </>
              )}
              {open.topic && (
                <>
                  <dt>Temat</dt>
                  <dd>{open.topic}</dd>
                </>
              )}
              {Object.entries(open.details ?? {}).map(([k, v]) => (
                <span key={k} className="contents">
                  <dt>{DETAIL[k] ?? k}</dt>
                  <dd>{v}</dd>
                </span>
              ))}
            </dl>
            {open.message && <blockquote className="lead__msg">{open.message}</blockquote>}
            <label className="ff__l">Opiekun</label>
            <select className="in" value={open.assigned_to ?? ''} disabled={!canWrite} onChange={(e) => patch(open.id, { assigned_to: e.target.value || null })}>
              <option value="">— nieprzypisane —</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.email}
                </option>
              ))}
            </select>
            <label className="ff__l mt">Notatki wewnętrzne</label>
            <textarea className="in" rows={5} value={notes} disabled={!canWrite} onChange={(e) => setNotes(e.target.value)} placeholder="Ustalenia, kolejny krok, termin kontaktu…" />
            {canWrite && notes !== (open.notes ?? '') && (
              <div className="row row--end mt">
                <Btn kind="primary" small onClick={() => patch(open.id, { notes }).then(() => toast('Notatka zapisana'))}>
                  Zapisz notatkę
                </Btn>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
