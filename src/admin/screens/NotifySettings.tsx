// Ustawienia → Powiadomienia e-mail: kto dostaje wiadomość o sprzedaży, zgłoszeniach i zapisach; e-mail powitalny; testy.
import { useEffect, useState } from 'react'
import { db, fn } from '../api'
import { fail, toast, useStore } from '../store'
import { Btn, Card, Empty, Icon, PageHead, Spinner } from '../ui'

type N = { ticket: string[]; lead: string[]; newsletter: string[]; welcome: boolean; replyTo: string }
const EV: { k: 'ticket' | 'lead' | 'newsletter'; title: string; desc: string; icon: string }[] = [
  { k: 'ticket', title: 'Sprzedaż biletów', desc: 'Każde nowe zamówienie i wystawione zaproszenie.', icon: 'ticket' },
  { k: 'lead', title: 'Nowe zgłoszenia z formularzy', desc: 'Wystawcy, partnerzy, media i formularz kontaktowy. Odpowiedź z poczty trafi wprost do osoby, która napisała.', icon: 'inbox' },
  { k: 'newsletter', title: 'Zapisy na newsletter', desc: 'Nowa osoba na liście (i wypis jednym kliknięciem).', icon: 'send' },
]
const valid = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)

function Emails({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [v, setV] = useState('')
  const add = () => {
    const items = v.split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)
    const bad = items.filter((x) => !valid(x))
    if (bad.length) return toast(`Nieprawidłowy adres: ${bad[0]}`, 'err')
    onChange([...new Set([...value, ...items])])
    setV('')
  }
  return (
    <div className="emails">
      {value.map((e) => (
        <span key={e} className="emails__chip">
          {e}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== e))} aria-label={`Usuń ${e}`}>
            ×
          </button>
        </span>
      ))}
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (['Enter', ',', ' '].includes(e.key)) {
            e.preventDefault()
            if (v.trim()) add()
          }
          if (e.key === 'Backspace' && !v && value.length) onChange(value.slice(0, -1))
        }}
        onBlur={() => v.trim() && add()}
        placeholder={value.length ? 'Dodaj kolejny adres…' : 'np. biuro@ohtargi.pl, Enter'}
        type="email"
      />
    </div>
  )
}

export default function NotifySettings() {
  const me = useStore((s) => s.me!)
  const [n, setN] = useState<N | null>(null)
  const [saved, setSaved] = useState<string>('')
  const [busy, setBusy] = useState('')
  useEffect(() => {
    db.from('app_settings')
      .select('value')
      .eq('key', 'notify')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return fail(error)
        const v = { ticket: [], lead: [], newsletter: [], welcome: true, replyTo: 'kontakt@ohtargi.pl', ...(data?.value ?? {}) } as N
        setN(v)
        setSaved(JSON.stringify(v))
      })
  }, [])
  if (me.role !== 'admin') return <Empty icon="shield" title="Tylko administrator ustawia powiadomienia" />
  if (!n) return <Spinner />
  const dirty = JSON.stringify(n) !== saved

  async function save() {
    setBusy('save')
    const { error } = await db.from('app_settings').upsert({ key: 'notify', value: n, updated_at: new Date().toISOString(), updated_by: me.id })
    setBusy('')
    if (error) return fail(error)
    setSaved(JSON.stringify(n))
    toast('Ustawienia powiadomień zapisane')
  }
  async function test(which: string[]) {
    setBusy(which.join())
    try {
      const r = await fn<Record<string, string>>('tickets', { action: 'test', which })
      toast(`Wysłano na ${r.to}. Sprawdź skrzynkę (także folder Oferty / Spam).`)
    } catch (e) {
      fail(e)
    }
    setBusy('')
  }

  return (
    <>
      <PageHead title="Powiadomienia e-mail" desc="Kto z zespołu dostaje wiadomość, gdy coś się dzieje na stronie. Wiadomości wychodzą z adresów @ohtargi.pl.">
        <Btn kind="primary" icon="check" busy={busy === 'save'} disabled={!dirty} onClick={save}>
          Zapisz
        </Btn>
      </PageHead>
      <div className="nset">
        {EV.map((e) => (
          <Card key={e.k}>
            <div className="nset__h">
              <span className="nset__ic">
                <Icon n={e.icon} s={18} />
              </span>
              <div>
                <strong>{e.title}</strong>
                <p className="muted-t">{e.desc}</p>
              </div>
            </div>
            <Emails value={n[e.k]} onChange={(v) => setN({ ...n, [e.k]: v })} />
            {!n[e.k].length && <p className="nset__off">Wyłączone: nikt nie dostanie tej wiadomości.</p>}
          </Card>
        ))}
        <Card>
          <div className="nset__h">
            <span className="nset__ic">
              <Icon n="mail" s={18} />
            </span>
            <div>
              <strong>Wiadomości do gości</strong>
              <p className="muted-t">Kupujący zawsze dostaje e-mail z biletami (PDF + kody QR). Tu ustawiasz powitanie dla nowych zapisanych i adres do odpowiedzi.</p>
            </div>
          </div>
          <label className="row" style={{ cursor: 'pointer', margin: '6px 0 14px' }}>
            <input type="checkbox" checked={n.welcome} onChange={(e) => setN({ ...n, welcome: e.target.checked })} />
            <span>Wysyłaj e-mail powitalny po zapisie na newsletter</span>
          </label>
          <label className="ff__l">Odpowiedzi od gości trafiają na adres</label>
          <input className="in" type="email" value={n.replyTo} onChange={(e) => setN({ ...n, replyTo: e.target.value })} />
        </Card>
        <Card title="Podgląd wiadomości">
          <p className="muted-t" style={{ marginBottom: 12 }}>
            Wyślij przykładowe e-maile na swój adres ({me.email}), żeby zobaczyć, jak wyglądają.
          </p>
          <div className="row row--wrap">
            <Btn icon="ticket" busy={busy === 'ticket'} onClick={() => test(['ticket'])}>
              Bilet z PDF
            </Btn>
            <Btn icon="send" busy={busy === 'welcome'} onClick={() => test(['welcome'])}>
              Powitanie newslettera
            </Btn>
            <Btn icon="bolt" busy={busy === 'staff'} onClick={() => test(['staff'])}>
              Powiadomienie dla zespołu
            </Btn>
          </div>
        </Card>
      </div>
    </>
  )
}
