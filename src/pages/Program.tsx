import { useState } from 'react'
import { t } from '../i18n'
import { PROGRAM, ZONES } from '../content/site'
import { AdSlot, Reveal, Seo, useLocale } from '../components/ui'
import { ExpertsGrid, MasterclassList, PageHero, SectionHead } from '../components/sections'
import { ui } from '../i18n'

export default function Program() {
  const l = useLocale()
  const pl = l === 'pl'
  const [day, setDay] = useState(0)
  const [zone, setZone] = useState<string | null>(null)
  const items = PROGRAM[day].items.filter((i) => !zone || i.zone === zone)

  return (
    <>
      <Seo
        title={pl ? 'Program' : 'Programme'}
        description={pl ? 'Program Beauty & Hair Expo 2028: pokazy, panele, masterclass i warsztaty w dwóch dniach targów.' : 'Beauty & Hair Expo 2028 programme: shows, panels, masterclasses and workshops over two days.'}
        image="event-stage"
      />
      <PageHero
        img="event-stage"
        eyebrow={pl ? 'Sceny · panele · warsztaty' : 'Stages · panels · workshops'}
        title={pl ? 'Program' : 'Programme'}
        lead={pl ? 'Dwa dni, trzy sceny i kilkadziesiąt wystąpień. Program będzie uzupełniany.' : 'Two days, three stages and dozens of sessions. More to be announced.'}
      />

      <section className="sec wrap">
        <div className="tabs" role="tablist">
          {PROGRAM.map((d, i) => (
            <button key={d.date} role="tab" aria-selected={day === i} className={`tab ${day === i ? 'tab--on' : ''}`} onClick={() => setDay(i)}>
              <span className="tab__day">{t(d.day, l)}</span>
              <span className="tab__date">{d.date}</span>
            </button>
          ))}
        </div>
        <div className="filters">
          <button className={`chip ${zone === null ? 'chip--on' : ''}`} onClick={() => setZone(null)}>
            {pl ? 'Wszystko' : 'All'}
          </button>
          {ZONES.map((z) => (
            <button key={z.short} className={`chip ${zone === z.short ? 'chip--on' : ''}`} onClick={() => setZone(z.short)}>
              {z.short}
            </button>
          ))}
        </div>
        <ol className="agenda">
          {items.map((it) => (
            <li key={it.time + it.title.pl} className="agenda__item">
              <span className="agenda__time">{it.time}</span>
              <div className="agenda__main">
                <h3>{t(it.title, l)}</h3>
                {it.host && <p>{it.host}</p>}
              </div>
              <span className="agenda__stage">{t(it.stage, l)}</span>
            </li>
          ))}
          {!items.length && <li className="agenda__empty">{pl ? 'Brak wydarzeń w tej strefie tego dnia.' : 'No sessions in this zone on this day.'}</li>}
        </ol>
      </section>

      <section className="sec sec--tint" id="masterclass">
        <div className="wrap">
          <SectionHead eyebrow={pl ? 'Warsztaty z limitem miejsc' : 'Workshops with limited seats'} title="Masterclass" />
          <MasterclassList />
        </div>
      </section>

      <section className="sec wrap" id="eksperci">
        <SectionHead eyebrow={pl ? 'Prelegenci i trenerzy' : 'Speakers and trainers'} title={pl ? 'Eksperci' : 'Speakers'} />
        <ExpertsGrid />
        <Reveal className="ad-wrap">
          <AdSlot id="program" label={t(ui.ad, l)} />
        </Reveal>
      </section>
    </>
  )
}
