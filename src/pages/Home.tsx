import { href, t, ui } from '../i18n'
import { EVENT, EXHIBITORS, STATS } from '../content/site'
import { AdSlot, Btn, Countdown, Eyebrow, Img, Reveal, Seo, useLocale } from '../components/ui'
import { CtaBand, ExpertsGrid, LogoWall, MasterclassList, NewsCards, NewsletterBlock, SectionHead, TicketCards, ZoneCards } from '../components/sections'

export default function Home() {
  const l = useLocale()
  const pl = l === 'pl'
  return (
    <>
      <Seo
        title={`${EVENT.brand} ${EVENT.edition}`}
        description={
          pl
            ? 'Targi branży beauty i hair 19–20 lutego 2028 w ZEN.COM Expo pod Rzeszowem. Pokazy, masterclass, wystawcy i eksperci. Kup bilet online.'
            : 'Beauty and hair trade show, 19–20 February 2028 at ZEN.COM Expo near Rzeszów. Shows, masterclasses, exhibitors and experts. Buy tickets online.'
        }
      />

      {/* HERO — zdjęcie na całą szerokość, ogromne słowa jak w referencji */}
      <section className="hero">
        <div className="hero__frame">
          <Img name="hero" className="hero__img" eager sizes="100vw" alt="" />
          <div className="hero__shade" />
          <div className="hero__top wrap">
            <p className="hero__kicker">
              <span>{t(EVENT.dates, l)}</span>
              <span>
                {EVENT.venue} · {t(EVENT.city, l)}
              </span>
            </p>
          </div>
          <h1 className="hero__title">
            <span className="hero__line hero__line--1">Beauty</span>
            <span className="hero__line hero__line--2">
              <em>&amp;</em> Hair
            </span>
            <span className="sr-only">
              Expo {EVENT.edition}, {t(EVENT.dates, l)}
            </span>
          </h1>
          <div className="hero__bottom wrap">
            <p className="hero__lead">
              {pl
                ? 'Dwa dni pokazów, masterclass i spotkań z markami, które zmieniają branżę beauty. Pierwsza edycja w Rzeszowie.'
                : 'Two days of shows, masterclasses and meetings with brands shaping the beauty industry. The first edition in Rzeszów.'}
            </p>
            <div className="hero__btns">
              <Btn to={href(l, 'tickets')} variant="light">
                {t(ui.buyTicket, l)}
              </Btn>
              <Btn to={href(l, 'exhibit')} variant="glass">
                {t(ui.becomeExhibitor, l)}
              </Btn>
            </div>
          </div>
          <aside className="hero__card" aria-label={pl ? 'Do targów zostało' : 'Countdown'}>
            <p className="hero__card-k">{pl ? 'Do otwarcia' : 'Doors open in'}</p>
            <Countdown labels={{ days: t(ui.days, l), hours: t(ui.hours, l), minutes: t(ui.minutes, l) }} />
            <p className="hero__card-meta">Expo · {EVENT.edition}</p>
          </aside>
        </div>
      </section>

      {/* INTRO */}
      <section className="intro wrap">
        <Reveal className="intro__copy">
          <Eyebrow>{pl ? 'Nowa marka na mapie branży' : 'A new name in beauty events'}</Eyebrow>
          <h2 className="intro__title">
            {pl ? (
              <>
                Miejsce, gdzie <em>branża beauty</em> spotyka się twarzą w&nbsp;twarz
              </>
            ) : (
              <>
                Where the <em>beauty industry</em> meets face to face
              </>
            )}
          </h2>
          <p>
            {pl
              ? 'Beauty & Hair Expo łączy producentów, dystrybutorów, salony i specjalistów. Zobaczysz nowości przed premierą, nauczysz się technik od najlepszych i nawiążesz kontakty, które przełożą się na Twój biznes.'
              : 'Beauty & Hair Expo brings together brands, distributors, salons and specialists. See new products before launch, learn techniques from the best and make contacts that grow your business.'}
          </p>
          <Btn to={href(l, 'about')} variant="gold">
            {pl ? 'Poznaj targi' : 'About the expo'}
          </Btn>
        </Reveal>
        <Reveal className="intro__media" delay={120}>
          <Img name="hair-wavy" className="intro__img" sizes="(max-width: 800px) 100vw, 45vw" />
          <div className="intro__chip intro__chip--a">
            <strong>120+</strong>
            <span>{pl ? 'wystawców' : 'exhibitors'}</span>
          </div>
          <div className="intro__chip intro__chip--b">
            <strong>2</strong>
            <span>{pl ? 'dni · 5 stref' : 'days · 5 zones'}</span>
          </div>
        </Reveal>
      </section>

      {/* LICZBY */}
      <section className="stats wrap" aria-label={pl ? 'W liczbach' : 'In numbers'}>
        {STATS.map((s, i) => (
          <Reveal key={s.value + i} delay={i * 70} className="stat">
            <span className="stat__v">{s.value}</span>
            <span className="stat__l">{t(s.label, l)}</span>
          </Reveal>
        ))}
      </section>

      {/* BILETY */}
      <section className="sec wrap" id="bilety">
        <SectionHead eyebrow={pl ? 'Bilety' : 'Tickets'} title={pl ? 'Wybierz swój bilet' : 'Choose your ticket'}>
          <p>
            {pl
              ? 'Bilet z kodem QR przyjdzie na e-mail od razu po płatności. BLIK, karta, Apple Pay i Google Pay.'
              : 'Your QR ticket arrives by e-mail right after payment. BLIK, card, Apple Pay and Google Pay.'}
          </p>
        </SectionHead>
        <TicketCards />
      </section>

      {/* STREFY */}
      <section className="sec sec--tint">
        <div className="wrap">
          <SectionHead eyebrow={pl ? 'Strefy tematyczne' : 'Themed zones'} title={pl ? 'Pięć światów pod jednym dachem' : 'Five worlds under one roof'}>
            <p>
              {pl
                ? 'Każda strefa ma własną scenę, wystawców i partnera, który ją współtworzy.'
                : 'Each zone has its own stage, exhibitors and a partner who co-creates it.'}
            </p>
          </SectionHead>
          <ZoneCards />
        </div>
      </section>

      {/* MASTERCLASS — wielkie słowo w tle jak "new" w referencji */}
      <section className="sec mcsec">
        <div className="bigword" aria-hidden="true">
          masterclass
        </div>
        <div className="wrap">
          <SectionHead eyebrow={pl ? 'Warsztaty' : 'Workshops'} title={pl ? 'Ucz się od najlepszych' : 'Learn from the best'}>
            <p>{pl ? 'Małe grupy, praktyka i certyfikat. Liczba miejsc jest ograniczona.' : 'Small groups, hands-on practice and a certificate. Seats are limited.'}</p>
          </SectionHead>
          <MasterclassList />
          <div className="sec__more">
            <Btn to={href(l, 'program')} variant="outline">
              {pl ? 'Cały program' : 'Full programme'}
            </Btn>
          </div>
        </div>
      </section>

      {/* EKSPERCI */}
      <section className="sec wrap">
        <SectionHead eyebrow={pl ? 'Eksperci' : 'Experts'} title={pl ? 'Twarze pierwszej edycji' : 'Faces of the first edition'} />
        <ExpertsGrid limit={4} />
      </section>

      {/* WYSTAWCY — ciemna sekcja sprzedażowa */}
      <section className="exb">
        <div className="exb__inner wrap">
          <Reveal className="exb__copy">
            <Eyebrow light>{pl ? 'Dla wystawców' : 'For exhibitors'}</Eyebrow>
            <h2 className="exb__title">{pl ? 'Pokaż swoją markę tysiącom profesjonalistów' : 'Show your brand to thousands of professionals'}</h2>
            <p>
              {pl
                ? 'Stoisko, branding, kampania reklamowa, studio wideo na miejscu i udział w panelach. Przygotujemy ofertę dopasowaną do Twojej marki.'
                : 'A stand, branding, an ad campaign, an on-site video studio and panel slots. We’ll prepare an offer that fits your brand.'}
            </p>
            <ul className="exb__list">
              <li>{pl ? 'Stoiska od 6 do 100 m²' : 'Stands from 6 to 100 m²'}</li>
              <li>{pl ? 'Wywiady, rolki i transmisje live' : 'Interviews, reels and live streams'}</li>
              <li>{pl ? 'Profil w katalogu wystawców' : 'Profile in the exhibitor directory'}</li>
            </ul>
            <div className="btn-row">
              <Btn to={href(l, 'exhibit')} variant="light">
                {t(ui.becomeExhibitor, l)}
              </Btn>
              <Btn to={href(l, 'exhibitors')} variant="outline" className="btn--on-dark">
                {pl ? 'Katalog wystawców' : 'Exhibitor directory'}
              </Btn>
            </div>
          </Reveal>
          <Reveal className="exb__media" delay={120}>
            <Img name="mc-team" className="exb__img exb__img--a" sizes="(max-width: 800px) 60vw, 25vw" />
            <Img name="event-audience" className="exb__img exb__img--b" sizes="(max-width: 800px) 60vw, 25vw" />
          </Reveal>
        </div>
        <div className="marquee" aria-hidden="true">
          <div className="marquee__track">
            {[...EXHIBITORS, ...EXHIBITORS].map((e, i) => (
              <span key={i}>{e.name}</span>
            ))}
          </div>
        </div>
      </section>

      <div className="wrap ad-wrap">
        <AdSlot id="home-mid" label={t(ui.ad, l)} />
      </div>

      {/* PARTNERZY */}
      <section className="sec wrap">
        <SectionHead eyebrow={pl ? 'Partnerzy i sponsorzy' : 'Partners & sponsors'} title={pl ? 'Razem tworzymy to wydarzenie' : 'Making it happen together'}>
          <Btn to={href(l, 'partners')} variant="outline">
            {pl ? 'Zostań partnerem' : 'Become a partner'}
          </Btn>
        </SectionHead>
        <LogoWall compact />
      </section>

      {/* AKTUALNOŚCI */}
      <section className="sec sec--tint">
        <div className="wrap">
          <SectionHead eyebrow={pl ? 'Aktualności' : 'News'} title={pl ? 'Z życia targów' : 'Latest from the expo'}>
            <Btn to={href(l, 'news')} variant="outline">
              {pl ? 'Wszystkie wpisy' : 'All posts'}
            </Btn>
          </SectionHead>
          <NewsCards />
        </div>
      </section>

      {/* DOJAZD */}
      <section className="sec wrap visit">
        <Reveal className="visit__media">
          <Img name="event-hall" sizes="(max-width: 800px) 100vw, 55vw" />
        </Reveal>
        <Reveal className="visit__copy" delay={100}>
          <Eyebrow>{pl ? 'Miejsce' : 'Venue'}</Eyebrow>
          <h2 className="visit__title">{EVENT.venue}</h2>
          <p>
            {pl
              ? 'Nowoczesne centrum wystawiennicze tuż przy lotnisku Rzeszów-Jasionka i autostradzie A4. Parking tuż przy hali.'
              : 'A modern exhibition centre right next to Rzeszów-Jasionka Airport and the A4 motorway. Parking right next to the hall.'}
          </p>
          <dl className="visit__facts">
            <div>
              <dt>{pl ? 'Adres' : 'Address'}</dt>
              <dd>{EVENT.address}</dd>
            </div>
            <div>
              <dt>{pl ? 'Godziny' : 'Hours'}</dt>
              <dd>10:00–18:00</dd>
            </div>
          </dl>
          <Btn to={href(l, 'visit')} variant="outline">
            {pl ? 'Jak dojechać' : 'Getting there'}
          </Btn>
        </Reveal>
      </section>

      <NewsletterBlock />
      <CtaBand />
    </>
  )
}
