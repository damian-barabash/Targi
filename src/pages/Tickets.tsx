import { useEffect, useMemo, useState } from 'react'
import { t, ui } from '../i18n'
import { CATERING, FAQ, MASTERCLASSES, TICKETS, TICKET_DAYS } from '../content/site'
import { price } from '../lib/format'
import { AdSlot, Eyebrow, Reveal, Seo, useLocale } from '../components/ui'
import { PageHero, SectionHead, SeatsBar } from '../components/sections'

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

export default function Tickets() {
  const l = useLocale()
  const pl = l === 'pl'

  // konfigurator
  const [type, setType] = useState('day')
  const [day, setDay] = useState('sat')
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

  const tk = TICKETS.find((x) => x.id === type)!
  const days = type === 'day' ? 1 : 2
  const cateringIncluded = type === 'vip'
  const unit = tk.price + (catering && !cateringIncluded ? CATERING.pricePerDay * days : 0)

  const lineName = (x: CartLine) => {
    if (x.ticket.startsWith('mc-')) {
      const m = MASTERCLASSES.find((mm) => `mc-${mm.id}` === x.ticket)
      return m ? `Masterclass: ${t(m.title, l)}` : x.ticket
    }
    const tt = TICKETS.find((y) => y.id === x.ticket)
    const d = x.day ? TICKET_DAYS.find((dd) => dd.id === x.day) : undefined
    const parts = [tt ? t(tt.name, l) : x.ticket]
    if (d) parts.push(`${t(d.label, l)} ${d.date}`)
    if (x.ticket === 'vip') parts.push(pl ? 'catering w cenie' : 'catering included')
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

  return (
    <>
      <Seo
        title={pl ? 'Bilety' : 'Tickets'}
        description={pl ? 'Bilet jednodniowy lub dwudniowy, z cateringiem lub bez. VIP i masterclass. E-bilet z kodem QR — Beauty & Hair Expo Rzeszów 2028.' : 'One-day or two-day ticket, with or without catering. VIP and masterclasses. E-ticket with a QR code — Beauty & Hair Expo Rzeszów 2028.'}
      />
      <PageHero
        eyebrow={pl ? 'Bilety · 19–20.02.2028' : 'Tickets · 19–20.02.2028'}
        title={pl ? 'Bilety' : 'Tickets'}
        lead={pl ? 'Wybierz bilet jednodniowy lub dwudniowy, dodaj catering i zapłać online. Bilet z kodem QR przyjdzie na e-mail.' : 'Choose a one-day or two-day ticket, add catering and pay online. Your QR ticket arrives by e-mail.'}
      />

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

            {type === 'day' && (
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
                {type === 'day' ? 3 : 2} · {t(CATERING.name, l)}
              </p>
              {cateringIncluded ? (
                <p className="cfg__info">{pl ? 'W bilecie VIP catering jest w cenie na oba dni.' : 'Catering is included in the VIP ticket on both days.'}</p>
              ) : (
                <div className="cfg__opts" role="radiogroup">
                  <button type="button" role="radio" aria-checked={!catering} className={`opt ${!catering ? 'opt--on' : ''}`} onClick={() => setCatering(false)}>
                    <span className="opt__name">{pl ? 'Bez cateringu' : 'No catering'}</span>
                    <span className="opt__note">{pl ? 'tylko wstęp' : 'entry only'}</span>
                    <span className="opt__price">+0 zł</span>
                  </button>
                  <button type="button" role="radio" aria-checked={catering} className={`opt ${catering ? 'opt--on' : ''}`} onClick={() => setCatering(true)}>
                    <span className="opt__name">{pl ? 'Z cateringiem' : 'With catering'}</span>
                    <span className="opt__note">{t(CATERING.desc, l)}</span>
                    <span className="opt__price">
                      +{price(CATERING.pricePerDay * days, l)}
                      {days > 1 && <small> ({price(CATERING.pricePerDay, l)} × 2)</small>}
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="cfg__step cfg__add">
              <div>
                <p className="cfg__k">
                  {type === 'day' ? 4 : 3} · {pl ? 'Liczba biletów' : 'Quantity'}
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
                  onClick={() => add({ ticket: type, day: type === 'day' ? day : undefined, catering: cateringIncluded ? true : catering, qty, unit })}
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
              {pl ? 'Grupa powyżej 10 osób? Napisz na ' : 'A group of more than 10? E-mail '}
              <a href="mailto:bilety@targibeautyhair.pl">bilety@targibeautyhair.pl</a>
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
                <input name="promo" placeholder="BEAUTY28" />
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
                  {pl ? 'Podgląd: płatność online (BLIK, karta, Apple Pay, Google Pay) podłączymy w następnym etapie.' : 'Preview: online payment (BLIK, card, Apple Pay, Google Pay) will be connected in the next stage.'}
                </p>
              )}
              <p className="sum__pay-methods">BLIK · Visa · Mastercard · Apple Pay · Google Pay</p>
            </div>
          </aside>
        </div>
      </section>

      <div className="wrap">
        <AdSlot id="tickets" label={t(ui.ad, l)} img="zone-cosmetology" />
      </div>

      <section className="sec wrap faq">
        <SectionHead eyebrow={pl ? 'Najczęstsze pytania' : 'Frequently asked'} title="FAQ" />
        <div className="faq__list">
          {FAQ.map((f) => (
            <details key={f.q.pl} className="faq__item">
              <summary>{t(f.q, l)}</summary>
              <p>{t(f.a, l)}</p>
            </details>
          ))}
        </div>
        <Reveal className="faq__note">
          <Eyebrow>{pl ? 'Wejściówki' : 'Invitations'}</Eyebrow>
          <p>
            {pl
              ? 'Goście, media i partnerzy otrzymują bezpłatne wejściówki z indywidualnym kodem QR od organizatora.'
              : 'Guests, media and partners receive free invitations with a personal QR code from the organiser.'}
          </p>
        </Reveal>
      </section>
    </>
  )
}
