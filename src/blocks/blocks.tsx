// Bloki, z których składają się strony. Każdy blok czyta swoje pola spod ścieżki `at`
// (np. "pages.0.blocks.3.props") — ta sama ścieżka służy do edycji „na miejscu” w panelu.
import { useEffect, useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { t, ui, type Locale } from '../i18n'
import { S } from '../content/site'
import type { Masterclass } from '../content/types'
import { getIn } from '../lib/path'
import { date, price } from '../lib/format'
import { link, pageHref, postHref, zoneHref } from '../lib/link'
import { AdSlot, Arrow, BannerSlot, Btn, Countdown, More, Reveal, useLocale } from '../components/ui'
import { LeadForm, NewsletterForm, leadFields, type LeadKind } from '../components/forms'
import { E, Im, Paras, useEdit } from './edit'
import TicketShop from './TicketShop'

export type BP = { at: string; p: Record<string, any> }

const has = (v: any, l: Locale) => Boolean(v && (typeof v === 'string' ? v : v[l]))

/** Przycisk z treści ({ label, link, variant }). W edycji etykietę zmienia się na miejscu. */
function BtnE({ at, variant = 'dark', className = '' }: { at: string; variant?: string; className?: string }) {
  const l = useLocale()
  const ed = useEdit()
  const v = getIn(S, at)
  if (!has(v?.label, l) && !ed) return null
  const kind = (v?.variant || variant) as 'dark'
  if (ed)
    return (
      <span className={`btn btn--${kind} ${className}`}>
        <E at={`${at}.label`} />
      </span>
    )
  return (
    <Btn to={link(l, v.link)} variant={kind} className={className}>
      {v.label[l]}
    </Btn>
  )
}

function MoreE({ at }: { at: string }) {
  const l = useLocale()
  const ed = useEdit()
  const v = getIn(S, at)
  if (!has(v?.label, l) && !ed) return null
  if (ed)
    return (
      <span className="more">
        <E at={`${at}.label`} />
        <Arrow />
      </span>
    )
  return <More to={link(l, v.link)}>{v.label[l]}</More>
}

/** Nagłówek sekcji w duchu brutalizmu: ogromny tytuł na całą szerokość. */
function Head({ at, p }: BP) {
  const l = useLocale()
  const ed = useEdit()
  const title: string = p.title?.[l] ?? ''
  if (!title && !has(p.eyebrow, l) && !ed) return null
  return (
    <Reveal className="shead">
      <E at={`${at}.title`} as="h2" className={title.length > 14 ? 'mega mega--md' : 'mega'} />
      <div className="shead__row">
        {has(p.eyebrow, l) || ed ? <E at={`${at}.eyebrow`} as="p" className="kicker" /> : <span />}
        {(has(p.text, l) || has(p.more?.label, l) || ed) && (
          <div className="shead__aside">
            <E at={`${at}.text`} as="p" className="muted" />
            <MoreE at={`${at}.more`} />
          </div>
        )}
      </div>
    </Reveal>
  )
}

/** Czas w przeglądarce (na serwerze null) — do okien sprzedaży. */
function useNow() {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => setNow(Date.now()), [])
  return now
}

/* ───────────── Strona główna ───────────── */

function Hero({ at }: BP) {
  const l = useLocale()
  const ev = S.event
  return (
    <section className="hero2">
      <div className="hero2__top wrap">
        <h1 className="hero2__logo">
          {S.settings.logoImg ? <Im at="settings.logoImg" className="hero2__logo-img" eager alt={ev.brand} sizes="90vw" /> : <E at="settings.logoText" />}
          <E at="settings.logoSub" className="hero2__logo-sub" />
          <span className="sr-only">, {t(ev.dates, l)}</span>
        </h1>
        <div className="hero2__bar">
          <p className="hero2__meta">
            <E at="event.dates" />
            <br />
            {ev.venue} · {t(ev.city, l)}
          </p>
          <div className="hero2__cta">
            <BtnE at={`${at}.btn1`} className="btn--lg" />
            <BtnE at={`${at}.btn2`} variant="outline" className="btn--lg" />
          </div>
          <div className="hero2__count">
            <E at={`${at}.countdownLabel`} />
            <br />
            <Countdown labels={{ days: t(ui.days, l), hours: t(ui.hours, l), minutes: t(ui.minutes, l) }} />
          </div>
        </div>
      </div>
    </section>
  )
}

function PhotoStrip({ at }: BP) {
  return (
    <section className="pband pband--short" aria-hidden="true">
      <div className="pband__media">
        <Im at={`${at}.img`} sizes="100vw" wide />
      </div>
    </section>
  )
}

function Ad({ p }: BP) {
  return (
    <div className="wrap ad-wrap">
      <AdSlot slot={p.slot} format={p.format} />
    </div>
  )
}

function Banners({ p }: BP) {
  const l = useLocale()
  return (
    <section className="wrap banners" aria-label={l === 'pl' ? 'Banery partnerów' : 'Partner banners'}>
      {(p.items ?? []).map((x: any) => (
        <BannerSlot key={x.slot} slot={x.slot} wide={x.wide} />
      ))}
    </section>
  )
}

function Tickets({ at, p }: BP) {
  const l = useLocale()
  const now = useNow()
  return (
    <section className="sec wrap" id={p.anchor || undefined}>
      <Head at={at} p={p} />
      <div className="tickets">
        {S.tickets.map((tk, i) => {
          if (tk.active === false) return null
          const soon = now && tk.saleFrom && now < Date.parse(tk.saleFrom)
          const over = now && tk.saleTo && now > Date.parse(tk.saleTo) + 86_400_000
          return (
            <Reveal as="article" key={tk.id} delay={i * 60} className={`ticket ${tk.featured ? 'ticket--featured' : ''}`}>
              <div className="ticket__top">
                <E at={`tickets.${i}.name`} as="h3" className="ticket__name" />
                {tk.featured && <span className="tag">{l === 'pl' ? 'Najczęściej wybierany' : 'Most popular'}</span>}
              </div>
              <E at={`tickets.${i}.note`} as="p" className="ticket__note" />
              <p className="ticket__price">{price(tk.price, l)}</p>
              <ul className="ticket__perks">
                {tk.perks.map((_, j) => (
                  <E key={j} at={`tickets.${i}.perks.${j}`} as="li" />
                ))}
              </ul>
              {soon || over ? (
                <span className="btn btn--outline" aria-disabled="true">
                  <span>{soon ? `${l === 'pl' ? 'Sprzedaż od' : 'On sale from'} ${date(tk.saleFrom!, l)}` : l === 'pl' ? 'Sprzedaż zakończona' : 'Sales closed'}</span>
                </span>
              ) : (
                <Btn to={`${pageHref(l, 'tickets')}?t=${tk.id}#kup`} variant={tk.featured ? 'gold' : 'outline'}>
                  {t(ui.buyTicket, l)}
                </Btn>
              )}
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

function Faces({ at, p }: BP) {
  const l = useLocale()
  return (
    <section className="sec wrap">
      <Head at={at} p={p} />
      <div className="grid4">
        {S.faces.map((f, i) => (
          <Reveal as="article" key={i} delay={i * 60} className="face">
            <div className="tile__media face__media">
              <Im at={`faces.${i}.img`} sizes="(max-width: 700px) 50vw, 25vw" alt={f.name} />
              {p.sample && <span className="ph__label">{l === 'pl' ? 'Zdjęcie przykładowe' : 'Sample photo'}</span>}
            </div>
            <div className="face__cap">
              <E at={`faces.${i}.name`} className="face__name" />
              <E at={`faces.${i}.role`} className="face__role" />
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function Tiles({ at, p }: BP) {
  const l = useLocale()
  return (
    <section className="sec sec--flush wrap">
      <div className="grid4">
        {(p.items ?? []).map((f: any, i: number) => (
          <Reveal key={i} delay={i * 60}>
            <Link to={link(l, f.link) || '#'} className="tile">
              <div className="tile__media tile__media--tall">
                <Im at={`${at}.items.${i}.img`} sizes="(max-width: 800px) 50vw, 25vw" />
              </div>
              <div className="tile__cap">
                <E at={`${at}.items.${i}.name`} className="tile__name" />
                <E at={`${at}.items.${i}.meta`} className="tile__meta" />
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function Split({ at, p }: BP) {
  const copy = (
    <Reveal className="split2__copy" delay={p.reverse ? 80 : 0}>
      <E at={`${at}.kicker`} as="p" className="kicker" />
      <E at={`${at}.title`} as="h2" className="h2" />
      <Paras at={`${at}.text`} className="muted" />
      {p.list?.length > 0 && (
        <ul className="list">
          {p.list.map((_: unknown, i: number) => (
            <E key={i} at={`${at}.list.${i}`} as="li" />
          ))}
        </ul>
      )}
      {p.facts?.length > 0 && (
        <dl className="facts-inline">
          {p.facts.map((_: unknown, i: number) => (
            <div key={i}>
              <E at={`${at}.facts.${i}.k`} as="dt" />
              <E at={`${at}.facts.${i}.v`} as="dd" />
            </div>
          ))}
        </dl>
      )}
      <div className="btn-row">
        <BtnE at={`${at}.btn`} />
        <MoreE at={`${at}.more`} />
      </div>
    </Reveal>
  )
  const media = (
    <Reveal className="split2__media" delay={p.reverse ? 0 : 80}>
      <Im at={`${at}.img`} sizes="(max-width: 800px) 100vw, 55vw" />
    </Reveal>
  )
  return (
    <section className={`split2 ${p.reverse ? 'split2--rev' : ''} wrap`}>
      {p.reverse ? media : copy}
      {p.reverse ? copy : media}
    </section>
  )
}

function Band({ at }: BP) {
  return (
    <section className="band">
      <Reveal className="band__inner wrap">
        <E at={`${at}.kicker`} as="p" className="kicker" />
        <E at={`${at}.text`} as="p" className="band__text" />
        <div className="btn-row btn-row--center">
          <BtnE at={`${at}.btn1`} variant="light" />
          <BtnE at={`${at}.btn2`} variant="outline" />
        </div>
      </Reveal>
    </section>
  )
}

function Stats() {
  const l = useLocale()
  return (
    <section className="stats wrap" aria-label={l === 'pl' ? 'W liczbach' : 'In numbers'}>
      {S.stats.map((_, i) => (
        <Reveal key={i} delay={i * 50} className="stat">
          <E at={`stats.${i}.value`} className="stat__v" />
          <E at={`stats.${i}.label`} className="stat__l" />
        </Reveal>
      ))}
    </section>
  )
}

function Zones({ at, p }: BP) {
  const l = useLocale()
  return (
    <section className="sec wrap">
      <Head at={at} p={p} />
      <div className="grid5">
        {S.zones.map((z, i) => (
          <Reveal key={z.short} delay={i * 50}>
            <Link to={zoneHref(l, z)} className="tile">
              <div className="tile__media">
                <Im at={`zones.${i}.img`} sizes="(max-width: 800px) 50vw, 20vw" alt={t(z.name, l)} />
              </div>
              <div className="tile__cap tile__cap--stack">
                <E at={`zones.${i}.name`} className="tile__name" />
                <span className="tile__meta">powered by {z.partner}</span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export function SeatsBar({ m }: { m: Masterclass }) {
  const l = useLocale()
  const pct = m.seats ? Math.round(((m.seats - m.left) / m.seats) * 100) : 100
  return (
    <div className={`seats ${m.left === 0 ? 'seats--out' : m.left <= 5 ? 'seats--low' : ''}`}>
      <div className="seats__bar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="seats__txt">{m.left === 0 ? t(ui.soldOut, l) : `${t(ui.seatsLeft, l)}: ${m.left}/${m.seats}`}</span>
    </div>
  )
}

function Masterclasses({ at, p }: BP) {
  const l = useLocale()
  const body = (
    <>
      <Head at={at} p={p} />
      <div className="grid3">
        {S.masterclasses.map((m, i) => (
          <Reveal as="article" key={m.id} delay={i * 60} className="mc">
            <div className="tile__media tile__media--wide">
              <Im at={`masterclasses.${i}.img`} sizes="(max-width: 800px) 100vw, 33vw" />
            </div>
            <p className="mc__when">
              {t(m.day, l)} · {m.time}
            </p>
            <E at={`masterclasses.${i}.title`} as="h3" className="h3" />
            <E at={`masterclasses.${i}.host`} as="p" className="mc__host" />
            <SeatsBar m={m} />
            <div className="mc__foot">
              <span className="mc__price">{price(m.price, l)}</span>
              {m.left > 0 ? <More to={`${pageHref(l, 'tickets')}#kup`}>{l === 'pl' ? 'Zapisz się' : 'Book'}</More> : <span className="muted">{t(ui.soldOut, l)}</span>}
            </div>
          </Reveal>
        ))}
      </div>
    </>
  )
  return p.tint ? (
    <section className="sec sec--tint" id={p.anchor || undefined}>
      <div className="wrap">{body}</div>
    </section>
  ) : (
    <section className="sec wrap" id={p.anchor || undefined}>
      {body}
    </section>
  )
}

function Experts({ at, p }: BP) {
  const list = p.limit > 0 ? S.experts.slice(0, p.limit) : S.experts
  return (
    <section className="sec wrap" id={p.anchor || undefined}>
      <Head at={at} p={p} />
      <div className="grid4">
        {list.map((e, i) => (
          <Reveal as="article" key={i} delay={i * 50} className="tile">
            <div className="tile__media tile__media--tall">
              <Im at={`experts.${i}.img`} sizes="(max-width: 800px) 50vw, 25vw" alt={e.name} />
            </div>
            <div className="tile__cap tile__cap--stack">
              <E at={`experts.${i}.name`} className="tile__name" />
              <E at={`experts.${i}.role`} className="tile__meta" />
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function Partners({ at, p }: BP) {
  const groups = p.compact ? S.partners.slice(0, 3) : S.partners
  return (
    <section className="sec wrap">
      <Head at={at} p={p} />
      <div className="logos">
        {groups.map((g, gi) => (
          <div key={gi} className="logos__group">
            <E at={`partners.${gi}.tier`} as="p" className="logos__tier" />
            <div className="logos__row">
              {g.items.map((x, i) => {
                const inner = x.logo ? <Im at={`partners.${gi}.items.${i}.logo`} alt={x.name} sizes="200px" className="logo__img" /> : x.name
                return x.url ? (
                  <a key={i} className="logo" href={x.url} target="_blank" rel="noopener" aria-label={x.name}>
                    {inner}
                  </a>
                ) : (
                  <span key={i} className="logo">
                    {inner}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

const livePosts = () => S.posts.filter((x) => !x.draft)

function Feed({ at, p }: BP) {
  const l = useLocale()
  const posts = livePosts()
  const tile = (i: number) => {
    const post = posts[i]
    if (!post) return null
    return (
      <Link to={postHref(l, post)} className="feed__tile">
        <Im at={`posts.${S.posts.indexOf(post)}.img`} sizes="(max-width: 800px) 50vw, 25vw" />
        <span className="feed__cap">{t(post.title, l)}</span>
      </Link>
    )
  }
  return (
    <section className="feed wrap">
      <Reveal className="feed__copy">
        <E at={`${at}.kicker`} as="p" className="kicker" />
        <E at={`${at}.title`} as="h2" className="h2" />
        <MoreE at={`${at}.more`} />
      </Reveal>
      <div className="feed__grid">
        {tile(0)}
        <div className="feed__tile feed__tile--text">
          <E at={`${at}.quoteTitle`} as="p" />
          <E at={`${at}.quoteText`} as="p" />
        </div>
        {p.slot && <AdSlot slot={p.slot} format="tile" />}
        {tile(1)}
      </div>
    </section>
  )
}

export function NewsGrid({ limit = 0 }: { limit?: number }) {
  const l = useLocale()
  const posts = livePosts()
  return (
    <div className="grid3">
      {(limit > 0 ? posts.slice(0, limit) : posts).map((post, i) => (
        <Reveal as="article" key={post.slug} delay={i * 60} className="tile">
          <Link to={postHref(l, post)}>
            <div className="tile__media tile__media--wide">
              <Im at={`posts.${S.posts.indexOf(post)}.img`} sizes="(max-width: 800px) 100vw, 33vw" />
            </div>
            <p className="post__date">{date(post.date, l)}</p>
            <h3 className="h3">{t(post.title, l)}</h3>
            <p className="post__excerpt">{t(post.excerpt, l)}</p>
          </Link>
        </Reveal>
      ))}
    </div>
  )
}

function News({ p }: BP) {
  return (
    <section className="sec wrap">
      <NewsGrid limit={p.limit} />
    </section>
  )
}

function Newsletter({ at }: BP) {
  return (
    <section className="nlb wrap">
      <Reveal className="nlb__copy">
        <p className="kicker">Newsletter</p>
        <E at={`${at}.title`} as="h2" className="h2" />
        <E at={`${at}.text`} as="p" className="muted" />
      </Reveal>
      <Reveal className="nlb__form" delay={80}>
        <NewsletterForm />
      </Reveal>
    </section>
  )
}

/* ───────────── Podstrony ───────────── */

function PageHero({ at, p }: BP) {
  const l = useLocale()
  const ed = useEdit()
  return (
    <section className="phero">
      <div className="phero__head wrap">
        <E at={`${at}.title`} as="h1" className="phero__title" />
        <div className="phero__side">
          <E at={`${at}.eyebrow`} as="p" className="kicker" />
          <E at={`${at}.lead`} as="p" className="phero__lead" />
          {(has(p.btn?.label, l) || (ed && p.btn)) && (
            <div className="phero__actions">
              <BtnE at={`${at}.btn`} variant="light" />
            </div>
          )}
        </div>
      </div>
      {p.img && (
        <div className="phero__media wrap">
          <Im at={`${at}.img`} eager sizes="100vw" />
        </div>
      )}
    </section>
  )
}

function ImageCards({ at, p }: BP) {
  return (
    <section className="sec wrap">
      <Head at={at} p={p} />
      <div className="who">
        {(p.items ?? []).map((_: unknown, i: number) => (
          <Reveal key={i} delay={i * 60} className="who__item">
            <Im at={`${at}.items.${i}.img`} sizes="(max-width: 800px) 50vw, 25vw" />
            <E at={`${at}.items.${i}.title`} as="h3" />
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function FaqBlock({ at, p }: BP) {
  const l = useLocale()
  const ed = useEdit()
  const body = (
    <>
      <Head at={at} p={p} />
      <div className="faq__list">
        {S.faq.map((_, i) => (
          <details key={i} className="faq__item" open={ed ? true : undefined}>
            <E at={`faq.${i}.q`} as="summary" />
            <E at={`faq.${i}.a`} as="p" />
          </details>
        ))}
      </div>
      {(has(p.noteText, l) || has(p.noteKicker, l)) && (
        <Reveal className="faq__note">
          <E at={`${at}.noteKicker`} as="p" className="kicker" />
          <E at={`${at}.noteText`} as="p" />
        </Reveal>
      )}
    </>
  )
  return p.tint ? (
    <section className="sec sec--tint faq">
      <div className="wrap">{body}</div>
    </section>
  ) : (
    <section className="sec wrap faq">{body}</section>
  )
}

function Cards({ at, p }: BP) {
  const offer = p.style === 'offer'
  const body = (
    <>
      <Head at={at} p={p} />
      <div className={offer ? 'offer' : 'packs'}>
        {(p.items ?? []).map((_: unknown, i: number) => (
          <Reveal as="article" key={i} delay={i * 60} className={offer ? 'offer__item' : 'pack'}>
            {offer && <span className="offer__k">{String(i + 1).padStart(2, '0')}</span>}
            <E at={`${at}.items.${i}.title`} as="h3" />
            <E at={`${at}.items.${i}.text`} as="p" />
          </Reveal>
        ))}
      </div>
    </>
  )
  return p.tint ? (
    <section className="sec sec--tint">
      <div className="wrap">{body}</div>
    </section>
  ) : (
    <section className="sec wrap">{body}</section>
  )
}

const MAIL_LABELS: [keyof typeof S.event.emails, { pl: string; en: string }][] = [
  ['kontakt', { pl: 'Kontakt ogólny', en: 'General' }],
  ['wystawcy', { pl: 'Wystawcy', en: 'Exhibitors' }],
  ['bilety', { pl: 'Bilety', en: 'Tickets' }],
  ['partnerzy', { pl: 'Partnerzy', en: 'Partners' }],
  ['media', { pl: 'Media', en: 'Press' }],
  ['vip', { pl: 'Goście VIP', en: 'VIP guests' }],
]

function FormBlock({ at, p }: BP) {
  const l = useLocale()
  const mail = p.email && p.email !== 'all' ? S.event.emails[p.email as 'kontakt'] : ''
  return (
    <section className="sec wrap split">
      <Reveal className="split__copy">
        <E at={`${at}.kicker`} as="p" className="kicker" />
        <E at={`${at}.title`} as="h2" className="split__title" />
        <Paras at={`${at}.text`} />
        {p.email === 'all' && (
          <>
            <ul className="mails">
              {MAIL_LABELS.map(([k, label]) => (
                <li key={k}>
                  <span>{t(label, l)}</span>
                  <a href={`mailto:${S.event.emails[k]}`}>{S.event.emails[k]}</a>
                </li>
              ))}
            </ul>
            <p className="muted">
              {l === 'pl' ? 'Organizator' : 'Organiser'}: {S.event.organizer}
            </p>
          </>
        )}
        {mail && (
          <p>
            <a href={`mailto:${mail}`}>{mail}</a>
          </p>
        )}
        <BtnE at={`${at}.btn`} variant="outline" />
      </Reveal>
      <Reveal className="split__form" delay={100}>
        <LeadForm kind={p.kind as LeadKind} fields={leadFields(p.kind)} submitLabel={p.submit} success={p.success} />
      </Reveal>
    </section>
  )
}

function ExhibitForm({ at, p }: BP) {
  return (
    <section className="exform wrap" id={p.anchor || undefined}>
      <div className="exform__copy">
        <E at={`${at}.title`} as="h1" className="phero__title" />
        <E at={`${at}.lead`} as="p" className="phero__lead" />
        <p className="exform__mail">
          <a href={`mailto:${S.event.emails.wystawcy}`}>{S.event.emails.wystawcy}</a>
        </p>
        <div className="exform__media tile__media tile__media--wide">
          <Im at={`${at}.img`} eager sizes="(max-width: 860px) 100vw, 40vw" />
        </div>
      </div>
      <div className="exform__form">
        <LeadForm kind="exhibitor" fields={leadFields('exhibitor')} submitLabel={p.submit} success={p.success} />
      </div>
    </section>
  )
}

function Facts({ at, p }: BP) {
  return (
    <section className="sec wrap">
      <div className="facts">
        {(p.items ?? []).map((_: unknown, i: number) => (
          <Reveal key={i} delay={i * 50} className="fact">
            <E at={`${at}.items.${i}.k`} as="h3" />
            <E at={`${at}.items.${i}.v`} as="p" />
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function MapBlock({ p }: BP) {
  const ed = useEdit()
  return (
    <section className="sec wrap">
      <div className="map">{ed ? <div className="e-empty">Mapa (podgląd wyłączony w edytorze)</div> : <iframe title="Mapa" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={p.src} />}</div>
    </section>
  )
}

function TextBlock({ at }: BP) {
  return (
    <section className="legal wrap">
      <E at={`${at}.title`} as="h1" />
      <Paras at={`${at}.body`} className="muted" />
    </section>
  )
}

function Buttons({ at, p }: BP) {
  const l = useLocale()
  const ed = useEdit()
  return (
    <section className="sec wrap center">
      <div className="btn-row btn-row--center">
        {(p.items ?? []).map((x: any, i: number) =>
          x.variant === 'link' ? (
            ed ? (
              <span key={i} className="link">
                <E at={`${at}.items.${i}.label`} />
              </span>
            ) : (
              <Link key={i} to={link(l, x.link) || '#'} className="link">
                {t(x.label, l)}
              </Link>
            )
          ) : (
            <BtnE key={i} at={`${at}.items.${i}`} />
          ),
        )}
      </div>
    </section>
  )
}

/* ───────────── Moduły: program, katalog ───────────── */

function Schedule() {
  const l = useLocale()
  const pl = l === 'pl'
  const [day, setDay] = useState(0)
  const [zone, setZone] = useState<string | null>(null)
  const d = Math.min(day, S.program.length - 1)
  const items = (S.program[d]?.items ?? []).map((it, i) => ({ it, i })).filter(({ it }) => !zone || it.zone === zone)
  return (
    <section className="sec wrap">
      <div className="tabs" role="tablist">
        {S.program.map((x, i) => (
          <button key={i} role="tab" aria-selected={d === i} className={`tab ${d === i ? 'tab--on' : ''}`} onClick={() => setDay(i)}>
            <span className="tab__day">{t(x.day, l)}</span>
            <span className="tab__date">{x.date}</span>
          </button>
        ))}
      </div>
      <div className="filters">
        <button className={`chip ${zone === null ? 'chip--on' : ''}`} onClick={() => setZone(null)}>
          {pl ? 'Wszystko' : 'All'}
        </button>
        {S.zones.map((z) => (
          <button key={z.short} className={`chip ${zone === z.short ? 'chip--on' : ''}`} onClick={() => setZone(z.short)}>
            {z.short}
          </button>
        ))}
      </div>
      <ol className="agenda">
        {items.map(({ it, i }) => (
          <li key={i} className="agenda__item">
            <span className="agenda__time">{it.time}</span>
            <div className="agenda__main">
              <E at={`program.${d}.items.${i}.title`} as="h3" />
              {it.host && <p>{it.host}</p>}
            </div>
            <E at={`program.${d}.items.${i}.stage`} className="agenda__stage" />
          </li>
        ))}
        {!items.length && <li className="agenda__empty">{pl ? 'Brak wydarzeń w tej strefie tego dnia.' : 'No sessions in this zone on this day.'}</li>}
      </ol>
    </section>
  )
}

export function ExhibitorCard({ i }: { i: number }) {
  const l = useLocale()
  const e = S.exhibitors[i]
  const logo = e.logo ? <Im at={`exhibitors.${i}.logo`} alt={e.name} sizes="160px" className="exh__img" /> : e.name
  return (
    <article className="exh">
      {e.url ? (
        <a className="exh__logo" href={e.url} target="_blank" rel="noopener">
          {logo}
        </a>
      ) : (
        <div className="exh__logo">{logo}</div>
      )}
      <div className="exh__meta">
        <E at={`exhibitors.${i}.name`} as="h3" />
        <E at={`exhibitors.${i}.category`} as="p" />
      </div>
      <span className="exh__stand">
        {l === 'pl' ? 'Stoisko' : 'Stand'} {e.stand}
      </span>
    </article>
  )
}

function Catalog({ p }: BP) {
  const l = useLocale()
  const pl = l === 'pl'
  const [zone, setZone] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const list = S.exhibitors.map((e, i) => ({ e, i })).filter(({ e }) => (!zone || e.zone === zone) && e.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <section className="sec wrap">
      <div className="cat__tools">
        <input className="cat__search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={pl ? 'Szukaj marki…' : 'Search brands…'} aria-label={pl ? 'Szukaj' : 'Search'} />
        <div className="filters">
          <button className={`chip ${zone === null ? 'chip--on' : ''}`} onClick={() => setZone(null)}>
            {pl ? 'Wszystkie' : 'All'}
          </button>
          {S.zones.map((z) => (
            <button key={z.short} className={`chip ${zone === z.short ? 'chip--on' : ''}`} onClick={() => setZone(z.short)}>
              {z.short}
            </button>
          ))}
        </div>
      </div>
      <div className="cat">
        {list.map(({ i }, n) => (
          <div key={i} className="cat__wrap">
            <ExhibitorCard i={i} />
            {n === 5 && p.slot && <AdSlot slot={p.slot} format="tile" />}
          </div>
        ))}
      </div>
    </section>
  )
}

/** Rejestr bloków: typ → komponent. Opisy pól do panelu są w src/admin/schema.ts. */
export const BLOCKS: Record<string, ComponentType<BP>> = {
  hero: Hero,
  photoStrip: PhotoStrip,
  ad: Ad,
  banners: Banners,
  tickets: Tickets,
  faces: Faces,
  tiles: Tiles,
  split: Split,
  band: Band,
  stats: Stats,
  zones: Zones,
  masterclasses: Masterclasses,
  experts: Experts,
  partners: Partners,
  feed: Feed,
  news: News,
  newsletter: Newsletter,
  pageHero: PageHero,
  imageCards: ImageCards,
  faq: FaqBlock,
  cards: Cards,
  form: FormBlock,
  exhibitForm: ExhibitForm,
  facts: Facts,
  map: MapBlock,
  text: TextBlock,
  buttons: Buttons,
  schedule: Schedule,
  catalog: Catalog,
  ticketShop: TicketShop,
}
