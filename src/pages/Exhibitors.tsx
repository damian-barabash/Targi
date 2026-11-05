import { useState } from 'react'
import { Link } from 'react-router-dom'
import { href, t, ui } from '../i18n'
import { EXHIBITORS, ZONES } from '../content/site'
import { AdSlot, Btn, Eyebrow, Img, Reveal, Seo, useLocale } from '../components/ui'
import { PageHero, SectionHead } from '../components/sections'
import { LeadForm, baseFields } from '../components/forms'

/** Katalog wystawców. */
export function Exhibitors() {
  const l = useLocale()
  const pl = l === 'pl'
  const [zone, setZone] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const list = EXHIBITORS.filter((e) => (!zone || e.zone === zone) && e.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <Seo title={pl ? 'Katalog wystawców' : 'Exhibitor directory'} description={pl ? 'Marki i firmy, które spotkasz na Beauty & Hair Expo Rzeszów 2028.' : 'Brands and companies you will meet at Beauty & Hair Expo Rzeszów 2028.'} image="salon-modern" />
      <PageHero img="salon-modern" eyebrow={pl ? 'Katalog' : 'Directory'} title={pl ? 'Wystawcy' : 'Exhibitors'} lead={pl ? 'Poznaj marki przed targami i zaplanuj, które stoiska odwiedzisz.' : 'Meet the brands before the show and plan which stands to visit.'}>
        <Btn to={href(l, 'exhibit')} variant="light">
          {t(ui.becomeExhibitor, l)}
        </Btn>
      </PageHero>

      <section className="sec wrap">
        <div className="cat__tools">
          <input className="cat__search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={pl ? 'Szukaj marki…' : 'Search brands…'} aria-label={pl ? 'Szukaj' : 'Search'} />
          <div className="filters">
            <button className={`chip ${zone === null ? 'chip--on' : ''}`} onClick={() => setZone(null)}>
              {pl ? 'Wszystkie' : 'All'}
            </button>
            {ZONES.map((z) => (
              <button key={z.short} className={`chip ${zone === z.short ? 'chip--on' : ''}`} onClick={() => setZone(z.short)}>
                {z.short}
              </button>
            ))}
          </div>
        </div>
        <div className="cat">
          {list.map((e, i) => (
            <div key={e.name} className="cat__wrap">
              <article className="exh">
                <div className="exh__logo">{e.name}</div>
                <div className="exh__meta">
                  <h3>{e.name}</h3>
                  <p>{t(e.category, l)}</p>
                </div>
                <span className="exh__stand">{pl ? 'Stoisko' : 'Stand'} {e.stand}</span>
              </article>
              {i === 5 && <AdSlot id="catalog-inline" label={t(ui.ad, l)} variant="tile" />}
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

/** Oferta dla wystawców + formularz zgłoszenia. Stoisk nie sprzedajemy online. */
export function Exhibit() {
  const l = useLocale()
  const pl = l === 'pl'
  const offer = [
    { k: '01', title: { pl: 'Stoisko', en: 'Stand' }, txt: { pl: 'Powierzchnia od 6 do 100 m², zabudowa standardowa lub własna.', en: 'From 6 to 100 m², standard or custom build.' } },
    { k: '02', title: { pl: 'Branding', en: 'Branding' }, txt: { pl: 'Druk plakatów, oklejenie stoiska, reklama na hali.', en: 'Poster printing, stand wrapping, in-hall advertising.' } },
    { k: '03', title: { pl: 'Kampania', en: 'Campaign' }, txt: { pl: 'Promocja Twojej marki w social media i newsletterze targów.', en: 'Promotion of your brand on our social media and newsletter.' } },
    { k: '04', title: { pl: 'Studio wideo', en: 'Video studio' }, txt: { pl: 'Wywiady, rolki i transmisje live nagrywane na miejscu.', en: 'Interviews, reels and live streams recorded on site.' } },
    { k: '05', title: { pl: 'Scena i panele', en: 'Stage & panels' }, txt: { pl: 'Pokaz lub udział w panelu eksperckim na scenie głównej.', en: 'A show or an expert panel slot on the main stage.' } },
    { k: '06', title: { pl: 'Masterclass', en: 'Masterclass' }, txt: { pl: 'Poprowadź warsztat dla małej grupy specjalistów.', en: 'Run a workshop for a small group of professionals.' } },
  ]
  return (
    <>
      <Seo title={pl ? 'Zostań wystawcą' : 'Become an exhibitor'} description={pl ? 'Zaprezentuj markę na Beauty & Hair Expo Rzeszów 2028. Stoiska, branding, studio wideo i panele. Wyślij zgłoszenie.' : 'Present your brand at Beauty & Hair Expo Rzeszów 2028. Stands, branding, video studio and panels. Apply now.'} image="event-booth" />
      <PageHero img="event-booth" eyebrow={pl ? 'Dla wystawców' : 'For exhibitors'} title={pl ? 'Zostań wystawcą' : 'Exhibit with us'} lead={pl ? 'Spotkaj klientów twarzą w twarz. Zostaw kontakt — przygotujemy ofertę dla Twojej marki.' : 'Meet your customers face to face. Leave your details and we’ll prepare an offer.'}>
        <Btn to="#zgloszenie" variant="light">
          {pl ? 'Wyślij zgłoszenie' : 'Apply now'}
        </Btn>
      </PageHero>

      <section className="sec wrap">
        <SectionHead eyebrow={pl ? 'Pakiet szyty na miarę' : 'A tailor-made package'} title={pl ? 'Oferta' : 'Offer'}>
          <p>{pl ? 'Cennik i pakiety przekażemy po zgłoszeniu.' : 'We’ll send prices and packages after you apply.'}</p>
        </SectionHead>
        <div className="offer">
          {offer.map((o, i) => (
            <Reveal as="article" key={o.k} delay={i * 50} className="offer__item">
              <span className="offer__k">{o.k}</span>
              <h3>{t(o.title, l)}</h3>
              <p>{t(o.txt, l)}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="sec sec--tint" id="zgloszenie">
        <div className="wrap split">
          <Reveal className="split__copy">
            <Eyebrow>{pl ? 'Zgłoszenie' : 'Application'}</Eyebrow>
            <h2 className="split__title">{pl ? 'Porozmawiajmy o Twoim stoisku' : 'Let’s talk about your stand'}</h2>
            <p>{pl ? 'Odpowiemy w ciągu kilku dni roboczych.' : 'We’ll reply within a few working days.'}</p>
            <p>
              <a href="mailto:wystawcy@targibeautyhair.pl">wystawcy@targibeautyhair.pl</a>
            </p>
            <Img name="event-audience" className="split__img" sizes="(max-width: 800px) 100vw, 35vw" />
          </Reveal>
          <Reveal className="split__form" delay={100}>
            <LeadForm
              kind="exhibitor"
              fields={[
                ...baseFields.map((f) => (f.name === 'company' ? { ...f, required: true } : f)),
                { name: 'nip', label: { pl: 'NIP', en: 'VAT number' } },
                {
                  name: 'zone',
                  label: { pl: 'Strefa', en: 'Zone' },
                  type: 'select',
                  options: ZONES.map((z) => ({ value: z.short, label: z.name })),
                },
                {
                  name: 'stand_size',
                  label: { pl: 'Wielkość stoiska', en: 'Stand size' },
                  type: 'select',
                  options: [
                    { value: '6-12', label: { pl: '6–12 m²', en: '6–12 m²' } },
                    { value: '12-30', label: { pl: '12–30 m²', en: '12–30 m²' } },
                    { value: '30+', label: { pl: 'powyżej 30 m²', en: 'over 30 m²' } },
                    { value: 'unknown', label: { pl: 'Jeszcze nie wiem', en: 'Not sure yet' } },
                  ],
                },
                { name: 'message', label: { pl: 'Czym się zajmujecie i czego potrzebujecie?', en: 'What do you do and what do you need?' }, type: 'textarea' },
              ]}
              submitLabel={{ pl: 'Wyślij zgłoszenie', en: 'Send application' }}
              success={{ pl: 'Dziękujemy! Zgłoszenie dotarło. Odezwiemy się z ofertą.', en: 'Thank you! We’ve received your application and will be in touch.' }}
            />
          </Reveal>
        </div>
      </section>

      <section className="sec wrap center">
        <p>
          <Link to={href(l, 'exhibitors')} className="link">
            {pl ? 'Zobacz, kto już wystawia →' : 'See who’s exhibiting →'}
          </Link>
        </p>
      </section>
    </>
  )
}
