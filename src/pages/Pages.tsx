// Strony-szablony: strefa, wpis, 404. Pozostałe strony składają się z bloków (PageView).
import { Link } from 'react-router-dom'
import { t } from '../i18n'
import { S } from '../content/site'
import { date } from '../lib/format'
import { pageHref, zoneHref } from '../lib/link'
import { AdSlot, Btn, Reveal, Seo, useLocale } from '../components/ui'
import { ExhibitorCard, NewsGrid } from '../blocks/blocks'
import { E, Im, Paras } from '../blocks/edit'

function Head({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <Reveal className="shead">
      <h2 className={title.length > 14 ? 'mega mega--md' : 'mega'}>{title}</h2>
      <div className="shead__row">
        <p className="kicker">{eyebrow}</p>
      </div>
    </Reveal>
  )
}

export function ZonePage({ index }: { index: number }) {
  const l = useLocale()
  const pl = l === 'pl'
  const zone = S.zones[index]
  if (!zone) return null
  const at = `zones.${index}`
  return (
    <>
      <Seo title={t(zone.name, l)} description={t(zone.lead, l)} image={zone.img} />
      <section className="phero">
        <div className="phero__head wrap">
          <E at={`${at}.name`} as="h1" className="phero__title" />
          <div className="phero__side">
            <p className="kicker">( {zone.short} )</p>
            <E at={`${at}.lead`} as="p" className="phero__lead" />
          </div>
        </div>
        <div className="phero__media wrap">
          <Im at={`${at}.img`} eager sizes="100vw" />
        </div>
      </section>
      <section className="sec wrap">
        <Reveal className="powered">
          <span className="powered__k">{pl ? 'Partner strefy' : 'Zone partner'}</span>
          <E at={`${at}.partner`} className="powered__logo" />
          <p>{pl ? 'Strefa współtworzona przez partnera — jego logo, pokazy i nowości produktowe.' : 'Co-created by our partner — their brand, shows and product launches.'}</p>
        </Reveal>
      </section>
      <section className="sec wrap">
        <Head eyebrow={pl ? 'Kogo spotkasz' : 'Who you’ll meet'} title={pl ? 'Wystawcy' : 'Exhibitors'} />
        <div className="cat">{S.exhibitors.map((e, i) => (e.zone === zone.short ? <ExhibitorCard key={i} i={i} /> : null))}</div>
        <div className="ad-wrap">
          <AdSlot slot="zone" />
        </div>
      </section>
      <section className="sec sec--tint">
        <div className="wrap">
          <Head eyebrow={pl ? 'Zobacz także' : 'See also'} title={pl ? 'Inne strefy' : 'Other zones'} />
          <div className="zone-links">
            {S.zones
              .filter((z) => z.short !== zone.short)
              .map((z) => (
                <Link key={z.short} to={zoneHref(l, z)} className="chip chip--lg">
                  {t(z.name, l)}
                </Link>
              ))}
          </div>
        </div>
      </section>
    </>
  )
}

export function PostPage({ index }: { index: number }) {
  const l = useLocale()
  const pl = l === 'pl'
  const post = S.posts[index]
  if (!post) return null
  const at = `posts.${index}`
  return (
    <>
      <Seo title={t(post.title, l)} description={t(post.excerpt, l)} image={post.img} />
      <article className="article">
        <header className="article__head wrap">
          <Link to={pageHref(l, 'news')} className="link">
            ← {pl ? 'Aktualności' : 'News'}
          </Link>
          <time dateTime={post.date}>{date(post.date, l)}</time>
          <E at={`${at}.title`} as="h1" />
          <E at={`${at}.excerpt`} as="p" className="article__lead" />
        </header>
        <div className="article__media wrap">
          <Im at={`${at}.img`} eager sizes="100vw" />
        </div>
        <div className="article__body wrap">
          <Paras at={`${at}.body`} />
          <div className="ad-wrap">
            <AdSlot slot="article" />
          </div>
        </div>
      </article>
      <section className="sec sec--tint">
        <div className="wrap">
          <Head eyebrow={pl ? 'Czytaj także' : 'Read next'} title={pl ? 'Czytaj dalej' : 'Read next'} />
          <NewsGrid limit={3} />
        </div>
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
      <Btn to={pageHref(l, 'home')}>{l === 'pl' ? 'Strona główna' : 'Home'}</Btn>
    </section>
  )
}
