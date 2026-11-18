// Zapisani na newsletter: lista, segmenty, eksport (np. do MailerLite).
import { useEffect, useState } from 'react'
import { db, downloadCsv, fmtDate } from '../api'
import { fail, useStore } from '../store'
import { Badge, Btn, Card, Empty, Icon, PageHead, Spinner, Stat, Tabs, ask } from '../ui'

type Sub = { id: string; created_at: string; email: string; segment: string; locale: string; synced_at: string | null }
const SEG: Record<string, string> = { visitor: 'Odwiedzający', professional: 'Specjaliści beauty', exhibitor: 'Wystawcy' }

export default function Newsletter() {
  const role = useStore((s) => s.me!.role)
  const [rows, setRows] = useState<Sub[] | null>(null)
  const [seg, setSeg] = useState('all')
  const [q, setQ] = useState('')
  useEffect(() => {
    db.from('newsletter_subscribers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000)
      .then(({ data, error }) => (error ? fail(error) : setRows(data as Sub[])))
  }, [])
  const list = (rows ?? []).filter((r) => (seg === 'all' || r.segment === seg) && r.email.includes(q.toLowerCase()))
  const n = (s: string) => (rows ?? []).filter((r) => r.segment === s).length
  const week = (rows ?? []).filter((r) => Date.now() - Date.parse(r.created_at) < 7 * 86400e3).length
  return (
    <>
      <PageHead title="Newsletter" desc="Osoby zapisane przez formularz na stronie, z podziałem na grupy. Każda wyraziła zgodę marketingową przy zapisie.">
        <Btn icon="download" onClick={() => downloadCsv(`newsletter-${seg}.csv`, [['E-mail', 'Grupa', 'Język', 'Data zapisu'], ...list.map((r) => [r.email, SEG[r.segment], r.locale, fmtDate(r.created_at)])])}>
          Eksport do Excela / MailerLite
        </Btn>
      </PageHead>
      <div className="stats-a">
        <Stat label="Wszystkich zapisanych" value={rows?.length ?? '—'} icon="send" hint={`+${week} w ostatnich 7 dniach`} />
        {Object.entries(SEG).map(([k, l]) => (
          <Stat key={k} label={l} value={rows ? n(k) : '—'} />
        ))}
      </div>
      <div className="row row--between row--wrap">
        <Tabs value={seg} onChange={setSeg} items={[{ value: 'all', label: 'Wszyscy' }, ...Object.entries(SEG).map(([value, label]) => ({ value, label }))]} />
        <label className="search">
          <Icon n="search" s={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj e-maila…" />
        </label>
      </div>
      <Card pad={false}>
        {!rows ? (
          <Spinner />
        ) : !list.length ? (
          <Empty icon="send" title="Brak zapisanych osób">
            Formularz zapisu jest na stronie głównej. Lista wypełni się sama.
          </Empty>
        ) : (
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>E-mail</th>
                  <th>Grupa</th>
                  <th style={{ width: 80 }}>Język</th>
                  <th style={{ width: 190 }}>Zapis</th>
                  <th style={{ width: 60 }} />
                </tr>
              </thead>
              <tbody>
                {list.slice(0, 500).map((r) => (
                  <tr key={r.id}>
                    <td className="strong">{r.email}</td>
                    <td>
                      <Badge>{SEG[r.segment]}</Badge>
                    </td>
                    <td>{r.locale.toUpperCase()}</td>
                    <td>{fmtDate(r.created_at)}</td>
                    <td className="tbl__acts">
                      {['admin', 'marketing'].includes(role) && (
                        <Btn
                          small
                          kind="plain"
                          icon="trash"
                          title="Usuń z listy (np. na prośbę osoby)"
                          onClick={async () => {
                            if (!(await ask({ title: `Usunąć ${r.email} z listy?`, yes: 'Usuń', danger: true }))) return
                            const { error } = await db.from('newsletter_subscribers').delete().eq('id', r.id)
                            if (error) return fail(error)
                            setRows((rs) => rs?.filter((x) => x.id !== r.id) ?? null)
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
      {list.length > 500 && <p className="hint">Pokazano 500 najnowszych — eksport zawiera wszystkie {list.length}.</p>}
    </>
  )
}
