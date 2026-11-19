// Sprzedaż biletów: zamówienia z biletami QR, wystawianie biletów i zaproszeń, ponowna wysyłka, PDF, anulowanie.
import { useEffect, useMemo, useState } from 'react'
import { ago, db, downloadCsv, fmtDate, fn, rpc } from '../api'
import { fail, toast, useStore } from '../store'
import { Badge, Btn, Card, Empty, Icon, Modal, PageHead, Spinner, Stat, Tabs, ask } from '../ui'
import { go } from '../entry'

type Order = {
  id: string; number: string; created_at: string; status: string; kind: string; buyer_name: string; buyer_email: string; buyer_phone: string | null
  company: string | null; nip: string | null; total: number; items: { label: string; qty: number; sum: number }[]; locale: string; emailed_at: string | null; note: string | null; contact_id: string | null
}
type Ticket = { id: string; order_id: string; code: string; type_name: string; valid_dates: string[]; catering: boolean; holder_name: string | null; price: number; status: string; entries: number; last_entry_at: string | null }
const KIND: Record<string, [string, 'gold' | 'blue' | 'green']> = { sale: ['Sprzedaż online', 'green'], manual: ['Sprzedaż ręczna', 'blue'], invitation: ['Zaproszenie', 'gold'] }
const zl = (v: number) => `${Number(v).toLocaleString('pl-PL')} zł`
const d = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })

export default function Orders({ id }: { id?: string }) {
  const role = useStore((s) => s.me!.role)
  const sell = role === 'admin' || role === 'tickets'
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [kind, setKind] = useState('all')
  const [q, setQ] = useState('')
  const [issue, setIssue] = useState(false)
  const [entries, setEntries] = useState<number | null>(null)

  const load = async () => {
    const [o, t] = await Promise.all([
      db.from('orders').select('*').order('created_at', { ascending: false }).limit(3000),
      db.from('tickets').select('id,order_id,code,type_name,valid_dates,catering,holder_name,price,status,entries,last_entry_at').limit(20000),
    ])
    if (o.error) return fail(o.error)
    setOrders(o.data as Order[])
    setTickets((t.data ?? []) as Ticket[])
    rpc<{ today: number } | null>('scan_stats').then((s) => setEntries(s?.today ?? null)).catch(() => {})
  }
  useEffect(() => {
    load()
  }, [])

  const byOrder = useMemo(() => {
    const m: Record<string, Ticket[]> = {}
    for (const t of tickets) (m[t.order_id] ??= []).push(t)
    return m
  }, [tickets])
  const paid = (orders ?? []).filter((o) => o.status === 'paid')
  const soldTickets = tickets.filter((t) => t.status === 'valid' && paid.find((o) => o.id === t.order_id && o.kind !== 'invitation')).length
  const invTickets = tickets.filter((t) => t.status === 'valid' && paid.find((o) => o.id === t.order_id && o.kind === 'invitation')).length
  const revenue = paid.reduce((s, o) => s + Number(o.total), 0)
  const list = (orders ?? []).filter((o) => (kind === 'all' || o.kind === kind) && (!q || `${o.number} ${o.buyer_name} ${o.buyer_email} ${o.company ?? ''} ${(byOrder[o.id] ?? []).map((t) => t.code).join(' ')}`.toLowerCase().includes(q.toLowerCase())))
  const open = id ? orders?.find((o) => o.id === id) : null

  return (
    <>
      <PageHead title="Sprzedaż biletów" desc="Zamówienia z biletami QR. Kupujący dostaje e-mail z biletami i PDF, a dane trafiają do CRM.">
        <Btn
          icon="download"
          onClick={() =>
            downloadCsv('bilety.csv', [
              ['Zamówienie', 'Data', 'Rodzaj', 'Kupujący', 'E-mail', 'Telefon', 'Firma', 'NIP', 'Kod biletu', 'Bilet', 'Ważny', 'Catering', 'Cena', 'Status', 'Wejścia'],
              ...list.flatMap((o) => (byOrder[o.id] ?? []).map((t) => [o.number, fmtDate(o.created_at), KIND[o.kind]?.[0], o.buyer_name, o.buyer_email, o.buyer_phone, o.company, o.nip, t.code, t.type_name, t.valid_dates.join(', '), t.catering ? 'tak' : 'nie', t.price, t.status === 'valid' ? 'ważny' : 'anulowany', t.entries])),
            ])
          }
        >
          Eksport
        </Btn>
        {sell && (
          <Btn kind="primary" icon="ticket" onClick={() => setIssue(true)}>
            Wystaw bilet / zaproszenie
          </Btn>
        )}
      </PageHead>
      <p className="notice">
        <Icon n="info" /> Płatność online na stronie zostanie podłączona po wyborze operatora (Przelewy24 / PayU). Do tego czasu bilety wystawiasz tutaj: sprzedaż na miejscu, przelew albo zaproszenie. Wysyłka e-maila, PDF i QR działają już teraz.
      </p>
      <div className="stats-a">
        <Stat label="Sprzedane bilety" value={orders ? soldTickets : '—'} icon="ticket" />
        <Stat label="Przychód" value={orders ? zl(revenue) : '—'} icon="chart" />
        <Stat label="Zaproszenia" value={orders ? invTickets : '—'} icon="send" />
        <Stat label="Wejścia dziś" value={entries ?? '—'} icon="check" hint="z bramek (skaner)" />
      </div>
      <div className="row row--between row--wrap">
        <Tabs value={kind} onChange={setKind} items={[{ value: 'all', label: 'Wszystkie', count: orders?.length }, ...Object.entries(KIND).map(([value, [label]]) => ({ value, label, count: orders?.filter((o) => o.kind === value).length }))]} />
        <label className="search">
          <Icon n="search" s={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nr, osoba, e-mail, kod biletu…" />
        </label>
      </div>
      <Card pad={false}>
        {!orders ? (
          <Spinner />
        ) : !list.length ? (
          <Empty icon="ticket" title={orders.length ? 'Brak zamówień dla tych filtrów' : 'Nie ma jeszcze biletów'}>
            {sell ? 'Kliknij „Wystaw bilet / zaproszenie”, żeby wysłać pierwszy bilet z kodem QR.' : 'Pojawią się tutaj po pierwszej sprzedaży.'}
          </Empty>
        ) : (
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Nr</th>
                  <th>Kupujący</th>
                  <th>Bilety</th>
                  <th style={{ width: 150 }}>Rodzaj</th>
                  <th style={{ width: 100 }}>Kwota</th>
                  <th style={{ width: 130 }}>Kiedy</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o) => {
                  const ts = byOrder[o.id] ?? []
                  return (
                    <tr key={o.id} className="clickable" onClick={() => go(`orders/${o.id}`)}>
                      <td className="mono">{o.number}</td>
                      <td className="strong">
                        {o.buyer_name || o.buyer_email}
                        <small className="sub">{o.company ? `${o.company} · ` : ''}{o.buyer_email}</small>
                      </td>
                      <td>
                        {ts.length} szt.
                        <small className="sub">{o.items.map((x) => `${x.qty}× ${x.label}`).join(', ')}</small>
                      </td>
                      <td>
                        <Badge tone={KIND[o.kind]?.[1]}>{KIND[o.kind]?.[0]}</Badge>
                      </td>
                      <td>{o.kind === 'invitation' ? '—' : zl(o.total)}</td>
                      <td title={fmtDate(o.created_at)}>
                        {ago(o.created_at)}
                        <small className="sub">{o.emailed_at ? 'e-mail wysłany' : 'bez e-maila'}</small>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {open && <OrderDrawer o={open} tickets={byOrder[open.id] ?? []} sell={sell} onClose={() => go('orders')} onChange={load} />}
      {issue && <IssueDialog onClose={() => setIssue(false)} onDone={(oid) => (setIssue(false), load().then(() => go(`orders/${oid}`)))} />}
    </>
  )
}

function OrderDrawer({ o, tickets, sell, onClose, onChange }: { o: Order; tickets: Ticket[]; sell: boolean; onClose: () => void; onChange: () => void }) {
  const [busy, setBusy] = useState('')
  async function pdf() {
    setBusy('pdf')
    try {
      const r = await fn<{ pdf: string; filename: string }>('tickets', { action: 'pdf', id: o.id })
      const a = document.createElement('a')
      a.href = `data:application/pdf;base64,${r.pdf}`
      a.download = r.filename
      a.click()
    } catch (e) {
      fail(e)
    }
    setBusy('')
  }
  async function resend() {
    setBusy('mail')
    try {
      await fn('tickets', { action: 'resend', id: o.id })
      toast(`Bilety wysłane ponownie na ${o.buyer_email}`)
      onChange()
    } catch (e) {
      fail(e)
    }
    setBusy('')
  }
  return (
    <Modal
      side
      title={`Zamówienie ${o.number}`}
      onClose={onClose}
      footer={
        <>
          {o.contact_id && (
            <a className="ab" href={`#/crm/o/${o.contact_id}`}>
              <Icon n="crm" s={17} />
              <span>Karta klienta</span>
            </a>
          )}
          <span className="grow" />
          <Btn icon="download" busy={busy === 'pdf'} onClick={pdf}>
            PDF
          </Btn>
          {sell && (
            <Btn kind="primary" icon="send" busy={busy === 'mail'} onClick={resend}>
              Wyślij ponownie
            </Btn>
          )}
        </>
      }
    >
      <div className="lead">
        <div className="row row--wrap">
          <Badge tone={KIND[o.kind]?.[1]}>{KIND[o.kind]?.[0]}</Badge>
          <span className="muted-t">
            {fmtDate(o.created_at)} · {o.locale.toUpperCase()} · {o.emailed_at ? `e-mail wysłany ${ago(o.emailed_at)}` : 'e-mail nie został wysłany'}
          </span>
        </div>
        <dl className="dl">
          <dt>Kupujący</dt>
          <dd>{o.buyer_name || '—'}</dd>
          <dt>E-mail</dt>
          <dd>
            <a href={`mailto:${o.buyer_email}`}>{o.buyer_email}</a>
          </dd>
          {o.buyer_phone && (
            <>
              <dt>Telefon</dt>
              <dd>{o.buyer_phone}</dd>
            </>
          )}
          {o.company && (
            <>
              <dt>Firma</dt>
              <dd>
                {o.company}
                {o.nip ? ` · NIP ${o.nip}` : ''}
              </dd>
            </>
          )}
          <dt>Kwota</dt>
          <dd>{o.kind === 'invitation' ? 'zaproszenie (0 zł)' : zl(o.total)}</dd>
          {o.note && (
            <>
              <dt>Notatka</dt>
              <dd>{o.note}</dd>
            </>
          )}
        </dl>
        <p className="ff__l mt">Bilety ({tickets.length})</p>
        <div className="otix">
          {tickets.map((t) => (
            <div key={t.id} className={`otix__i ${t.status !== 'valid' ? 'is-off' : ''}`}>
              <div className="grow">
                <strong>{t.type_name}</strong>
                <small>
                  {t.valid_dates.map(d).join(' + ')}
                  {t.catering ? ' · catering' : ''}
                  {t.holder_name ? ` · ${t.holder_name}` : ''}
                </small>
                <span className="mono">{t.code}</span>
              </div>
              <div className="otix__r">
                {t.status !== 'valid' ? <Badge tone="red">Anulowany</Badge> : t.entries ? <Badge tone="green">Wszedł · {t.entries}×</Badge> : <Badge>Nieużyty</Badge>}
                {sell && (
                  <Btn
                    small
                    kind="plain"
                    icon={t.status === 'valid' ? 'x' : 'undo'}
                    title={t.status === 'valid' ? 'Anuluj bilet' : 'Przywróć bilet'}
                    onClick={async () => {
                      if (t.status === 'valid' && !(await ask({ title: `Anulować bilet ${t.code}?`, text: 'Skaner nie wpuści gościa z tym kodem. Zwrot pieniędzy (jeśli dotyczy) robisz osobno.', yes: 'Anuluj bilet', danger: true }))) return
                      try {
                        await rpc('ticket_set_status', { p_id: t.id, p_status: t.status === 'valid' ? 'cancelled' : 'valid' })
                        onChange()
                      } catch (e) {
                        fail(e)
                      }
                    }}
                  />
                )}
                <a className="ab ab--plain ab--sm ab--icon" href={`/bilet/?k=${t.code}`} target="_blank" rel="noopener" title="Bilet online">
                  <Icon n="external" s={15} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

type Line = { type: string; day: string; catering: boolean; qty: number }
function IssueDialog({ onClose, onDone }: { onClose: () => void; onDone: (orderId: string) => void }) {
  const site = useStore((s) => s.site)
  const types = site.tickets.filter((t) => t.active !== false)
  const [kind, setKind] = useState<'manual' | 'invitation'>('invitation')
  const [buyer, setBuyer] = useState({ name: '', email: '', phone: '', company: '', nip: '' })
  const [lines, setLines] = useState<Line[]>([{ type: types[0]?.id ?? '', day: site.ticketDays[0]?.id ?? '', catering: false, qty: 1 }])
  const [locale, setLocale] = useState<'pl' | 'en'>('pl')
  const [note, setNote] = useState('')
  const [send, setSend] = useState(true)
  const [busy, setBusy] = useState(false)
  const price = (l: Line) => {
    const t = types.find((x) => x.id === l.type)
    if (!t || kind === 'invitation') return 0
    return (t.price + (l.catering && !t.cateringIncluded ? site.catering.pricePerDay * t.days : 0)) * l.qty
  }
  const total = lines.reduce((s, l) => s + price(l), 0)
  const setLine = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)))
  const ok = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(buyer.email) && lines.every((l) => l.type && l.qty > 0)

  return (
    <Modal
      wide
      title="Wystaw bilet / zaproszenie"
      onClose={onClose}
      footer={
        <>
          <span className="muted-t grow">{kind === 'invitation' ? 'Zaproszenie: 0 zł' : `Razem: ${zl(total)}`}</span>
          <Btn onClick={onClose}>Anuluj</Btn>
          <Btn
            kind="gold"
            icon="send"
            busy={busy}
            disabled={!ok}
            onClick={async () => {
              setBusy(true)
              try {
                const r = await fn<{ order: { id: string; number: string }; mailed: { error?: string } }>('tickets', { action: 'issue', kind, buyer, items: lines.map((l) => ({ type: l.type, day: l.day, catering: l.catering, qty: l.qty })), locale, note, send })
                if (r.mailed?.error) toast(`Zamówienie ${r.order.number} zapisane, ale e-mail nie wyszedł: ${r.mailed.error}`, 'err')
                else toast(send ? `Wysłano bilety (${r.order.number}) na ${buyer.email}` : `Zapisano zamówienie ${r.order.number}`)
                onDone(r.order.id)
              } catch (e) {
                fail(e)
              }
              setBusy(false)
            }}
          >
            {send ? 'Wystaw i wyślij e-mail' : 'Wystaw bez e-maila'}
          </Btn>
        </>
      }
    >
      <div className="statusbar">
        <button className={kind === 'invitation' ? 'on' : ''} onClick={() => setKind('invitation')}>
          Zaproszenie (bezpłatne)
        </button>
        <button className={kind === 'manual' ? 'on' : ''} onClick={() => setKind('manual')}>
          Sprzedaż (na miejscu, przelew)
        </button>
      </div>
      <div className="grid2 mt">
        <div>
          <label className="ff__l">Imię i nazwisko</label>
          <input className="in" value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} />
        </div>
        <div>
          <label className="ff__l">E-mail (tu trafią bilety)</label>
          <input className="in" type="email" value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} />
        </div>
        <div className="mt">
          <label className="ff__l">Telefon</label>
          <input className="in" value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} />
        </div>
        <div className="mt">
          <label className="ff__l">Firma / NIP (opcjonalnie)</label>
          <div className="row">
            <input className="in" value={buyer.company} placeholder="Firma" onChange={(e) => setBuyer({ ...buyer, company: e.target.value })} />
            <input className="in" style={{ maxWidth: 140 }} value={buyer.nip} placeholder="NIP" onChange={(e) => setBuyer({ ...buyer, nip: e.target.value })} />
          </div>
        </div>
      </div>
      <p className="ff__l mt">Bilety</p>
      <div className="ilines">
        {lines.map((l, i) => {
          const t = types.find((x) => x.id === l.type)
          return (
            <div key={i} className="iline">
              <select className="in" value={l.type} onChange={(e) => setLine(i, { type: e.target.value })}>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name.pl} · {zl(t.price)}
                  </option>
                ))}
              </select>
              {t?.days === 1 && (
                <select className="in" value={l.day} onChange={(e) => setLine(i, { day: e.target.value })}>
                  {site.ticketDays.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label.pl} {d.date}
                    </option>
                  ))}
                </select>
              )}
              <label className="iline__chk">
                <input type="checkbox" checked={Boolean(t?.cateringIncluded || l.catering)} disabled={t?.cateringIncluded} onChange={(e) => setLine(i, { catering: e.target.checked })} />
                Catering
              </label>
              <input className="in iline__qty" type="number" min={1} max={50} value={l.qty} onChange={(e) => setLine(i, { qty: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })} aria-label="Ilość" />
              <span className="iline__sum">{kind === 'invitation' ? '0 zł' : zl(price(l))}</span>
              {lines.length > 1 && <Btn small kind="plain" icon="trash" title="Usuń" onClick={() => setLines(lines.filter((_, j) => j !== i))} />}
            </div>
          )
        })}
        <button type="button" className="linkbtn" style={{ marginTop: 4 }} onClick={() => setLines([...lines, { type: types[0]?.id ?? '', day: site.ticketDays[0]?.id ?? '', catering: false, qty: 1 }])}>
          + Dodaj kolejny rodzaj biletu
        </button>
      </div>
      <div className="grid2 mt">
        <div>
          <label className="ff__l">Język e-maila i biletu</label>
          <select className="in" value={locale} onChange={(e) => setLocale(e.target.value as 'pl' | 'en')}>
            <option value="pl">Polski</option>
            <option value="en">English</option>
          </select>
        </div>
        <div>
          <label className="ff__l">Notatka wewnętrzna</label>
          <input className="in" value={note} onChange={(e) => setNote(e.target.value)} placeholder="np. zaproszenie dla partnera, płatność gotówką" />
        </div>
      </div>
      <label className="row mt" style={{ cursor: 'pointer' }}>
        <input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} />
        <span>Wyślij e-mail z biletami (PDF + kody QR)</span>
      </label>
    </Modal>
  )
}
