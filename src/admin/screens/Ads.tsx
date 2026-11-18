// Reklama: kreacje (banery), miejsca emisji, statystyki wyświetleń i kliknięć.
import { useEffect, useMemo, useState } from 'react'
import { setIn } from '../../lib/path'
import type { Banner } from '../../content/types'
import { db, downloadCsv } from '../api'
import { BANNER_FIELDS } from '../schema'
import { canEdit, fail, mutate, useStore } from '../store'
import { FieldForm, allSlots } from '../fields'
import { thumb } from '../media'
import { Badge, Btn, Card, Empty, Modal, PageHead, Spinner, Stat, Tabs, TimeChart, ask, dayRange } from '../ui'
import { PeriodSelect, sum } from './Dashboard'
import { go } from '../entry'
import { TranslateBtn } from './Collection'

const FORMAT: Record<string, string> = { banner: 'Baner z tłem', wide: 'Szeroki 1200×300', tile: 'Kafel 600×600', bar: 'Pasek partnera' }
const today = () => new Date().toISOString().slice(0, 10)
function state(b: Banner): [string, 'green' | 'gray' | 'amber' | 'red'] {
  if (b.active === false) return ['Wyłączony', 'gray']
  if (b.from && b.from > today()) return ['Zaplanowany', 'amber']
  if (b.to && b.to < today()) return ['Zakończony', 'red']
  return ['Emisja trwa', 'green']
}
type Row = { day: string; banner_id: string; slot: string; impressions: number; clicks: number }

export default function Ads({ sub }: { sub?: string }) {
  const banners = useStore((s) => s.site.banners)
  const site = useStore((s) => s.site)
  const editable = canEdit('banners')
  const [tab, setTab] = useState<'banners' | 'slots' | 'stats'>(sub === 'stats' || sub === 'slots' ? sub : 'banners')
  const open = sub && /^\d+$/.test(sub) ? Number(sub) : null
  const [days, setDays] = useState(30)
  const [rows, setRows] = useState<Row[] | null>(null)
  const write = (next: Banner[]) => mutate((s) => setIn(s, 'banners', next), ['banners'])
  const slots = allSlots(site)

  useEffect(() => {
    setRows(null)
    const from = new Date(Date.now() - (days - 1) * 86400e3).toISOString().slice(0, 10)
    db.from('ad_stats_daily')
      .select('*')
      .gte('day', from)
      .limit(20000)
      .then(({ data, error }) => (error ? fail(error) : setRows(data as Row[])))
  }, [days])

  const per = useMemo(() => {
    const m = new Map<string, { i: number; c: number }>()
    for (const r of rows ?? []) {
      const x = m.get(r.banner_id) ?? { i: 0, c: 0 }
      x.i += r.impressions
      x.c += r.clicks
      m.set(r.banner_id, x)
    }
    return m
  }, [rows])
  const ctr = (i: number, c: number) => (i ? `${((c / i) * 100).toFixed(2).replace('.', ',')}%` : '—')
  const totalI = sum([...per.values()].map((x) => x.i))
  const totalC = sum([...per.values()].map((x) => x.c))
  const range = dayRange(new Date(Date.now() - (days - 1) * 86400e3).toISOString().slice(0, 10))
  const byDay = (k: 'impressions' | 'clicks') => range.map((d) => sum((rows ?? []).filter((r) => r.day === d).map((r) => r[k])))
  const name = (id: string) => banners.find((b) => b.id === id)?.brand ?? `${id} (usunięty)`

  return (
    <>
      <PageHead title="Reklama" desc="Banery partnerów, miejsca emisji na stronie oraz raport wyświetleń i kliknięć dla reklamodawców.">
        {tab === 'stats' && <PeriodSelect value={days} onChange={setDays} />}
        {tab === 'stats' && (
          <Btn
            icon="download"
            onClick={() =>
              downloadCsv(`raport-banery-${days}dni.csv`, [
                ['Baner', 'Marka', 'Wyświetlenia', 'Kliknięcia', 'CTR'],
                ...[...per.entries()].map(([id, x]) => [id, name(id), x.i, x.c, ctr(x.i, x.c)]),
                [],
                ['Dzień', 'Baner', 'Miejsce', 'Wyświetlenia', 'Kliknięcia'],
                ...(rows ?? []).map((r) => [r.day, name(r.banner_id), r.slot, r.impressions, r.clicks]),
              ])
            }
          >
            Raport do Excela
          </Btn>
        )}
        {tab === 'banners' && editable && <TranslateBtn root={banners} base="banners" />}
        {tab === 'banners' && editable && (
          <Btn
            kind="primary"
            icon="plus"
            onClick={() => {
              write([...banners, { id: `b-${Date.now().toString(36)}`, brand: 'Nowy reklamodawca', format: 'banner', style: 'gold', kicker: { pl: '', en: '' }, claim: { pl: 'Hasło reklamowe', en: '' }, cta: { pl: 'Sprawdź', en: 'Discover' }, url: '', slots: [], active: true, weight: 1 }])
              go(`ads/${banners.length}`)
            }}
          >
            Dodaj baner
          </Btn>
        )}
      </PageHead>
      <Tabs value={tab} onChange={(t) => (setTab(t), go(t === 'banners' ? 'ads' : `ads/${t}`))} items={[{ value: 'banners', label: 'Banery', count: banners.length }, { value: 'slots', label: 'Miejsca reklamowe', count: slots.length }, { value: 'stats', label: 'Statystyki' }]} />

      {tab === 'banners' && (
        <Card pad={false}>
          {!banners.length ? (
            <Empty icon="ad" title="Nie ma jeszcze banerów" />
          ) : (
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 56 }} />
                    <th>Marka i hasło</th>
                    <th style={{ width: 150 }}>Format</th>
                    <th>Miejsca</th>
                    <th style={{ width: 170 }}>Emisja</th>
                    <th style={{ width: 120 }}>Stan</th>
                    <th style={{ width: 130 }}>Wyśw. / klik. ({days} dni)</th>
                    <th style={{ width: 90 }} />
                  </tr>
                </thead>
                <tbody>
                  {banners.map((b, i) => {
                    const [l, tone] = state(b)
                    const st = per.get(b.id)
                    return (
                      <tr key={b.id} className="clickable" onClick={() => go(`ads/${i}`)}>
                        <td>{b.img ? <img className="tbl__img" src={thumb(b.img)} alt="" /> : <span className={`tbl__img tbl__img--sw sw--${b.style ?? 'gold'}`} />}</td>
                        <td className="strong">
                          {b.brand}
                          <small className="sub">{b.claim?.pl}</small>
                        </td>
                        <td>{FORMAT[b.format]}</td>
                        <td>{b.slots?.length ? b.slots.join(', ') : <span className="muted-t">nie przypisano</span>}</td>
                        <td>{b.from || b.to ? `${b.from ?? '…'} → ${b.to ?? '…'}` : 'bez terminu'}</td>
                        <td>
                          <Badge tone={tone}>{l}</Badge>
                        </td>
                        <td>{st ? `${st.i} / ${st.c}` : '0 / 0'}</td>
                        <td className="tbl__acts" onClick={(e) => e.stopPropagation()}>
                          {editable && (
                            <>
                              <Btn small kind="plain" icon="copy" title="Duplikuj" onClick={() => write([...banners, { ...structuredClone(b), id: `b-${Date.now().toString(36)}`, brand: `${b.brand} (kopia)` }])} />
                              <Btn small kind="plain" icon="trash" title="Usuń" onClick={async () => (await ask({ title: `Usunąć baner „${b.brand}”?`, text: 'Statystyki tego banera pozostaną w raportach.', yes: 'Usuń', danger: true })) && write(banners.filter((_, j) => j !== i))} />
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'slots' && (
        <Card pad={false}>
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Gdzie na stronie</th>
                  <th>Nazwa miejsca</th>
                  <th>Format</th>
                  <th>Banery w tym miejscu</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((s) => {
                  const here = banners.filter((b) => b.slots?.includes(s.slot))
                  return (
                    <tr key={s.slot}>
                      <td className="strong">{s.where}</td>
                      <td className="mono">{s.slot}</td>
                      <td>{s.format}</td>
                      <td>
                        {here.length ? (
                          here.map((b) => (
                            <Badge key={b.id} tone={state(b)[1]}>
                              {b.brand}
                            </Badge>
                          ))
                        ) : (
                          <span className="muted-t">puste — nic się nie wyświetla</span>
                        )}
                        {here.filter((b) => state(b)[1] === 'green').length > 1 && <small className="sub">rotacja</small>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="hint hint--in">Nowe miejsce dodasz w edytorze strony blokiem „Miejsce reklamowe” lub „Banery partnerów”.</p>
        </Card>
      )}

      {tab === 'stats' &&
        (!rows ? (
          <Spinner />
        ) : (
          <>
            <div className="stats-a">
              <Stat label="Wyświetlenia" value={totalI.toLocaleString('pl-PL')} hint={`ostatnie ${days} dni`} />
              <Stat label="Kliknięcia" value={totalC.toLocaleString('pl-PL')} />
              <Stat label="CTR (klikalność)" value={ctr(totalI, totalC)} />
              <Stat label="Aktywne banery" value={banners.filter((b) => state(b)[1] === 'green').length} />
            </div>
            <div className="cards2">
              <Card title="Wyświetlenia dziennie">
                <TimeChart height={200} days={range} series={[{ name: 'Wyświetlenia', color: '#7d6139', values: byDay('impressions') }]} />
              </Card>
              <Card title="Kliknięcia dziennie">
                <TimeChart height={200} days={range} series={[{ name: 'Kliknięcia', color: '#2a78d6', values: byDay('clicks') }]} />
              </Card>
            </div>
            <Card title="Wyniki banerów" pad={false} className="mt">
              {!per.size ? (
                <Empty icon="chart" title="Brak danych w tym okresie">
                  Licznik działa na opublikowanej stronie — wyświetlenie liczy się, gdy baner jest widoczny na ekranie.
                </Empty>
              ) : (
                <div className="tw">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Baner</th>
                        <th style={{ width: 140 }}>Wyświetlenia</th>
                        <th style={{ width: 120 }}>Kliknięcia</th>
                        <th style={{ width: 100 }}>CTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...per.entries()]
                        .sort((a, b) => b[1].i - a[1].i)
                        .map(([id, x]) => (
                          <tr key={id}>
                            <td className="strong">
                              {name(id)}
                              <small className="sub">{id}</small>
                            </td>
                            <td>{x.i.toLocaleString('pl-PL')}</td>
                            <td>{x.c.toLocaleString('pl-PL')}</td>
                            <td>{ctr(x.i, x.c)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        ))}

      {open !== null && banners[open] && (
        <Modal
          side
          title={banners[open].brand}
          onClose={() => go('ads')}
          footer={
            <>
              <span className="muted-t grow">Zapisz u góry, a potem opublikuj, aby baner pojawił się na stronie.</span>
              <Btn kind="primary" onClick={() => go('ads')}>
                Gotowe
              </Btn>
            </>
          }
        >
          <fieldset disabled={!editable} className="plain">
            <FieldForm fields={BANNER_FIELDS} base={`banners.${open}`} />
          </fieldset>
        </Modal>
      )}
    </>
  )
}
