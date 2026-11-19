// Statystyki odwiedzin (własny licznik bez cookies — sumy dzienne).
import { useState } from 'react'
import { downloadCsv } from '../api'
import { BarList, Btn, Card, PageHead, Spinner, Stat, TimeChart, dayRange } from '../ui'
import { DEVICE, PeriodSelect, SOURCE, pct, sum, useDash } from './Dashboard'

export default function Visits() {
  const [days, setDays] = useState(30)
  const [metric, setMetric] = useState<'visits' | 'views'>('visits')
  const d = useDash(days)
  if (!d)
    return (
      <>
        <PageHead title="Statystyki" />
        <Spinner />
      </>
    )
  const range = dayRange(d.from)
  const map = new Map(d.visitsByDay.map((x) => [x.day, x]))
  const visits = sum(d.visitsByDay.map((x) => x.visits))
  const views = sum(d.visitsByDay.map((x) => x.views))
  const mobile = d.devices.find((x) => x.k === 'mobile')?.v ?? 0
  return (
    <>
      <PageHead title="Statystyki" desc="Własny, lekki licznik: bez cookies i bez danych osobowych. Wizyta = jedno wejście na stronę w danej karcie przeglądarki.">
        <PeriodSelect value={days} onChange={setDays} />
        <Btn icon="download" onClick={() => downloadCsv(`odwiedziny-${days}dni.csv`, [['Dzień', 'Wizyty', 'Odsłony'], ...range.map((x) => [x, map.get(x)?.visits ?? 0, map.get(x)?.views ?? 0])])}>
          Eksport
        </Btn>
      </PageHead>
      <div className="stats-a">
        <Stat label="Wizyty" value={visits.toLocaleString('pl-PL')} delta={pct(visits, d.visitsPrev.visits)} hint={`vs poprzednie ${days} dni`} />
        <Stat label="Odsłony" value={views.toLocaleString('pl-PL')} delta={pct(views, d.visitsPrev.views)} hint={`vs poprzednie ${days} dni`} />
        <Stat label="Stron na wizytę" value={visits ? (views / visits).toFixed(1).replace('.', ',') : '—'} />
        <Stat label="Z telefonu" value={visits ? `${Math.round((mobile / visits) * 100)}%` : '—'} />
      </div>
      <Card
        title={metric === 'visits' ? 'Wizyty dziennie' : 'Odsłony dziennie'}
        aside={
          <div className="seg">
            <button className={metric === 'visits' ? 'on' : ''} onClick={() => setMetric('visits')}>
              Wizyty
            </button>
            <button className={metric === 'views' ? 'on' : ''} onClick={() => setMetric('views')}>
              Odsłony
            </button>
          </div>
        }
      >
        <TimeChart height={260} days={range} series={[{ name: metric === 'visits' ? 'Wizyty' : 'Odsłony', color: '#1a1a18', values: range.map((x) => map.get(x)?.[metric] ?? 0) }]} />
      </Card>
      <div className="cards2 mt">
        <Card title="Najczęściej oglądane strony">
          <BarList items={d.topPages.map((x) => ({ label: x.path, value: x.views }))} />
        </Card>
        <Card title="Źródła wizyt">
          <BarList items={d.sources.map((x) => ({ label: SOURCE[x.k] ?? x.k, value: x.v }))} />
        </Card>
        <Card title="Urządzenia">
          <BarList items={d.devices.map((x) => ({ label: DEVICE[x.k] ?? x.k, value: x.v }))} />
        </Card>
        <Card title="Język strony (odsłony)">
          <BarList items={d.langs.map((x) => ({ label: x.k === 'pl' ? 'Polski' : 'English', value: x.v }))} />
        </Card>
      </div>
      <p className="hint">Dokładniejszą analizę kampanii (Google Analytics 4, Meta Pixel, TikTok) podłączymy razem z banerem zgód cookies.</p>
    </>
  )
}
