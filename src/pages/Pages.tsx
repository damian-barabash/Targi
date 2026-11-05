import { Link } from 'react-router-dom'
import { href, t, ui, type T } from '../i18n'
import { EVENT, EXHIBITORS, FAQ, POSTS, ZONES, type Post, type Zone } from '../content/site'
import { date } from '../lib/format'
import { AdSlot, Btn, Eyebrow, Img, Reveal, Seo, useLocale } from '../components/ui'
import { CtaBand, LogoWall, NewsCards, PageHero, SectionHead, StatsRow } from '../components/sections'
import { LeadForm, baseFields } from '../components/forms'

export function About() {
  const l = useLocale()
  const pl = l === 'pl'
  const who = [
    { t: { pl: 'Fryzjerzy i styliści', en: 'Hairdressers & stylists' }, img: 'mc-blowdry' },
    { t: { pl: 'Kosmetolodzy', en: 'Cosmetologists' }, img: 'news-facial' },
    { t: { pl: 'Wizażyści i stylistki paznokci', en: 'Make-up & nail artists' }, img: 'nails-dark' },
    { t: { pl: 'Właściciele salonów', en: 'Salon owners' }, img: 'salon-pink' },
  ]
  return (
    <>
      <Seo title={pl ? 'O targach' : 'About'} description={pl ? 'Beauty & Hair Expo to coroczne targi branży beauty i hair w Rzeszowie. Dla kogo są i co zobaczysz.' : 'Beauty & Hair Expo is an annual beauty and hair trade show in Rzeszów. Who it’s for and what you’ll see.'} image="mc-team" />
      <PageHero img="mc-team" eyebrow={pl ? 'Pierwsza edycja · 2028' : 'First edition · 2028'} title={pl ? 'O targach' : 'About'} />

      <section className="split2 wrap">
        <Reveal className="split2__copy">
          <Eyebrow>{EVENT.brand}</Eyebrow>
          <h2 className="h2">
            {pl ? (
              <>
                Targi, które <em>inspirują</em> i&nbsp;sprzedają
              </>
            ) : (
              <>
                A show that <em>inspires</em> and sells
              </>
            )}
          </h2>
          <p>
            {pl
              ? 'Tworzymy coroczne wydarzenie, na którym branża beauty z Polski i zagranicy pokazuje nowości, uczy się od ekspertów i nawiązuje współpracę. Startujemy w lutym 2028 w ZEN.COM Expo pod Rzeszowem.'
              : 'We’re building an annual event where the beauty industry from Poland and abroad shows new products, learns from experts and builds partnerships. We launch in February 2028 at ZEN.COM Expo near Rzeszów.'}
          </p>
          <p>
            {pl ? 'Organizatorem jest ' : 'The organiser is '}
            <strong>{EVENT.organizer}</strong>.
          </p>
        </Reveal>
        <Reveal className="split2__media" delay={100}>
          <Img name="event-hall" sizes="(max-width: 800px) 100vw, 45vw" />
        </Reveal>
      </section>

      <StatsRow />

      <section className="sec wrap">
        <SectionHead eyebrow={pl ? 'Dla każdego, kto tworzy piękno' : 'For everyone who creates beauty'} title={pl ? 'Dla kogo' : 'Who for'} />
        <div className="who">
          {who.map((w, i) => (
            <Reveal key={w.img} delay={i * 60} className="who__item">
              <Img name={w.img} sizes="(max-width: 800px) 50vw, 25vw" />
              <h3>{t(w.t, l)}</h3>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="sec sec--tint faq">
        <div className="wrap">
          <SectionHead eyebrow={pl ? 'Pytania i odpowiedzi' : 'Questions & answers'} title="FAQ" />
          <div className="faq__list">
            {FAQ.map((f) => (
              <details key={f.q.pl} className="faq__item">
                <summary>{t(f.q, l)}</summary>
                <p>{t(f.a, l)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  )
}

export function ZonePage({ zone }: { zone: Zone }) {
  const l = useLocale()
  const pl = l === 'pl'
  const list = EXHIBITORS.filter((e) => e.zone === zone.short)
  return (
    <>
      <Seo title={t(zone.name, l)} description={t(zone.lead, l)} image={zone.img} />
      <PageHero img={zone.img} eyebrow={`( ${zone.short} )`} title={t(zone.name, l)} lead={t(zone.lead, l)} />
      <section className="sec wrap">
        <Reveal className="powered">
          <span className="powered__k">{pl ? 'Partner strefy' : 'Zone partner'}</span>
          <span className="powered__logo">{zone.partner}</span>
          <p>{pl ? 'Strefa współtworzona przez partnera — jego logo, pokazy i nowości produktowe.' : 'Co-created by our partner — their brand, shows and product launches.'}</p>
        </Reveal>
      </section>
      <section className="sec wrap">
        <SectionHead eyebrow={pl ? 'Kogo spotkasz' : 'Who you’ll meet'} title={pl ? 'Wystawcy' : 'Exhibitors'} />
        <div className="cat">
          {list.map((e) => (
            <article key={e.name} className="exh">
              <div className="exh__logo">{e.name}</div>
              <div className="exh__meta">
                <h3>{e.name}</h3>
                <p>{t(e.category, l)}</p>
              </div>
              <span className="exh__stand">
                {pl ? 'Stoisko' : 'Stand'} {e.stand}
              </span>
            </article>
          ))}
        </div>
        <div className="ad-wrap">
          <AdSlot id={`zone-${zone.short}`} label={t(ui.ad, l)} />
        </div>
      </section>
      <section className="sec sec--tint">
        <div className="wrap">
          <SectionHead eyebrow={pl ? 'Zobacz także' : 'See also'} title={pl ? 'Inne strefy' : 'Other zones'} />
          <div className="zone-links">
            {ZONES.filter((z) => z.short !== zone.short).map((z) => (
              <Link key={z.short} to={href(l, 'zone', t(z.slug, l))} className="chip chip--lg">
                {t(z.name, l)}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export function Partners() {
  const l = useLocale()
  const pl = l === 'pl'
  const packs = [
    { name: { pl: 'Partner strategiczny', en: 'Strategic partner' }, txt: { pl: 'Logo w nazwie strefy, scena, pełna kampania i najlepsze miejsca reklamowe.', en: 'Zone naming, a stage slot, a full campaign and premium ad placements.' } },
    { name: { pl: 'Partner złoty', en: 'Gold partner' }, txt: { pl: 'Logo na stronie i na hali, baner w katalogu wystawców, posty w social media.', en: 'Logo on site and in the hall, directory banner, social posts.' } },
    { name: { pl: 'Reklama online', en: 'Online advertising' }, txt: { pl: 'Banery na stronie głównej, podstronach i w strefach — z raportem wyświetleń i kliknięć.', en: 'Banners on the home page, subpages and zones — with view and click reports.' } },
  ]
  return (
    <>
      <Seo title={pl ? 'Partnerzy i sponsorzy' : 'Partners & sponsors'} description={pl ? 'Partnerzy, sponsorzy i patroni medialni Beauty & Hair Expo. Pakiety partnerskie i reklama.' : 'Partners, sponsors and media partners of Beauty & Hair Expo. Partnership packages and advertising.'} image="event-networking" />
      <PageHero img="event-networking" eyebrow={pl ? 'Współpraca' : 'Partnership'} title={pl ? 'Partnerzy' : 'Partners'} lead={pl ? 'Marki, które tworzą z nami pierwszą edycję.' : 'Brands creating the first edition with us.'} />
      <section className="sec wrap">
        <LogoWall />
      </section>
      <section className="sec sec--tint">
        <div className="wrap">
          <SectionHead eyebrow={pl ? 'Zostań partnerem lub reklamodawcą' : 'Become a partner or advertiser'} title={pl ? 'Pakiety' : 'Packages'} />
          <div className="packs">
            {packs.map((p, i) => (
              <Reveal as="article" key={p.name.pl} delay={i * 70} className="pack">
                <h3>{t(p.name, l)}</h3>
                <p>{t(p.txt, l)}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="sec wrap split">
        <Reveal className="split__copy">
          <Eyebrow>{pl ? 'Kontakt' : 'Contact'}</Eyebrow>
          <h2 className="split__title">{pl ? 'Porozmawiajmy o współpracy' : 'Let’s talk partnership'}</h2>
          <p>
            <a href={`mailto:${EVENT.emails.partnerzy}`}>{EVENT.emails.partnerzy}</a>
          </p>
        </Reveal>
        <Reveal className="split__form" delay={100}>
          <LeadForm
            kind="partner"
            fields={[
              ...baseFields,
              {
                name: 'topic',
                label: { pl: 'Interesuje mnie', en: 'I’m interested in' },
                type: 'select',
                options: [
                  { value: 'sponsor', label: { pl: 'Sponsoring', en: 'Sponsorship' } },
                  { value: 'ads', label: { pl: 'Reklama na stronie', en: 'Website advertising' } },
                  { value: 'media', label: { pl: 'Patronat medialny', en: 'Media partnership' } },
                  { value: 'other', label: { pl: 'Inne', en: 'Other' } },
                ],
              },
              { name: 'message', label: { pl: 'Wiadomość', en: 'Message' }, type: 'textarea' },
            ]}
            success={{ pl: 'Dziękujemy! Odezwiemy się z propozycją.', en: 'Thank you! We’ll get back to you with a proposal.' }}
          />
        </Reveal>
      </section>
    </>
  )
}

export function Media() {
  const l = useLocale()
  const pl = l === 'pl'
  return (
    <>
      <Seo title={pl ? 'Dla mediów' : 'Press'} description={pl ? 'Akredytacja prasowa i materiały dla mediów — Beauty & Hair Expo Rzeszów 2028.' : 'Press accreditation and media kit — Beauty & Hair Expo Rzeszów 2028.'} image="event-mic" />
      <PageHero img="event-mic" eyebrow={pl ? 'Prasa' : 'Press'} title={pl ? 'Media' : 'Media'} lead={pl ? 'Akredytacja, materiały prasowe i kontakt dla dziennikarzy.' : 'Accreditation, press materials and contact for journalists.'} />
      <section className="sec wrap split">
        <Reveal className="split__copy">
          <Eyebrow>{pl ? 'Akredytacja' : 'Accreditation'}</Eyebrow>
          <h2 className="split__title">{pl ? 'Zgłoś się po akredytację' : 'Apply for accreditation'}</h2>
          <p>{pl ? 'Po weryfikacji otrzymasz bezpłatną wejściówkę z kodem QR.' : 'After verification you’ll receive a free QR pass.'}</p>
          <p>
            <a href={`mailto:${EVENT.emails.media}`}>{EVENT.emails.media}</a>
          </p>
          <Btn to="#" variant="outline">
            {pl ? 'Press kit (wkrótce)' : 'Press kit (soon)'}
          </Btn>
        </Reveal>
        <Reveal className="split__form" delay={100}>
          <LeadForm
            kind="media"
            fields={[
              ...baseFields.map((f) => (f.name === 'company' ? { ...f, label: { pl: 'Redakcja', en: 'Media outlet' }, required: true } : f)),
              { name: 'url', label: { pl: 'Link do medium', en: 'Outlet URL' }, wide: true },
              { name: 'message', label: { pl: 'Planowane materiały', en: 'Planned coverage' }, type: 'textarea' },
            ]}
            submitLabel={{ pl: 'Wyślij zgłoszenie', en: 'Apply' }}
            success={{ pl: 'Dziękujemy! Potwierdzimy akredytację e-mailem.', en: 'Thank you! We’ll confirm your accreditation by e-mail.' }}
          />
        </Reveal>
      </section>
    </>
  )
}

export function News() {
  const l = useLocale()
  const pl = l === 'pl'
  return (
    <>
      <Seo title={pl ? 'Aktualności' : 'News'} description={pl ? 'Nowości, zapowiedzi i artykuły od organizatorów Beauty & Hair Expo.' : 'News, announcements and articles from the Beauty & Hair Expo team.'} image="news-wash" />
      <PageHero img="news-wash" eyebrow="Blog" title={pl ? 'Aktualności' : 'News'} />
      <section className="sec wrap">
        <NewsCards limit={99} />
      </section>
    </>
  )
}

export function PostPage({ post }: { post: Post }) {
  const l = useLocale()
  const pl = l === 'pl'
  return (
    <>
      <Seo title={t(post.title, l)} description={t(post.excerpt, l)} image={post.img} />
      <article className="article">
        <header className="article__head wrap">
          <Link to={href(l, 'news')} className="link">
            ← {pl ? 'Aktualności' : 'News'}
          </Link>
          <time dateTime={post.date}>{date(post.date, l)}</time>
          <h1>{t(post.title, l)}</h1>
          <p className="article__lead">{t(post.excerpt, l)}</p>
        </header>
        <div className="article__media wrap">
          <Img name={post.img} eager sizes="100vw" />
        </div>
        <div className="article__body wrap">
          {post.body.map((b, i) => (
            <p key={i}>{t(b, l)}</p>
          ))}
          <div className="ad-wrap">
            <AdSlot id="article" label={t(ui.ad, l)} />
          </div>
        </div>
      </article>
      <section className="sec sec--tint">
        <div className="wrap">
          <SectionHead eyebrow={pl ? 'Czytaj także' : 'Read next'} title={pl ? 'Czytaj dalej' : 'Read next'} />
          <NewsCards limit={3} />
        </div>
      </section>
    </>
  )
}

export function Visit() {
  const l = useLocale()
  const pl = l === 'pl'
  const blocks: { k: T; v: T }[] = [
    { k: { pl: 'Termin', en: 'Dates' }, v: { pl: '19–20 lutego 2028, 10:00–18:00', en: '19–20 February 2028, 10:00–18:00' } },
    { k: { pl: 'Miejsce', en: 'Venue' }, v: { pl: `${EVENT.venue}, ${EVENT.address}`, en: `${EVENT.venue}, ${EVENT.address}` } },
    { k: { pl: 'Samolotem', en: 'By plane' }, v: { pl: 'Lotnisko Rzeszów-Jasionka jest tuż obok hali.', en: 'Rzeszów-Jasionka Airport is right next to the venue.' } },
    { k: { pl: 'Samochodem', en: 'By car' }, v: { pl: 'Dojazd autostradą A4 i drogą S19. Parking przy obiekcie.', en: 'Via the A4 motorway and the S19 road. Parking on site.' } },
    { k: { pl: 'Noclegi', en: 'Hotels' }, v: { pl: 'Lista hoteli partnerskich z rabatem pojawi się wkrótce.', en: 'Partner hotels with discounts coming soon.' } },
    { k: { pl: 'Wejście', en: 'Entry' }, v: { pl: 'Pokaż kod QR z e-maila. Ponowne wejście zgodnie z rodzajem biletu.', en: 'Show the QR code from your e-mail. Re-entry depends on ticket type.' } },
  ]
  return (
    <>
      <Seo title={pl ? 'Informacje praktyczne' : 'Plan your visit'} description={pl ? 'Jak dojechać do ZEN.COM Expo, godziny otwarcia, parking i noclegi — Beauty & Hair Expo 2028.' : 'Getting to ZEN.COM Expo, opening hours, parking and hotels — Beauty & Hair Expo 2028.'} image="event-hall" />
      <PageHero img="event-hall" eyebrow={EVENT.venue} title={pl ? 'Jak dojechać' : 'Getting there'} lead={t(EVENT.city, l)} />
      <section className="sec wrap">
        <div className="facts">
          {blocks.map((b, i) => (
            <Reveal key={b.k.pl} delay={i * 50} className="fact">
              <h3>{t(b.k, l)}</h3>
              <p>{t(b.v, l)}</p>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="sec wrap">
        <div className="map">
          <iframe
            title="Mapa"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src="https://www.openstreetmap.org/export/embed.html?bbox=21.98%2C50.09%2C22.07%2C50.13&layer=mapnik&marker=50.1115%2C22.0225"
          />
        </div>
      </section>
    </>
  )
}

export function Contact() {
  const l = useLocale()
  const pl = l === 'pl'
  const boxes: [T, string][] = [
    [{ pl: 'Kontakt ogólny', en: 'General' }, EVENT.emails.kontakt],
    [{ pl: 'Wystawcy', en: 'Exhibitors' }, EVENT.emails.wystawcy],
    [{ pl: 'Bilety', en: 'Tickets' }, EVENT.emails.bilety],
    [{ pl: 'Partnerzy', en: 'Partners' }, EVENT.emails.partnerzy],
    [{ pl: 'Media', en: 'Press' }, EVENT.emails.media],
    [{ pl: 'Goście VIP', en: 'VIP guests' }, EVENT.emails.vip],
  ]
  return (
    <>
      <Seo title={pl ? 'Kontakt' : 'Contact'} description={pl ? 'Skontaktuj się z organizatorami Beauty & Hair Expo Rzeszów 2028.' : 'Get in touch with the Beauty & Hair Expo Rzeszów 2028 team.'} image="salon-pink" />
      <PageHero img="salon-pink" eyebrow={pl ? 'Napisz do nas' : 'Write to us'} title={pl ? 'Kontakt' : 'Contact'} />
      <section className="sec wrap split">
        <Reveal className="split__copy">
          <ul className="mails">
            {boxes.map(([k, m]) => (
              <li key={m}>
                <span>{t(k, l)}</span>
                <a href={`mailto:${m}`}>{m}</a>
              </li>
            ))}
          </ul>
          <p className="muted">
            {pl ? 'Organizator' : 'Organiser'}: {EVENT.organizer}
          </p>
        </Reveal>
        <Reveal className="split__form" delay={100}>
          <LeadForm
            kind="contact"
            fields={[
              baseFields[0],
              baseFields[1],
              {
                name: 'topic',
                label: { pl: 'Temat', en: 'Topic' },
                type: 'select',
                required: true,
                options: [
                  { value: 'kontakt', label: { pl: 'Pytanie ogólne', en: 'General question' } },
                  { value: 'bilety', label: { pl: 'Bilety', en: 'Tickets' } },
                  { value: 'wystawcy', label: { pl: 'Wystawcy', en: 'Exhibitors' } },
                  { value: 'partnerzy', label: { pl: 'Partnerstwo / reklama', en: 'Partnership / ads' } },
                  { value: 'media', label: { pl: 'Media', en: 'Press' } },
                  { value: 'vip', label: { pl: 'Goście VIP', en: 'VIP guests' } },
                ],
              },
              { name: 'message', label: { pl: 'Wiadomość', en: 'Message' }, type: 'textarea', required: true },
            ]}
            success={{ pl: 'Dziękujemy! Wiadomość trafiła do właściwej osoby.', en: 'Thank you! Your message has reached the right person.' }}
          />
        </Reveal>
      </section>
    </>
  )
}

export function Legal({ kind }: { kind: 'terms' | 'privacy' }) {
  const l = useLocale()
  const pl = l === 'pl'
  const title = kind === 'terms' ? (pl ? 'Regulamin sprzedaży biletów' : 'Ticket sales terms') : pl ? 'Polityka prywatności' : 'Privacy policy'
  return (
    <>
      <Seo title={title} description={title} />
      <section className="legal wrap">
        <h1>{title}</h1>
        <p className="muted">
          {pl
            ? 'Dokument w przygotowaniu. Ostateczną treść przygotuje organizator wraz z prawnikiem.'
            : 'Document in preparation. The final text will be provided by the organiser and their lawyer.'}
        </p>
      </section>
    </>
  )
}

export function NotFound() {
  const l = useLocale()
  return (
    <section className="nf wrap">
      <Seo title="404" description="404" />
      <p className="nf__code">404</p>
      <h1>{l === 'pl' ? 'Nie ma takiej strony' : 'Page not found'}</h1>
      <Btn to={href(l, 'home')}>{l === 'pl' ? 'Strona główna' : 'Home'}</Btn>
    </section>
  )
}

export { POSTS, ZONES }
