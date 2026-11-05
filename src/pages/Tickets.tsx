import { useMemo, useState } from 'react'
import { t } from '../i18n'
import { FAQ, MASTERCLASSES, TICKETS } from '../content/site'
import { price } from '../lib/format'
import { Eyebrow, Reveal, Seo, useLocale } from '../components/ui'
import { PageHero, SectionHead, SeatsBar, TicketCards } from '../components/sections'

type Line = { id: string; name: string; unit: number; max: number }

export default function Tickets() {
  const l = useLocale()
  const pl = l === 'pl'
  const lines: Line[] = useMemo(
    () => [
      ...TICKETS.map((tk) => ({ id: tk.id, name: t(tk.name, l), unit: tk.price, max: 10 })),
      ...MASTERCLASSES.filter((m) => m.left > 0).map((m) => ({ id: `mc-${m.id}`, name: `Masterclass: ${t(m.title, l)}`, unit: m.price, max: Math.min(4, m.left) })),
    ],
    [l],
  )
  const [qty, setQty] = useState<Record<string, number>>({})
  const [notice, setNotice] = useState(false)
  const total = lines.reduce((s, x) => s + (qty[x.id] ?? 0) * x.unit, 0)
  const count = Object.values(qty).reduce((a, b) => a + b, 0)
  const set = (id: string, v: number, max: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(max, v)) }))

  return (
    <>
      <Seo
        title={pl ? 'Bilety' : 'Tickets'}
        description={pl ? 'Bilety jednodniowe, dwudniowe, VIP i masterclass na Beauty & Hair Expo Rzeszów 2028. E-bilet z kodem QR.' : 'One-day, two-day, VIP and masterclass tickets for Beauty & Hair Expo Rzeszów 2028. E-ticket with a QR code.'}
      />
      <PageHero
        img="portrait-bun"
        eyebrow={pl ? 'Bilety · 19–20.02.2028' : 'Tickets · 19–20.02.2028'}
        title={pl ? 'Bilety' : 'Tickets'}
        lead={pl ? 'Kup online w minutę. Bilet z kodem QR przyjdzie na Twój e-mail.' : 'Buy online in a minute. Your QR ticket arrives by e-mail.'}
      />

      <section className="sec wrap">
        <TicketCards />
      </section>

      <section className="sec sec--tint" id="kup">
        <div className="wrap buy">
          <div className="buy__list">
            <SectionHead eyebrow={pl ? 'Koszyk' : 'Basket'} title={pl ? 'Złóż zamówienie' : 'Place your order'} />
            {lines.map((x) => {
              const mc = MASTERCLASSES.find((m) => `mc-${m.id}` === x.id)
              return (
                <Reveal key={x.id} className="line">
                  <div className="line__info">
                    <p className="line__name">{x.name}</p>
                    <p className="line__price">{price(x.unit, l)}</p>
                    {mc && <SeatsBar m={mc} />}
                  </div>
                  <div className="qty" role="group" aria-label={x.name}>
                    <button type="button" onClick={() => set(x.id, (qty[x.id] ?? 0) - 1, x.max)} aria-label="−">
                      −
                    </button>
                    <output aria-live="polite">{qty[x.id] ?? 0}</output>
                    <button type="button" onClick={() => set(x.id, (qty[x.id] ?? 0) + 1, x.max)} aria-label="+">
                      +
                    </button>
                  </div>
                </Reveal>
              )
            })}
            <p className="buy__group">
              {pl ? 'Grupa powyżej 10 osób? Napisz na ' : 'A group of more than 10? E-mail '}
              <a href="mailto:bilety@targibeautyhair.pl">bilety@targibeautyhair.pl</a>
            </p>
          </div>
          <aside className="buy__sum">
            <div className="sum">
              <p className="sum__k">{pl ? 'Podsumowanie' : 'Summary'}</p>
              <ul className="sum__lines">
                {lines
                  .filter((x) => qty[x.id])
                  .map((x) => (
                    <li key={x.id}>
                      <span>
                        {qty[x.id]} × {x.name}
                      </span>
                      <span>{price(qty[x.id] * x.unit, l)}</span>
                    </li>
                  ))}
                {!count && <li className="sum__empty">{pl ? 'Koszyk jest pusty' : 'Your basket is empty'}</li>}
              </ul>
              <label className="field sum__promo">
                <span className="field__label">{pl ? 'Kod rabatowy' : 'Promo code'}</span>
                <input name="promo" placeholder="BEAUTY28" />
              </label>
              <p className="sum__total">
                <span>{pl ? 'Razem' : 'Total'}</span>
                <strong>{price(total, l)}</strong>
              </p>
              <button className="btn btn--dark sum__pay" type="button" disabled={!count} onClick={() => setNotice(true)}>
                <span>{pl ? 'Przejdź do płatności' : 'Go to payment'}</span>
              </button>
              {notice && (
                <p className="sum__notice" role="status">
                  {pl ? 'Sprzedaż ruszy wkrótce — to podgląd koszyka.' : 'Sales open soon — this is a basket preview.'}
                </p>
              )}
              <p className="sum__pay-methods">BLIK · Visa · Mastercard · Apple Pay · Google Pay</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="sec wrap faq">
        <SectionHead eyebrow="FAQ" title={pl ? 'Najczęstsze pytania' : 'Frequently asked'} />
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
