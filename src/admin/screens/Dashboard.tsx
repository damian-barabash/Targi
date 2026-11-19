// Pulpit: najważniejsze liczby, ruch na stronie, zgłoszenia, ostatnia aktywność.
import { useEffect, useState } from 'react'
import { ago, rpc } from '../api'
import { fail, useStore } from '../store'
import { BarList, Badge, Btn, Card, Icon, PageHead, SERIES, Spinner, Stat, TimeChart, dayRange } from '../ui'
import { KIND, STATUS } from './Leads'
import { go } from '../entry'

export type Dash = {
  from: string
  visitsByDay: { day: string; views: number; visits: number }[]
  visitsPrev: { views: number; visits: number }
  topPages: { path: string; views: number }[]
  sources: { k: string; v: number }[]
  devices: { k: string; v: number }[]
  langs: { k: string; v: number }[]
  leadsByDay: { day: string; kind: string; n: number }[]
  leadsPrev: number
  leadsOpen: number
  leadsTotal: number
  leadsByStatus: { k: string; v: number }[]
  subsByDay: { day: string; n: number }[]
  subsPrev: number
  subsTotal: number
  subsBySegment: { k: string; v: number }[]
  adsTotals: { impressions: number; clicks: number }
  recentLeads: { id: string; created_at: string; kind: string; name: string; company: string | null; status: string }[]
  recentAudit: { at: string; user_email: string | null; action: string; entity: string; summary: string | null }[]
}

export function useDash(days: number) {
  const [d, setD] = useState<Dash | null>(null)
  useEffect(() => {
    setD(null)
    rpc<Dash>('dashboard_stats', { p_days: days }).then(setD).catch(fail)
  }, [days])
  return d
}
export const pct = (now: number, prev: number) => (prev ? Math.round(((now - prev) / prev) * 100) : null)
export const sum = (a: number[]) => a.reduce((s, x) => s + x, 0)
export const SOURCE: Record<string, string> = { direct: 'Wejścia bezpośrednie', google: 'Google', facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', search: 'Inne wyszukiwarki', other: 'Inne strony' }
export const DEVICE: Record<string, string> = { mobile: 'Telefon', tablet: 'Tablet', desktop: 'Komputer' }

export function PeriodSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="seg" role="group" aria-label="Okres">
      {[7, 30, 90].map((d) => (
        <button key={d} className={value === d ? 'on' : ''} onClick={() => onChange(d)}>
          {d} dni
        </button>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const me = useStore((s) => s.me!)
  const event = useStore((s) => s.site.event)
  const tickets = useStore((s) => s.site.tickets)
  const pending = useStore((s) => Boolean(s.lastChange && (!s.lastPublish || s.lastChange > s.lastPublish)))
  const [days, setDays] = useState(30)
  const d = useDash(days)
  const left = Math.max(0, Math.ceil((Date.parse(event.startsAt) - Date.now()) / 86400e3))
  const hello = new Date().getHours() < 12 ? 'Dzień dobry' : new Date().getHours() < 18 ? 'Witaj' : 'Dobry wieczór'

  if (!d)
    return (
      <>
        <PageHead title={`${hello}${me.name ? `, ${me.name.split(' ')[0]}` : ''}`} />
        <Spinner />
      </>
    )
  const range = dayRange(d.from)
  const vmap = new Map(d.visitsByDay.map((x) => [x.day, x]))
  const visits = sum(d.visitsByDay.map((x) => x.visits))
  const leadsN = sum(d.leadsByDay.map((x) => x.n))
  const subsN = sum(d.subsByDay.map((x) => x.n))
  const kinds = Object.keys(KIND)
  return (
    <>
      <PageHead title={`${hello}${me.name ? `, ${me.name.split(' ')[0]}` : ''}`} desc={`${event.brand} ${event.edition} · ${event.dates.pl} · do otwarcia ${left} dni`}>
        <PeriodSelect value={days} onChange={setDays} />
      </PageHead>

      {pending && me.role !== 'reports' && (
        <p className="notice notice--warn">
          <Icon n="info" /> W wersji roboczej są zmiany, których nie ma jeszcze na stronie. Kliknij „Opublikuj” u góry, gdy będą gotowe.
        </p>
      )}

      <div className="stats-a">
        <Stat label="Wizyty na stronie" value={visits.toLocaleString('pl-PL')} delta={pct(visits, d.visitsPrev.visits)} hint={`vs poprzednie ${days} dni`} icon="chart" />
        <Stat label="Nowe zgłoszenia" value={leadsN} delta={pct(leadsN, d.leadsPrev)} hint={`${d.leadsOpen} czeka na odpowiedź`} icon="inbox" />
        <Stat label="Zapisy na newsletter" value={subsN} delta={pct(subsN, d.subsPrev)} hint={`${d.subsTotal} łącznie`} icon="send" />
        <Stat label="Kliknięcia w banery" value={d.adsTotals.clicks} hint={`${d.adsTotals.impressions.toLocaleString('pl-PL')} wyświetleń`} icon="ad" />
      </div>

      <div className="cards21">
        <Card title="Wizyty dziennie" aside={<a href="#/stats">Statystyki →</a>}>
          <TimeChart days={range} series={[{ name: 'Wizyty', color: '#1a1a18', values: range.map((x) => vmap.get(x)?.visits ?? 0) }]} />
        </Card>
        <Card title="Skąd przychodzą goście">
          <BarList items={d.sources.map((x) => ({ label: SOURCE[x.k] ?? x.k, value: x.v }))} />
        </Card>
      </div>

      <div className="cards21">
        <Card title="Zgłoszenia dziennie" aside={<a href="#/leads">Wszystkie →</a>}>
          <TimeChart
            kind="bars"
            days={range}
            series={kinds.map((k, i) => ({ name: KIND[k], color: SERIES[i], values: range.map((x) => d.leadsByDay.find((r) => r.day === x && r.kind === k)?.n ?? 0) }))}
          />
        </Card>
        <Card title="Najnowsze zgłoszenia" pad={false}>
          {!d.recentLeads.length ? (
            <p className="chart__empty chart__empty--static">Nie ma jeszcze zgłoszeń</p>
          ) : (
            <ul className="mini">
              {d.recentLeads.map((l) => (
                <li key={l.id} onClick={() => go('leads')}>
                  <div>
                    <strong>{l.company || l.name}</strong>
                    <small>
                      {KIND[l.kind]} · {ago(l.created_at)}
                    </small>
                  </div>
                  <Badge tone={STATUS[l.status]?.[1]}>{STATUS[l.status]?.[0]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="cards21">
        <Card title="Sprzedaż biletów" aside={<Badge tone="amber">Po podłączeniu płatności</Badge>}>
          <div className="sales">
            {tickets
              .filter((t) => t.active !== false)
              .map((t) => (
                <div key={t.id} className="sales__row">
                  <span>{t.name.pl}</span>
                  <span className="sales__bar">
                    <i style={{ width: '0%' }} />
                  </span>
                  <span className="sales__n">0{t.limit ? ` / ${t.limit}` : ''} szt.</span>
                  <span className="sales__p">0 zł</span>
                </div>
              ))}
          </div>
          <p className="muted-t">
            Tu pojawi się liczba sprzedanych biletów i przychód według rodzaju i dnia. Ceny i limity możesz ustawić już teraz w <a href="#/c/tickets">Biletach</a>.
          </p>
        </Card>
        <Card title="Ostatnia aktywność" aside={<a href="#/history">Historia →</a>} pad={false}>
          <ul className="mini mini--log">
            {d.recentAudit.map((a, i) => (
              <li key={i}>
                <div>
                  <strong>{a.summary || a.entity}</strong>
                  <small>
                    {a.user_email ?? 'system'} · {ago(a.at)}
                  </small>
                </div>
              </li>
            ))}
            {!d.recentAudit.length && <p className="chart__empty chart__empty--static">Brak aktywności</p>}
          </ul>
        </Card>
      </div>

      <div className="quick">
        <Btn icon="pages" onClick={() => go('edit/home')}>
          Edytuj stronę główną
        </Btn>
        <Btn icon="news" onClick={() => go('c/posts')}>
          Dodaj wpis
        </Btn>
        <Btn icon="ticket" onClick={() => go('c/tickets')}>
          Ceny biletów
        </Btn>
        <Btn icon="ad" onClick={() => go('ads')}>
          Banery
        </Btn>
      </div>
    </>
  )
}
