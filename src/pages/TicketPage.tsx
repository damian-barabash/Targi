// Bilet online (/bilet/?k=KOD): kod QR do pokazania przy wejściu + dane biletu. Strona nieindeksowana.
import { useEffect, useState } from 'react'
import { Head } from 'vite-react-ssg'
import { S } from '../content/site'
import { useLocale } from '../components/ui'
import { rpcPublic } from '../lib/supabase'
import './ticket.css'

type T = { code: string; type: string; holder: string; dates: string[]; catering: boolean; status: 'valid' | 'cancelled'; order: string }
const SITE = 'https://ohtargi.pl'

/** Kod QR rysowany w przeglądarce; biblioteka ładowana tylko na tej stronie (nie w paczce całej witryny). */
function QR({ text }: { text: string }) {
  const [svg, setSvg] = useState<{ d: string; size: number } | null>(null)
  useEffect(() => {
    let on = true
    import('qrcode-generator').then(({ default: qrcode }) => {
      const q = qrcode(0, 'M')
      q.addData(text)
      q.make()
      const n = q.getModuleCount()
      let d = ''
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`
      if (on) setSvg({ d, size: n + 8 })
    })
    return () => {
      on = false
    }
  }, [text])
  if (!svg) return <div className="tk__qr" aria-busy="true" />
  return (
    <svg className="tk__qr" viewBox={`0 0 ${svg.size} ${svg.size}`} shapeRendering="crispEdges" role="img" aria-label="QR">
      <rect width={svg.size} height={svg.size} fill="#fff" />
      <path d={svg.d} fill="#26221f" />
    </svg>
  )
}

export default function TicketPage() {
  const l = useLocale()
  const pl = l === 'pl'
  const [code, setCode] = useState<string | null>(null)
  const [t, setT] = useState<T | null | 'missing' | 'error'>(null)
  useEffect(() => {
    const k = new URLSearchParams(location.search).get('k')
    setCode(k)
    if (!k) return setT('missing')
    rpcPublic<T | null>('ticket_public', { p_code: k })
      .then((r) => setT(r ?? 'missing'))
      .catch(() => setT('error'))
  }, [])
  const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(pl ? 'pl-PL' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <main className="tk">
      <Head>
        <title>{pl ? 'Twój bilet' : 'Your ticket'} · {S.event.brand}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="tk__card">
        <div className="tk__head">
          <p className="tk__mark">Beauty &amp; Hair</p>
          <p className="tk__ed">Expo · {S.event.edition}</p>
        </div>
        {t === null && <p className="tk__msg">{pl ? 'Wczytuję bilet…' : 'Loading ticket…'}</p>}
        {(t === 'missing' || t === 'error') && (
          <p className="tk__msg">
            {t === 'error' ? (pl ? 'Nie udało się wczytać biletu. Sprawdź internet i odśwież stronę.' : 'Could not load the ticket. Check your connection and refresh.') : pl ? 'Nie znaleźliśmy takiego biletu. Otwórz link z e-maila z biletem.' : 'Ticket not found. Please open the link from your ticket e-mail.'}
          </p>
        )}
        {t && typeof t === 'object' && (
          <>
            {t.status !== 'valid' && <p className="tk__off">{pl ? 'Ten bilet został anulowany' : 'This ticket has been cancelled'}</p>}
            <div className={`tk__body ${t.status !== 'valid' ? 'is-off' : ''}`}>
              <div className="tk__qrbox">
                <QR text={`${SITE}/bilet/?k=${t.code}`} />
                <p className="tk__code">{t.code}</p>
              </div>
              <h1 className="tk__type">{t.type}</h1>
              <dl className="tk__dl">
                <dt>{pl ? 'Ważny' : 'Valid'}</dt>
                <dd>
                  {t.dates.map((d) => (
                    <span key={d}>{day(d)}</span>
                  ))}
                </dd>
                <dt>{pl ? 'Godziny' : 'Hours'}</dt>
                <dd>{S.event.hours}</dd>
                <dt>{pl ? 'Miejsce' : 'Venue'}</dt>
                <dd>
                  {S.event.venue}, {S.event.address}
                </dd>
                {t.holder && (
                  <>
                    <dt>{pl ? 'Osoba' : 'Holder'}</dt>
                    <dd>{t.holder}</dd>
                  </>
                )}
                <dt>Catering</dt>
                <dd>{t.catering ? (pl ? 'tak' : 'yes') : pl ? 'nie' : 'no'}</dd>
                <dt>{pl ? 'Zamówienie' : 'Order'}</dt>
                <dd>{t.order}</dd>
              </dl>
              <p className="tk__hint">{pl ? 'Pokaż ten kod przy wejściu. Jasność ekranu ustaw na maksimum.' : 'Show this code at the entrance. Turn your screen brightness up.'}</p>
            </div>
          </>
        )}
        {code && t === 'missing' && <p className="tk__small">{code}</p>}
      </div>
    </main>
  )
}
