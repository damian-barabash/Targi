import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { href, t, ui } from '../i18n'
import { EXPERTS, MASTERCLASSES, PARTNERS, POSTS, STATS, TICKETS, ZONES, type Masterclass } from '../content/site'
import { date, price } from '../lib/format'
import { Btn, Img, More, Reveal, useLocale } from './ui'
import { NewsletterForm } from './forms'

/** Nagłówek podstrony: duży tytuł groteskiem + szerokie zdjęcie pod spodem. */
export function PageHero({ title, eyebrow, lead, img, children }: { title: string; eyebrow?: string; lead?: string; img?: string; children?: ReactNode }) {
  return (
    <section className="phero">
      <div className="phero__head wrap">
        <h1 className="phero__title">{title}</h1>
        <div className="phero__side">
          {eyebrow && <p className="kicker">{eyebrow}</p>}
          {lead && <p className="phero__lead">{lead}</p>}
          {children && <div className="phero__actions">{children}</div>}
        </div>
      </div>
      {img && (
        <div className="phero__media wrap">
          <Img name={img} eager sizes="100vw" />
        </div>
      )}
    </section>
  )
}

/** Nagłówek sekcji w duchu brutalizmu: ogromny tytuł na całą szerokość. */
export function SectionHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  const size = title.length > 14 ? 'mega mega--md' : 'mega'
  return (
    <Reveal className="shead">
      <h2 className={size}>{title}</h2>
      <div className="shead__row">
        {eyebrow ? <p className="kicker">{eyebrow}</p> : <span />}
        {children && <div className="shead__aside">{children}</div>}
      </div>
    </Reveal>
  )
}

export function TicketCards() {
  const l = useLocale()
  return (
    <div className="tickets">
      {TICKETS.map((tk, i) => (
        <Reveal as="article" key={tk.id} delay={i * 60} className={`ticket ${tk.featured ? 'ticket--featured' : ''}`}>
          <div className="ticket__top">
            <h3 className="ticket__name">{t(tk.name, l)}</h3>
            {tk.featured && <span className="tag">{l === 'pl' ? 'Najczęściej wybierany' : 'Most popular'}</span>}
          </div>
          <p className="ticket__note">{t(tk.note, l)}</p>
          <p className="ticket__price">{price(tk.price, l)}</p>
          <ul className="ticket__perks">
            {tk.perks.map((p) => (
              <li key={p.pl}>{t(p, l)}</li>
            ))}
          </ul>
          <Btn to={`${href(l, 'tickets')}?t=${tk.id}#kup`} variant={tk.featured ? 'gold' : 'outline'}>
            {t(ui.buyTicket, l)}
          </Btn>
        </Reveal>
      ))}
    </div>
  )
}

/** Siatka produktowa z referencji: zdjęcie + podpis. */
export function ZoneCards() {
  const l = useLocale()
  return (
    <div className="grid5">
      {ZONES.map((z, i) => (
        <Reveal key={z.short} delay={i * 50}>
          <Link to={href(l, 'zone', t(z.slug, l))} className="tile">
            <div className="tile__media">
              <Img name={z.img} sizes="(max-width: 800px) 50vw, 20vw" alt={t(z.name, l)} />
            </div>
            <div className="tile__cap tile__cap--stack">
              <span className="tile__name">{t(z.name, l)}</span>
              <span className="tile__meta">powered by {z.partner}</span>
            </div>
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
      <span className="seats__txt">{m.left === 0 ? t(ui.soldOut, l) : `${t(ui.seatsLeft, l)}: ${m.left}/${m.seats}`}</span>
    </div>
  )
}

export function MasterclassList() {
  const l = useLocale()
  return (
    <div className="grid3">
      {MASTERCLASSES.map((m, i) => (
        <Reveal as="article" key={m.id} delay={i * 60} className="mc">
          <div className="tile__media tile__media--wide">
            <Img name={m.img} sizes="(max-width: 800px) 100vw, 33vw" />
          </div>
          <p className="mc__when">
            {t(m.day, l)} · {m.time}
          </p>
          <h3 className="h3">{t(m.title, l)}</h3>
          <p className="mc__host">{m.host}</p>
          <SeatsBar m={m} />
          <div className="mc__foot">
            <span className="mc__price">{price(m.price, l)}</span>
            {m.left > 0 ? (
              <More to={`${href(l, 'tickets')}#kup`}>{l === 'pl' ? 'Zapisz się' : 'Book'}</More>
            ) : (
              <span className="muted">{t(ui.soldOut, l)}</span>
            )}
          </div>
        </Reveal>
      ))}
    </div>
  )
}

export function ExpertsGrid({ limit }: { limit?: number }) {
  const l = useLocale()
  return (
    <div className="grid4">
      {EXPERTS.slice(0, limit).map((e, i) => (
        <Reveal as="article" key={e.name} delay={i * 50} className="tile">
          <div className="tile__media tile__media--tall">
            <Img name={e.img} sizes="(max-width: 800px) 50vw, 25vw" alt={e.name} />
          </div>
          <div className="tile__cap tile__cap--stack">
            <span className="tile__name">{e.name}</span>
            <span className="tile__meta">{t(e.role, l)}</span>
          </div>
        </Reveal>
      ))}
    </div>
  )
}

export function LogoWall({ compact = false }: { compact?: boolean }) {
  const l = useLocale()
  const groups = compact ? PARTNERS.slice(0, 3) : PARTNERS
  return (
    <div className="logos">
      {groups.map((g) => (
        <div key={g.tier.pl} className="logos__group">
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
    <div className="grid3">
      {POSTS.slice(0, limit).map((p, i) => (
        <Reveal as="article" key={p.slug} delay={i * 60} className="tile">
          <Link to={href(l, 'post', p.slug)}>
            <div className="tile__media tile__media--wide">
              <Img name={p.img} sizes="(max-width: 800px) 100vw, 33vw" />
            </div>
            <p className="post__date">{date(p.date, l)}</p>
            <h3 className="h3">{t(p.title, l)}</h3>
            <p className="post__excerpt">{t(p.excerpt, l)}</p>
          </Link>
        </Reveal>
      ))}
    </div>
  )
}

export function NewsletterBlock() {
  const l = useLocale()
  return (
    <section className="nlb wrap">
      <Reveal className="nlb__copy">
        <p className="kicker">Newsletter</p>
        <h2 className="h2">{l === 'pl' ? 'Nie przegap startu sprzedaży' : 'Don’t miss the ticket launch'}</h2>
        <p className="muted">{l === 'pl' ? 'Bilety, nowi prelegenci i wolne miejsca na masterclass.' : 'Tickets, new speakers and free masterclass seats.'}</p>
      </Reveal>
      <Reveal className="nlb__form" delay={80}>
        <NewsletterForm />
      </Reveal>
    </section>
  )
}

export function CtaBand() {
  const l = useLocale()
  return (
    <section className="band">
      <Reveal className="band__inner wrap">
        <p className="kicker">{l === 'pl' ? '19–20 lutego 2028' : '19–20 February 2028'}</p>
        <p className="band__text">{l === 'pl' ? 'Do zobaczenia w ZEN.COM Expo.' : 'See you at ZEN.COM Expo.'}</p>
        <div className="btn-row btn-row--center">
          <Btn to={href(l, 'tickets')} variant="light">
            {t(ui.buyTicket, l)}
          </Btn>
          <Btn to={href(l, 'exhibit')} variant="outline">
            {t(ui.becomeExhibitor, l)}
          </Btn>
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
        <Reveal key={s.value + i} delay={i * 50} className="stat">
          <span className="stat__v">{s.value}</span>
          <span className="stat__l">{t(s.label, l)}</span>
        </Reveal>
      ))}
    </section>
  )
}
