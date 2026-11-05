import { Link } from 'react-router-dom'
import { href, t, ui } from '../i18n'
import { EXPERTS, MASTERCLASSES, PARTNERS, POSTS, STATS, TICKETS, ZONES, type Masterclass } from '../content/site'
import { date, price } from '../lib/format'
import { Arrow, Btn, Eyebrow, Img, Reveal, useLocale } from './ui'
import { NewsletterForm } from './forms'
import type { ReactNode } from 'react'

/** Nagłówek podstrony: duże zdjęcie + ogromny tytuł szeryfowy. */
export function PageHero({ title, eyebrow, lead, img, children }: { title: string; eyebrow?: string; lead?: string; img: string; children?: ReactNode }) {
  return (
    <section className="phero">
      <div className="phero__media">
        <Img name={img} eager sizes="100vw" />
      </div>
      <div className="phero__inner wrap">
        {eyebrow && <Eyebrow light>{eyebrow}</Eyebrow>}
        <h1 className="phero__title">{title}</h1>
        {lead && <p className="phero__lead">{lead}</p>}
        {children && <div className="phero__actions">{children}</div>}
      </div>
    </section>
  )
}

export function SectionHead({ eyebrow, title, children, center = false }: { eyebrow?: string; title: ReactNode; children?: ReactNode; center?: boolean }) {
  return (
    <Reveal className={`shead ${center ? 'shead--center' : ''}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="shead__title">{title}</h2>
      {children && <div className="shead__aside">{children}</div>}
    </Reveal>
  )
}

export function TicketCards() {
  const l = useLocale()
  return (
    <div className="tickets">
      {TICKETS.map((tk, i) => (
        <Reveal as="article" key={tk.id} delay={i * 80} className={`ticket ${tk.featured ? 'ticket--featured' : ''} ${tk.dark ? 'ticket--dark' : ''}`}>
          {tk.featured && <span className="ticket__badge">{l === 'pl' ? 'Najczęściej wybierany' : 'Most popular'}</span>}
          <h3 className="ticket__name">{t(tk.name, l)}</h3>
          <p className="ticket__note">{t(tk.note, l)}</p>
          <p className="ticket__price">{price(tk.price, l)}</p>
          <ul className="ticket__perks">
            {tk.perks.map((p) => (
              <li key={p.pl}>{t(p, l)}</li>
            ))}
          </ul>
          <Btn to={`${href(l, 'tickets')}#kup`} variant={tk.dark ? 'light' : 'dark'}>
            {t(ui.buyTicket, l)}
          </Btn>
        </Reveal>
      ))}
    </div>
  )
}

export function ZoneCards() {
  const l = useLocale()
  return (
    <div className="zones">
      {ZONES.map((z, i) => (
        <Reveal key={z.short} delay={i * 60}>
          <Link to={href(l, 'zone', t(z.slug, l))} className="zone">
            <Img name={z.img} className="zone__img" sizes="(max-width: 800px) 70vw, 20vw" alt={t(z.name, l)} />
            <span className="zone__tag">( {z.short} )</span>
            <span className="zone__arrow">
              <Arrow />
            </span>
            <span className="zone__name">{t(z.name, l)}</span>
          </Link>
        </Reveal>
      ))}
    </div>
  )
}

export function SeatsBar({ m }: { m: Masterclass }) {
  const l = useLocale()
  const pct = Math.round(((m.seats - m.left) / m.seats) * 100)
  return (
    <div className={`seats ${m.left === 0 ? 'seats--out' : m.left <= 5 ? 'seats--low' : ''}`}>
      <div className="seats__bar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="seats__txt">{m.left === 0 ? t(ui.soldOut, l) : `${t(ui.seatsLeft, l)}: ${m.left} / ${m.seats}`}</span>
    </div>
  )
}

export function MasterclassList() {
  const l = useLocale()
  return (
    <div className="mcs">
      {MASTERCLASSES.map((m, i) => (
        <Reveal as="article" key={m.id} delay={i * 80} className="mc">
          <div className="mc__media">
            <Img name={m.img} sizes="(max-width: 800px) 100vw, 33vw" />
            <span className="mc__when">
              {t(m.day, l)} · {m.time}
            </span>
          </div>
          <div className="mc__body">
            <h3 className="mc__title">{t(m.title, l)}</h3>
            <p className="mc__host">{m.host}</p>
            <SeatsBar m={m} />
            <div className="mc__foot">
              <span className="mc__price">{price(m.price, l)}</span>
              {m.left > 0 ? (
                <Btn to={`${href(l, 'tickets')}#kup`} variant="outline">
                  {l === 'pl' ? 'Zapisz się' : 'Book'}
                </Btn>
              ) : (
                <span className="mc__out">{t(ui.soldOut, l)}</span>
              )}
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  )
}

export function ExpertsGrid({ limit }: { limit?: number }) {
  const l = useLocale()
  return (
    <div className="experts">
      {EXPERTS.slice(0, limit).map((e, i) => (
        <Reveal as="article" key={e.name} delay={i * 60} className="expert">
          <div className="expert__media">
            <Img name={e.img} sizes="(max-width: 800px) 50vw, 25vw" alt={e.name} />
          </div>
          <h3 className="expert__name">{e.name}</h3>
          <p className="expert__role">{t(e.role, l)}</p>
        </Reveal>
      ))}
    </div>
  )
}

export function LogoWall({ compact = false }: { compact?: boolean }) {
  const l = useLocale()
  return (
    <div className={`logos ${compact ? 'logos--compact' : ''}`}>
      {PARTNERS.map((g, gi) => (
        <div key={g.tier.pl} className={`logos__group logos__group--${gi}`}>
          <p className="logos__tier">{t(g.tier, l)}</p>
          <div className="logos__row">
            {g.names.map((n) => (
              <a key={n} className="logo" href="#" onClick={(e) => e.preventDefault()} aria-label={n}>
                {n}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function NewsCards({ limit = 3 }: { limit?: number }) {
  const l = useLocale()
  return (
    <div className="news">
      {POSTS.slice(0, limit).map((p, i) => (
        <Reveal as="article" key={p.slug} delay={i * 80} className="post-card">
          <Link to={href(l, 'post', p.slug)}>
            <div className="post-card__media">
              <Img name={p.img} sizes="(max-width: 800px) 100vw, 33vw" />
            </div>
            <time className="post-card__date" dateTime={p.date}>
              {date(p.date, l)}
            </time>
            <h3 className="post-card__title">{t(p.title, l)}</h3>
            <p className="post-card__excerpt">{t(p.excerpt, l)}</p>
          </Link>
        </Reveal>
      ))}
    </div>
  )
}

export function NewsletterBlock() {
  const l = useLocale()
  return (
    <section className="nlb">
      <div className="nlb__inner wrap">
        <Reveal className="nlb__copy">
          <Eyebrow>Newsletter</Eyebrow>
          <h2 className="nlb__title">{l === 'pl' ? 'Nie przegap startu sprzedaży' : 'Don’t miss the ticket launch'}</h2>
          <p>
            {l === 'pl'
              ? 'Start sprzedaży, nowi prelegenci i wolne miejsca na masterclass — prosto na Twoją skrzynkę.'
              : 'Ticket launches, new speakers and free masterclass seats — straight to your inbox.'}
          </p>
        </Reveal>
        <Reveal className="nlb__form" delay={100}>
          <NewsletterForm />
        </Reveal>
      </div>
    </section>
  )
}

export function CtaBand() {
  const l = useLocale()
  return (
    <section className="ctab wrap">
      <Reveal className="ctab__card">
        <Img name="portrait-bun" className="ctab__img" sizes="(max-width: 800px) 100vw, 40vw" />
        <div className="ctab__copy">
          <h2>{l === 'pl' ? 'Do zobaczenia w lutym' : 'See you in February'}</h2>
          <p>{l === 'pl' ? 'Wybierz bilet albo zgłoś swoją markę jako wystawca.' : 'Pick a ticket or apply with your brand as an exhibitor.'}</p>
          <div className="btn-row">
            <Btn to={href(l, 'tickets')}>{t(ui.buyTicket, l)}</Btn>
            <Btn to={href(l, 'exhibit')} variant="outline">
              {t(ui.becomeExhibitor, l)}
            </Btn>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

export function StatsRow() {
  const l = useLocale()
  return (
    <section className="stats wrap" aria-label={l === 'pl' ? 'W liczbach' : 'In numbers'}>
      {STATS.map((s, i) => (
        <Reveal key={s.value + i} delay={i * 70} className="stat">
          <span className="stat__v">{s.value}</span>
          <span className="stat__l">{t(s.label, l)}</span>
        </Reveal>
      ))}
    </section>
  )
}
