import { Link } from 'react-router-dom'
import { href, t, ui } from '../i18n'
import { EVENT, FACES, POSTS } from '../content/site'
import { AdSlot, Banner, Btn, Countdown, Img, More, Reveal, Seo, useLocale } from '../components/ui'
import { ExpertsGrid, LogoWall, MasterclassList, NewsletterBlock, SectionHead, StatsRow, TicketCards, ZoneCards } from '../components/sections'

export default function Home() {
  const l = useLocale()
  const pl = l === 'pl'
  const features = [
    { img: 'event-speaker', name: { pl: 'Pokazy na scenie', en: 'Stage shows' }, meta: { pl: 'Scena główna', en: 'Main stage' }, to: href(l, 'program') },
    { img: 'mc-blowdry', name: { pl: 'Masterclass', en: 'Masterclasses' }, meta: { pl: '25 warsztatów', en: '25 workshops' }, to: `${href(l, 'program')}#masterclass` },
    { img: 'event-booth', name: { pl: 'Stoiska marek', en: 'Brand stands' }, meta: { pl: '120+ wystawców', en: '120+ exhibitors' }, to: href(l, 'exhibitors') },
    { img: 'event-networking', name: { pl: 'Spotkania B2B', en: 'B2B meetings' }, meta: { pl: 'Strefa VIP', en: 'VIP lounge' }, to: href(l, 'about') },
  ]

  return (
    <>
      <Seo
        title={`${EVENT.brand} ${EVENT.edition}`}
        description={
          pl
            ? 'Targi branży beauty i hair 19–20 lutego 2028 w ZEN.COM Expo pod Rzeszowem. Pokazy, masterclass, wystawcy i partnerzy. Bilety online.'
            : 'Beauty and hair trade show, 19–20 February 2028 at ZEN.COM Expo near Rzeszów. Shows, masterclasses, exhibitors and partners. Tickets online.'
        }
      />

      {/* HERO — logo + twarze wydarzenia + dwa kliknięcia (wymóg klientek) */}
      <section className="hero2">
        <div className="hero2__top wrap">
          {/* Logo wydarzenia — docelowo plik od klientek, na razie wordmark */}
          <h1 className="hero2__logo">
            Beauty &amp; Hair
            <span className="hero2__logo-sub">Expo · Rzeszów 2028</span>
            <span className="sr-only">, {t(EVENT.dates, l)}</span>
          </h1>
          <div className="hero2__bar">
            <p className="hero2__meta">
              {t(EVENT.dates, l)}
              <br />
              {EVENT.venue} · {t(EVENT.city, l)}
            </p>
            <div className="hero2__cta">
              <Btn to={href(l, 'tickets')} className="btn--lg">
                {t(ui.buyTicket, l)}
              </Btn>
              <Btn to={href(l, 'exhibit')} variant="outline" className="btn--lg">
                {t(ui.becomeExhibitor, l)}
              </Btn>
            </div>
            <p className="hero2__count">
              {pl ? 'Do otwarcia' : 'Opens in'}
              <br />
              <Countdown labels={{ days: t(ui.days, l), hours: t(ui.hours, l), minutes: t(ui.minutes, l) }} />
            </p>
          </div>
        </div>
      </section>

      {/* Krótki pas ze zdjęciem między hero a biletami */}
      <section className="pband pband--short" aria-hidden="true">
        <div className="pband__media">
          {/* wysoka rozdzielczość — pas na całą szerokość, także na ekranach retina */}
          <img
            src={`${import.meta.env.BASE_URL}img/strip-makeup-1400.webp`}
            srcSet={`${import.meta.env.BASE_URL}img/strip-makeup-800.webp 800w, ${import.meta.env.BASE_URL}img/strip-makeup-1400.webp 1400w, ${import.meta.env.BASE_URL}img/strip-makeup-2800.webp 2800w`}
            sizes="100vw"
            alt=""
            loading="lazy"
            decoding="async"
          />
        </div>
      </section>

      {/* Pasek partnera głównego — pierwsze miejsce reklamowe */}
      <div className="wrap">
        <AdSlot id="home-main-partner" label={t(ui.ad, l)} variant="bar" />
      </div>

      {/* Bilety */}
      <section className="sec wrap" id="bilety">
        <SectionHead eyebrow={pl ? 'Wybierz bilet' : 'Choose your ticket'} title={pl ? 'Bilety' : 'Tickets'}>
          <p className="muted">{pl ? 'E-bilet z kodem QR na e-mail. BLIK, karta, Apple Pay, Google Pay.' : 'E-ticket with a QR code by e-mail. BLIK, card, Apple Pay, Google Pay.'}</p>
        </SectionHead>
        <TicketCards />
      </section>

      {/* Twarze wydarzenia — na razie miejsca na zdjęcia ambasadorek */}
      <section className="sec wrap">
        <SectionHead eyebrow={pl ? 'Twarze Beauty & Hair Expo' : 'Faces of Beauty & Hair Expo'} title={pl ? 'Twarze' : 'Faces'}>
          <p className="muted">{pl ? 'Ambasadorki pierwszej edycji. Zdjęcia przykładowe.' : 'Ambassadors of the first edition. Sample photos.'}</p>
        </SectionHead>
        <div className="grid4">
          {FACES.map((f, i) => (
            <Reveal as="article" key={f.name} delay={i * 60} className="face">
              <div className="tile__media face__media">
                <Img name={f.img} sizes="(max-width: 700px) 50vw, 25vw" alt={f.name} />
                {/* zdjęcia robocze — prawdziwe ambasadorki przekażą klientki */}
                <span className="ph__label">{pl ? 'Zdjęcie przykładowe' : 'Sample photo'}</span>
              </div>
              <div className="face__cap">
                <span className="face__name">{f.name}</span>
                <span className="face__role">{t(f.role, l)}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Banery partnerów — 3 przykładowe kreacje */}
      <section className="wrap banners" aria-label={pl ? 'Banery partnerów' : 'Partner banners'}>
        <Banner id="home-b1" variant="gold" wide />
        <Banner id="home-b2" variant="dark" />
        <Banner id="home-b3" variant="photo" />
      </section>

      {/* Co jest na targach — siatka 4 kafli */}
      <section className="sec sec--flush wrap">
        <div className="grid4">
          {features.map((f, i) => (
            <Reveal key={f.img} delay={i * 60}>
              <Link to={f.to} className="tile">
                <div className="tile__media tile__media--tall">
                  <Img name={f.img} sizes="(max-width: 800px) 50vw, 25vw" />
                </div>
                <div className="tile__cap">
                  <span className="tile__name">{t(f.name, l)}</span>
                  <span className="tile__meta">{t(f.meta, l)}</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Split: tekst + duże zdjęcie */}
      <section className="split2 wrap">
        <Reveal className="split2__copy">
          <p className="kicker">{pl ? 'Pierwsza edycja' : 'First edition'}</p>
          <h2 className="h2">{pl ? 'Dwa dni, w których branża beauty spotyka się na żywo' : 'Two days when the beauty industry meets in person'}</h2>
          <p className="muted">
            {pl
              ? 'Pokazy fryzur i makijażu, warsztaty z ekspertami, premiery marek i rozmowy, które kończą się współpracą.'
              : 'Hair and make-up shows, expert workshops, brand launches and conversations that turn into partnerships.'}
          </p>
          <Btn to={href(l, 'tickets')} variant="gold">
            {pl ? 'Kup bilet · od 79 zł' : 'Buy a ticket · from PLN 79'}
          </Btn>
        </Reveal>
        <Reveal className="split2__media" delay={80}>
          <Img name="event-stage" sizes="(max-width: 800px) 100vw, 55vw" />
        </Reveal>
      </section>

      {/* Kolorowy pas z manifestem — jak w referencji, w naszym złocie */}
      <section className="band">
        <Reveal className="band__inner wrap">
          <p className="kicker">{pl ? 'Dla marek' : 'For brands'}</p>
          <p className="band__text">
            {pl
              ? 'Tu marki spotykają salony, a partnerzy docierają do tysięcy profesjonalistów — na hali, na scenie i w naszych kanałach.'
              : 'Here brands meet salons, and partners reach thousands of professionals — in the hall, on stage and across our channels.'}
          </p>
          <div className="btn-row btn-row--center">
            <Btn to={href(l, 'exhibit')} variant="light">
              {t(ui.becomeExhibitor, l)}
            </Btn>
            <Btn to={href(l, 'partners')} variant="outline">
              {pl ? 'Zostań partnerem' : 'Become a partner'}
            </Btn>
          </div>
        </Reveal>
      </section>

      <StatsRow />

      {/* Strefy */}
      <section className="sec wrap">
        <SectionHead eyebrow={pl ? 'Pięć stref, pięciu partnerów' : 'Five zones, five partners'} title={pl ? 'Strefy' : 'Zones'}>
          <p className="muted">{pl ? 'Każdą strefę współtworzy partner — jego marka, scena i pokazy.' : 'Each zone is co-created by a partner — their brand, stage and shows.'}</p>
        </SectionHead>
        <ZoneCards />
      </section>

      {/* Dla wystawców: zdjęcie po lewej, tekst po prawej */}
      <section className="split2 split2--rev wrap">
        <Reveal className="split2__media">
          <Img name="mc-seminar" sizes="(max-width: 800px) 100vw, 55vw" />
        </Reveal>
        <Reveal className="split2__copy" delay={80}>
          <p className="kicker">{pl ? 'Wystawcy i partnerzy' : 'Exhibitors & partners'}</p>
          <h2 className="h2">{pl ? 'Twoja marka przed tysiącami profesjonalistów' : 'Your brand in front of thousands of professionals'}</h2>
          <ul className="list">
            <li>{pl ? 'Stoisko i branding na hali' : 'A stand and in-hall branding'}</li>
            <li>{pl ? 'Kampania w naszych social media i newsletterze' : 'A campaign on our social media and newsletter'}</li>
            <li>{pl ? 'Wywiady, rolki i live ze studia wideo' : 'Interviews, reels and live from our video studio'}</li>
            <li>{pl ? 'Banery na stronie z raportem wyświetleń i kliknięć' : 'Website banners with view and click reports'}</li>
          </ul>
          <div className="btn-row">
            <Btn to={href(l, 'exhibit')}>{t(ui.becomeExhibitor, l)}</Btn>
            <More to={href(l, 'partners')}>{pl ? 'Pakiety partnerskie' : 'Partner packages'}</More>
          </div>
        </Reveal>
      </section>

      {/* Masterclass */}
      <section className="sec wrap" id="masterclass">
        <SectionHead eyebrow={pl ? 'Warsztaty z limitem miejsc' : 'Workshops with limited seats'} title="Masterclass">
          <More to={href(l, 'program')}>{pl ? 'Cały program' : 'Full programme'}</More>
        </SectionHead>
        <MasterclassList />
      </section>

      {/* Baner szeroki */}
      <div className="wrap">
        <AdSlot id="home-wide" label={t(ui.ad, l)} img="zone-hair" />
      </div>

      {/* Eksperci */}
      <section className="sec wrap">
        <SectionHead eyebrow={pl ? 'Na scenie wystąpią' : 'On stage'} title={pl ? 'Eksperci' : 'Speakers'}>
          <More to={`${href(l, 'program')}#eksperci`}>{pl ? 'Wszyscy prelegenci' : 'All speakers'}</More>
        </SectionHead>
        <ExpertsGrid limit={4} />
      </section>

      {/* Partnerzy */}
      <section className="sec wrap">
        <SectionHead eyebrow={pl ? 'Razem tworzymy targi' : 'Building the expo together'} title={pl ? 'Partnerzy' : 'Partners'}>
          <More to={href(l, 'partners')}>{pl ? 'Zostań partnerem' : 'Become a partner'}</More>
        </SectionHead>
        <LogoWall compact />
      </section>

      {/* Aktualności — tekst po lewej, siatka 2×2 z kaflem reklamowym */}
      <section className="feed wrap">
        <Reveal className="feed__copy">
          <p className="kicker">{pl ? 'Aktualności' : 'News'}</p>
          <h2 className="h2">{pl ? 'Z życia targów' : 'From the expo'}</h2>
          <More to={href(l, 'news')}>{pl ? 'Wszystkie wpisy' : 'All posts'}</More>
        </Reveal>
        <div className="feed__grid">
          <Link to={href(l, 'post', POSTS[0].slug)} className="feed__tile">
            <Img name={POSTS[0].img} sizes="(max-width: 800px) 50vw, 25vw" />
            <span className="feed__cap">{t(POSTS[0].title, l)}</span>
          </Link>
          <div className="feed__tile feed__tile--text">
            <p>
              <em>{pl ? 'Targi' : 'Expo'}</em> {pl ? '(rzecz.):' : '(noun):'}
            </p>
            <p>{pl ? 'dwa dni, w których cała branża jest w jednym miejscu.' : 'two days when the whole industry is in one place.'}</p>
          </div>
          <AdSlot id="home-feed" label={t(ui.ad, l)} variant="tile" img="nails-dark" />
          <Link to={href(l, 'post', POSTS[1].slug)} className="feed__tile">
            <Img name={POSTS[1].img} sizes="(max-width: 800px) 50vw, 25vw" />
            <span className="feed__cap">{t(POSTS[1].title, l)}</span>
          </Link>
        </div>
      </section>

      {/* Miejsce */}
      <section className="split2 wrap">
        <Reveal className="split2__copy">
          <p className="kicker">{pl ? 'Miejsce' : 'Venue'}</p>
          <h2 className="h2">{EVENT.venue}</h2>
          <p className="muted">
            {pl
              ? 'Centrum wystawiennicze tuż przy lotnisku Rzeszów-Jasionka i autostradzie A4. Parking przy hali.'
              : 'An exhibition centre next to Rzeszów-Jasionka Airport and the A4 motorway. Parking by the hall.'}
          </p>
          <dl className="facts-inline">
            <div>
              <dt>{pl ? 'Adres' : 'Address'}</dt>
              <dd>{EVENT.address}</dd>
            </div>
            <div>
              <dt>{pl ? 'Godziny' : 'Hours'}</dt>
              <dd>10:00–18:00</dd>
            </div>
          </dl>
          <More to={href(l, 'visit')}>{pl ? 'Jak dojechać' : 'Getting there'}</More>
        </Reveal>
        <Reveal className="split2__media" delay={80}>
          <Img name="event-hall" sizes="(max-width: 800px) 100vw, 55vw" />
        </Reveal>
      </section>

      <NewsletterBlock />
    </>
  )
}
