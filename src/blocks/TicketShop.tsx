// Konfigurator biletu + koszyk (na razie tylko front — płatność i bilety QR dojdą z backendem).
// Rodzaje biletów, ceny, dni i catering pochodzą z treści (panel → Bilety).
import { useEffect, useMemo, useState } from 'react'
import { t, ui } from '../i18n'
import { S } from '../content/site'
import { price } from '../lib/format'
import { useLocale } from '../components/ui'
import { SeatsBar, type BP } from './blocks'
import { E } from './edit'

/** Pozycja w koszyku. Na razie tylko front — płatność i bilety QR podepniemy do backendu później. */
type CartLine = {
  key: string
  ticket: string // id z TICKETS lub `mc-<id>`
  day?: string // dla biletu jednodniowego
  catering: boolean
  qty: number
  unit: number // cena za 1 szt. z dodatkami
}

const CART_KEY = 'bhe-cart-v1'

function loadCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? (JSON.parse(raw) as CartLine[]) : []
  } catch {
    return []
  }
}

export default function TicketShop({ at, p }: BP) {
  const l = useLocale()
  const pl = l === 'pl'
  const TICKETS = S.tickets.filter((x) => x.active !== false)
  const { ticketDays: TICKET_DAYS, catering: CATERING, masterclasses: MASTERCLASSES } = S

  // konfigurator
  const [type, setType] = useState(() => S.tickets.find((x) => x.active !== false)?.id ?? '')
  const [day, setDay] = useState(() => S.ticketDays[0]?.id ?? '')
  const [catering, setCatering] = useState(false)
  const [qty, setQty] = useState(1)
  // koszyk
  const [cart, setCart] = useState<CartLine[]>([])
  const [ready, setReady] = useState(false)
  const [notice, setNotice] = useState(false)

  useEffect(() => {
    setCart(loadCart())
    setReady(true)
    // ?t=day|weekend|vip — wybór z karty biletu na stronie głównej
    const pre = new URLSearchParams(window.location.search).get('t')
    if (pre && TICKETS.some((x) => x.id === pre)) setType(pre)
  }, [])
  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart))
    } catch {
      /* tryb prywatny — koszyk działa bez zapisu */
    }
  }, [cart, ready])

  const tk = TICKETS.find((x) => x.id === type) ?? TICKETS[0]
  const days = tk?.days ?? 1
  const pickDay = days === 1 && TICKET_DAYS.length > 1
  const cateringIncluded = Boolean(tk?.cateringIncluded)
  const unit = (tk?.price ?? 0) + (catering && !cateringIncluded ? CATERING.pricePerDay * days : 0)

  const lineName = (x: CartLine) => {
    if (x.ticket.startsWith('mc-')) {
      const m = MASTERCLASSES.find((mm) => `mc-${mm.id}` === x.ticket)
      return m ? `Masterclass: ${t(m.title, l)}` : x.ticket
    }
    const tt = TICKETS.find((y) => y.id === x.ticket)
    const d = x.day ? TICKET_DAYS.find((dd) => dd.id === x.day) : undefined
    const parts = [tt ? t(tt.name, l) : x.ticket]
    if (d) parts.push(`${t(d.label, l)} ${d.date}`)
    if (tt?.cateringIncluded) parts.push(pl ? 'catering w cenie' : 'catering included')
    else parts.push(x.catering ? (pl ? 'z cateringiem' : 'with catering') : pl ? 'bez cateringu' : 'no catering')
    return parts.join(' · ')
  }

  function add(line: Omit<CartLine, 'key'>) {
    const key = [line.ticket, line.day ?? '', line.catering ? 'c' : 'n'].join('|')
    setCart((c) => {
      const ex = c.find((x) => x.key === key)
      if (ex) return c.map((x) => (x.key === key ? { ...x, qty: Math.min(20, x.qty + line.qty) } : x))
      return [...c, { ...line, key }]
    })
  }
  const setLineQty = (key: string, v: number) =>
    setCart((c) => (v <= 0 ? c.filter((x) => x.key !== key) : c.map((x) => (x.key === key ? { ...x, qty: Math.min(20, v) } : x))))

  const total = useMemo(() => cart.reduce((s, x) => s + x.qty * x.unit, 0), [cart])
  const count = cart.reduce((s, x) => s + x.qty, 0)

  if (!tk) return null

  return (
    <section className="sec wrap" id="kup">
      <div className="buy">
        {/* KONFIGURATOR */}
        <div className="cfg">
          <div className="cfg__step">
            <p className="cfg__k">1 · {pl ? 'Rodzaj biletu' : 'Ticket type'}</p>
            <div className="cfg__opts cfg__opts--3" role="radiogroup">
              {TICKETS.map((x) => (
                <button key={x.id} type="button" role="radio" aria-checked={type === x.id} className={`opt ${type === x.id ? 'opt--on' : ''}`} onClick={() => setType(x.id)}>
                  <span className="opt__name">{t(x.name, l)}</span>
                  <span className="opt__note">{t(x.note, l)}</span>
                  <span className="opt__price">{price(x.price, l)}</span>
                </button>
              ))}
            </div>
          </div>

          {pickDay && (
            <div className="cfg__step">
              <p className="cfg__k">2 · {pl ? 'Dzień' : 'Day'}</p>
              <div className="cfg__opts" role="radiogroup">
                {TICKET_DAYS.map((d) => (
                  <button key={d.id} type="button" role="radio" aria-checked={day === d.id} className={`opt ${day === d.id ? 'opt--on' : ''}`} onClick={() => setDay(d.id)}>
                    <span className="opt__name">{t(d.label, l)}</span>
                    <span className="opt__note">{d.date}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="cfg__step">
            <p className="cfg__k">
              {pickDay ? 3 : 2} · {t(CATERING.name, l)}
            </p>
            {cateringIncluded ? (
              <p className="cfg__info">{pl ? 'W tym bilecie catering jest w cenie.' : 'Catering is included in this ticket.'}</p>
            ) : (
              <div className="cfg__opts" role="radiogroup">
                <button type="button" role="radio" aria-checked={!catering} className={`opt ${!catering ? 'opt--on' : ''}`} onClick={() => setCatering(false)}>
                  <span className="opt__name">{pl ? 'Bez cateringu' : 'No catering'}</span>
                  <span className="opt__note">{pl ? 'tylko wstęp' : 'entry only'}</span>
                  <span className="opt__price">+{price(0, l)}</span>
                </button>
                <button type="button" role="radio" aria-checked={catering} className={`opt ${catering ? 'opt--on' : ''}`} onClick={() => setCatering(true)}>
                  <span className="opt__name">{pl ? 'Z cateringiem' : 'With catering'}</span>
                  <span className="opt__note">{t(CATERING.desc, l)}</span>
                  <span className="opt__price">
                    +{price(CATERING.pricePerDay * days, l)}
                    {days > 1 && <small> ({price(CATERING.pricePerDay, l)} × {days})</small>}
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="cfg__step cfg__add">
            <div>
              <p className="cfg__k">
                {pickDay ? 4 : 3} · {pl ? 'Liczba biletów' : 'Quantity'}
              </p>
              <div className="qty" role="group" aria-label={pl ? 'Liczba biletów' : 'Quantity'}>
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="−">
                  −
                </button>
                <output aria-live="polite">{qty}</output>
                <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="+">
                  +
                </button>
              </div>
            </div>
            <div className="cfg__sum">
              <span className="cfg__sum-v">{price(unit * qty, l)}</span>
              <button
                type="button"
                className="btn btn--lg"
                onClick={() => add({ ticket: type, day: pickDay ? day : undefined, catering: cateringIncluded ? true : catering, qty, unit })}
              >
                <span>{pl ? 'Dodaj do koszyka' : 'Add to basket'}</span>
              </button>
            </div>
          </div>

          {/* Masterclass — osobne bilety z limitem miejsc */}
          <div className="cfg__step">
            <p className="cfg__k">{pl ? 'Masterclass — osobne bilety, limit miejsc' : 'Masterclass — separate tickets, limited seats'}</p>
            {MASTERCLASSES.map((m) => (
              <div key={m.id} className="line">
                <div className="line__info">
                  <p className="line__name">{t(m.title, l)}</p>
                  <p className="line__price">
                    {t(m.day, l)} · {m.time} · {price(m.price, l)}
                  </p>
                  <SeatsBar m={m} />
                </div>
                {m.left > 0 ? (
                  <button type="button" className="btn btn--outline" onClick={() => add({ ticket: `mc-${m.id}`, catering: false, qty: 1, unit: m.price })}>
                    <span>{pl ? 'Dodaj' : 'Add'}</span>
                  </button>
                ) : (
                  <span className="muted">{t(ui.soldOut, l)}</span>
                )}
              </div>
            ))}
          </div>

          <p className="buy__group">
            <E at={`${at}.groupNote`} /> <a href={`mailto:${S.event.emails.bilety}`}>{S.event.emails.bilety}</a>
          </p>
        </div>

        {/* KOSZYK */}
        <aside className="buy__sum">
          <div className="sum">
            <p className="sum__k">
              {pl ? 'Koszyk' : 'Basket'} {count > 0 && `· ${count}`}
            </p>
            <ul className="sum__lines">
              {cart.map((x) => (
                <li key={x.key} className="sum__line">
                  <span className="sum__name">{lineName(x)}</span>
                  <span className="sum__row">
                    <span className="qty qty--sm">
                      <button type="button" onClick={() => setLineQty(x.key, x.qty - 1)} aria-label="−">
                        −
                      </button>
                      <output>{x.qty}</output>
                      <button type="button" onClick={() => setLineQty(x.key, x.qty + 1)} aria-label="+">
                        +
                      </button>
                    </span>
                    <span>{price(x.qty * x.unit, l)}</span>
                  </span>
                </li>
              ))}
              {!cart.length && <li className="sum__empty">{pl ? 'Koszyk jest pusty — skonfiguruj bilet obok.' : 'Your basket is empty — configure a ticket.'}</li>}
            </ul>
            <label className="field sum__promo">
              <span className="field__label">{pl ? 'Kod rabatowy' : 'Promo code'}</span>
              <input name="promo" placeholder={l === "pl" ? "Kod rabatowy" : "Promo code"} />
            </label>
            <p className="sum__total">
              <span>{pl ? 'Razem' : 'Total'}</span>
              <strong>{price(total, l)}</strong>
            </p>
            <button className="btn btn--gold sum__pay" type="button" disabled={!count} onClick={() => setNotice(true)}>
              <span>{pl ? 'Przejdź do płatności' : 'Go to payment'}</span>
            </button>
            {notice && (
              <p className="sum__notice" role="status">
                {t(p.payNotice, l)}
              </p>
            )}
            <p className="sum__pay-methods">BLIK · Visa · Mastercard · Apple Pay · Google Pay</p>
          </div>
        </aside>
      </div>
    </section>
  )
}
