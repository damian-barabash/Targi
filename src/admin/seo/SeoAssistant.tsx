// Asystent SEO obok okna edycji wpisu: ocena na żywo, rady AI po polsku, przepisanie tekstu według zaleceń.
import { useEffect, useMemo, useRef, useState } from 'react'
import { getIn, setIn } from '../../lib/path'
import { fnStream } from '../api'
import { canEdit, errText, mutate, set, toast, useStore } from '../store'
import { Icon } from '../ui'
import { analyze, diffWords, noDashes, parseAnalysis, parseRewrite, streamText, scoreLabel, scoreTone, slugify, type AiResult, type Check, type Rewrite, type SeoInput } from './logic'
import './seo.css'

const LS = 'bhe-seo-open'
const lsGet = () => {
  try {
    return localStorage.getItem(LS) !== '0'
  } catch {
    return true
  }
}
const lsSet = (v: boolean) => {
  try {
    localStorage.setItem(LS, v ? '1' : '0')
  } catch {
    /* tryb prywatny */
  }
}

/** Płynne przejście liczby (wynik w kółku). */
function useTween(target: number, ms = 700) {
  const [v, setV] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const a = from.current
    const t0 = performance.now()
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      const e = 1 - Math.pow(1 - k, 3)
      const x = a + (target - a) * e
      from.current = x
      setV(x)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return Math.round(v)
}

function Ring({ score, size = 84 }: { score: number; size?: number }) {
  const v = useTween(score)
  const r = size / 2 - 7
  const c = 2 * Math.PI * r
  return (
    <div className={`seo-ring seo-ring--${scoreTone(score)}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="seo-ring__bg" />
        <circle cx={size / 2} cy={size / 2} r={r} className="seo-ring__fg" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <strong>{v}</strong>
    </div>
  )
}

const WAIT_A = ['Czytam wpis…', 'Sprawdzam frazę kluczową…', 'Porównuję z dobrymi praktykami Google…', 'Układam rady po polsku…']
const WAIT_R = ['Przygotowuję nową wersję…', 'Dobieram tytuł…', 'Piszę opis do Google…', 'Przepisuję treść…']
function useRotating(list: string[], on: boolean) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!on) return setI(0)
    const t = setInterval(() => setI((x) => (x + 1) % list.length), 2600)
    return () => clearInterval(t)
  }, [on, list])
  return list[i]
}

const LEVEL: Record<string, string> = { high: 'Ważne', medium: 'Warto', low: 'Drobiazg' }

type Phase = 'idle' | 'loading' | 'done' | 'error'

export default function SeoAssistant({ base }: { base: string }) {
  const loc = useStore((s) => s.loc)
  const post = useStore((s) => getIn(s.site, base)) as any
  const site = useStore((s) => s.site)
  const editable = canEdit('posts')
  const [open, setOpen] = useState(() => (typeof window === 'undefined' || window.innerWidth >= 1120) && lsGet())
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1120)
  const [showGood, setShowGood] = useState(false)

  // AI: analiza
  const [aPhase, setAPhase] = useState<Phase>('idle')
  const [aRaw, setARaw] = useState('')
  const [aErr, setAErr] = useState('')
  const [aFor, setAFor] = useState('')
  // AI: przepisanie
  const [rPhase, setRPhase] = useState<Phase>('idle')
  const [rRaw, setRRaw] = useState('')
  const [rErr, setRErr] = useState('')
  const [view, setView] = useState<'diff' | 'new'>('diff')
  const [backup, setBackup] = useState<{ title: string; excerpt: string; body: string } | null>(null)
  const ctl = useRef<AbortController | null>(null)
  const streamBox = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 1120)
    window.addEventListener('resize', on)
    return () => (window.removeEventListener('resize', on), ctl.current?.abort())
  }, [])
  useEffect(() => {
    if (!narrow) lsSet(open)
  }, [open])

  const input: SeoInput = {
    title: post?.title?.[loc] ?? '',
    excerpt: post?.excerpt?.[loc] ?? '',
    body: post?.body?.[loc] ?? '',
    slug: post?.slug ?? '',
    keyword: post?.keyword?.[loc] ?? '',
    img: post?.img ?? '',
    lang: loc,
  }
  const res = useMemo(() => analyze(input), [input.title, input.excerpt, input.body, input.slug, input.keyword, input.img, loc])
  const ai: AiResult = useMemo(() => parseAnalysis(aRaw, aPhase !== 'loading'), [aRaw, aPhase])
  const rw: Rewrite = useMemo(() => parseRewrite(rRaw), [rRaw])
  const rwScore = useMemo(() => (rPhase === 'done' ? analyze({ ...input, title: rw.title, excerpt: rw.excerpt, body: rw.body }).score : 0), [rPhase, rw])
  const waitA = useRotating(WAIT_A, aPhase === 'loading' && !ai.tips.length)
  const waitR = useRotating(WAIT_R, rPhase === 'loading')
  const fp = `${input.title}|${input.excerpt}|${input.body}|${input.keyword}`
  const stale = aPhase === 'done' && aFor !== fp

  useEffect(() => {
    if (rPhase === 'loading' && streamBox.current) streamBox.current.scrollTop = streamBox.current.scrollHeight
  }, [rRaw, rPhase])

  // nowy wpis / zmiana języka → czyścimy wyniki AI
  useEffect(() => {
    ctl.current?.abort()
    setAPhase('idle'), setARaw(''), setRPhase('idle'), setRRaw(''), setBackup(null)
  }, [base, loc])

  if (!post) return null
  const bad = res.checks.filter((c) => c.level !== 'good')
  const good = res.checks.filter((c) => c.level === 'good')
  const payload = () => ({ lang: loc, keyword: input.keyword, title: input.title, excerpt: input.excerpt, body: input.body, slug: input.slug, issues: bad.map((c) => c.issue!) })

  async function runAnalysis() {
    ctl.current?.abort()
    const c = (ctl.current = new AbortController())
    setAPhase('loading'), setARaw(''), setAErr(''), setAFor(fp)
    try {
      const all = await fnStream('seo', { mode: 'analyze', ...payload() }, (x) => setARaw(streamText(x).text), c.signal)
      const r = streamText(all)
      if (!r.complete && !parseAnalysis(r.text, true).tips.length) throw new Error('Model AI przerwał odpowiedź. Spróbuj ponownie za chwilę.')
      setAPhase('done')
    } catch (e: any) {
      if (e.name === 'AbortError') return
      setAErr(/not_configured/.test(e.message) ? 'Asystent AI nie jest jeszcze skonfigurowany (brak adresu i modelu AI w sekretach Supabase).' : errText(e))
      setAPhase('error')
    }
  }

  async function runRewrite() {
    ctl.current?.abort()
    const c = (ctl.current = new AbortController())
    setRPhase('loading'), setRRaw(''), setRErr(''), setView('diff')
    try {
      const all = await fnStream('seo', { mode: 'rewrite', ...payload(), tips: ai.tips.map((t) => ({ title: t.title, text: t.text })) }, (x) => setRRaw(streamText(x).text), c.signal)
      const r = streamText(all)
      if (!r.complete || !parseRewrite(r.text).body) throw new Error('Model AI przerwał pisanie w połowie. Kliknij „Spróbuj ponownie”.')
      setRPhase('done')
    } catch (e: any) {
      if (e.name === 'AbortError') return
      setRErr(/not_configured/.test(e.message) ? 'Asystent AI nie jest jeszcze skonfigurowany.' : errText(e))
      setRPhase('error')
    }
  }

  function flash() {
    const el = document.querySelector('.modal--side')
    el?.classList.remove('seo-flash')
    void (el as HTMLElement | null)?.offsetWidth
    el?.classList.add('seo-flash')
    setTimeout(() => el?.classList.remove('seo-flash'), 1600)
  }

  /** Wpisuje teksty w bieżącym języku jednym krokiem (z oznaczeniem EN do sprawdzenia). */
  function write(fields: Partial<Record<'title' | 'excerpt' | 'body', string>>) {
    mutate((s) => {
      let n = s
      for (const [k, v] of Object.entries(fields)) {
        if (v == null) continue
        const path = `${base}.${k}`
        const cur = getIn(n, path) ?? {}
        const next: any = { ...cur, [loc]: v }
        if (loc === 'pl' && cur.en && v !== cur.pl) next._s = true
        n = setIn(n, path, next)
      }
      return n
    }, ['posts'])
    flash()
  }

  function apply() {
    setBackup({ title: input.title, excerpt: input.excerpt, body: input.body })
    write({ title: rw.title || input.title, excerpt: rw.excerpt || input.excerpt, body: rw.body || input.body })
    setRPhase('idle'), setRRaw(''), setAPhase('idle'), setARaw('')
    toast('Wpis przepisany. Sprawdź tekst i kliknij „Zapisz” u góry.')
  }

  const setKeyword = (v: string) => set(`${base}.keyword`, { ...(post.keyword ?? { pl: '', en: '' }), [loc]: v })
  const newsSlug = site.pages.find((p) => p.id === 'news')?.slug?.[loc] ?? 'aktualnosci'
  const host = typeof location !== 'undefined' ? location.host : 'beauty.barabashflow.pl'
  const cutTitle = input.title.length > 60 ? `${input.title.slice(0, 58).trimEnd()}…` : input.title
  const cutDesc = input.excerpt.length > 158 ? `${input.excerpt.slice(0, 155).trimEnd()}…` : input.excerpt

  /* ───────── zwinięty ───────── */
  if (!open)
    return (
      <button type="button" className={`seo-tab seo-tab--${scoreTone(res.score)} ${narrow ? 'seo-tab--narrow' : ''}`} onClick={() => setOpen(true)} title="Pokaż asystenta SEO">
        <Icon n="sparkle" s={16} />
        <span>SEO</span>
        <b>{res.score}</b>
      </button>
    )

  const rewriting = rPhase !== 'idle'
  return (
    <aside className={`seo ${narrow ? 'seo--narrow' : ''}`} aria-label="Asystent SEO" onMouseDown={(e) => e.stopPropagation()}>
      <header className="seo__head">
        <span className={`seo__orb ${aPhase === 'loading' || rPhase === 'loading' ? 'is-busy' : ''}`}>
          <Icon n="sparkle" s={17} />
        </span>
        <div className="grow">
          <strong>Asystent SEO</strong>
          <small>{rewriting ? 'Nowa wersja wpisu' : `Wpis ${loc.toUpperCase()} · rady po polsku`}</small>
        </div>
        <button type="button" className="seo__x" onClick={() => setOpen(false)} title="Zwiń asystenta">
          <Icon n={narrow ? 'x' : 'right'} s={17} />
        </button>
      </header>

      <div className="seo__scroll" ref={streamBox}>
        {!rewriting ? (
          <>
            {/* wynik */}
            <section className="seo-score seo-in" style={{ '--d': 0 } as any}>
              <Ring score={res.score} />
              <div>
                <p className={`seo-score__label seo-t--${scoreTone(res.score)}`}>{scoreLabel(res.score)}</p>
                <p className="seo-score__sub">
                  {bad.length ? `${bad.length} ${bad.length === 1 ? 'rzecz' : bad.length < 5 ? 'rzeczy' : 'rzeczy'} do poprawy` : 'Wszystko gotowe do publikacji'}
                </p>
                <div className="seo-chips">
                  <span>{res.stats.words} słów</span>
                  <span>{res.stats.readMin} min czytania</span>
                  <span>{res.stats.headings} śródtyt.</span>
                </div>
              </div>
            </section>

            {/* fraza */}
            <section className="seo-card seo-in" style={{ '--d': 1 } as any}>
              <label className="seo-card__t" htmlFor="seo-kw">
                <Icon n="target" s={15} /> Fraza kluczowa
              </label>
              <input id="seo-kw" className="in" value={input.keyword} disabled={!editable} onChange={(e) => setKeyword(e.target.value)} placeholder={loc === 'pl' ? 'np. targi beauty Rzeszów' : 'e.g. beauty trade show Poland'} />
              {ai.keyword && fold2(ai.keyword) !== fold2(input.keyword) && (
                <button type="button" className="seo-suggest" disabled={!editable} onClick={() => setKeyword(ai.keyword!)}>
                  <Icon n="sparkle" s={13} /> Propozycja AI: <b>{ai.keyword}</b> <em>Użyj</em>
                </button>
              )}
              {!input.keyword && input.slug && <p className="seo-hint">Fraza nie trafia na stronę. Służy tylko do oceny wpisu.</p>}
            </section>

            {/* podgląd Google */}
            <section className="seo-card seo-in" style={{ '--d': 2 } as any}>
              <p className="seo-card__t">
                <Icon n="search" s={15} /> Tak zobaczą to w Google
              </p>
              <div className="serp">
                <p className="serp__url">
                  <span className="serp__fav">B</span>
                  {host} › {newsSlug} › {input.slug}
                </p>
                <p className="serp__title">{cutTitle || 'Tytuł wpisu'}</p>
                <p className="serp__desc">{cutDesc || <i>Brak opisu. Google weźmie przypadkowy fragment tekstu.</i>}</p>
              </div>
              {input.slug !== slugify(input.slug) && <p className="seo-hint seo-t--warn">Adres zawiera wielkie litery, spacje albo polskie znaki: „{slugify(input.slug)}” byłby bezpieczniejszy.</p>}
            </section>

            {/* lista kontrolna */}
            <section className="seo-card seo-in" style={{ '--d': 3 } as any}>
              <p className="seo-card__t">
                <Icon n="check" s={15} /> Lista kontrolna
                <span className="seo-count">
                  {good.length}/{res.checks.length}
                </span>
              </p>
              <ul className="seo-list">
                {bad.map((c, i) => (
                  <CheckRow key={c.id} c={c} i={i} />
                ))}
              </ul>
              {good.length > 0 && (
                <>
                  <button type="button" className="seo-more" onClick={() => setShowGood(!showGood)}>
                    {showGood ? 'Ukryj spełnione' : `Pokaż spełnione (${good.length})`}
                  </button>
                  {showGood && (
                    <ul className="seo-list seo-list--good">
                      {good.map((c, i) => (
                        <CheckRow key={c.id} c={c} i={i} />
                      ))}
                    </ul>
                  )}
                </>
              )}
            </section>

            {/* rady AI */}
            <section className="seo-card seo-card--ai seo-in" style={{ '--d': 4 } as any}>
              <p className="seo-card__t">
                <Icon n="sparkle" s={15} /> Rady eksperta AI
                {aPhase === 'done' && (
                  <button type="button" className="seo-link" onClick={runAnalysis}>
                    <Icon n="refresh" s={13} /> {stale ? 'Tekst się zmienił, odśwież' : 'Odśwież'}
                  </button>
                )}
              </p>
              {aPhase === 'idle' && (
                <div className="seo-cta">
                  <p>AI przeczyta cały wpis i powie po polsku, co zmienić, żeby lepiej wypadł w Google. Zwykle trwa to 20-40 sekund.</p>
                  <button type="button" className="seo-btn seo-btn--soft" onClick={runAnalysis} disabled={!input.title && !input.body}>
                    <Icon n="sparkle" s={15} /> Przeanalizuj wpis
                  </button>
                </div>
              )}
              {aPhase === 'error' && (
                <div className="seo-err">
                  <p>{aErr}</p>
                  <button type="button" className="seo-btn seo-btn--soft" onClick={runAnalysis}>
                    Spróbuj ponownie
                  </button>
                </div>
              )}
              {(aPhase === 'loading' || aPhase === 'done') && (
                <>
                  {ai.summary && <p className="seo-summary seo-pop">{ai.summary}</p>}
                  <ul className="seo-tips">
                    {ai.tips.map((t, i) => (
                      <li key={i} className={`seo-tip seo-tip--${t.level} seo-pop`}>
                        <span className="seo-tip__lvl">{LEVEL[t.level]}</span>
                        <strong>{t.title}</strong>
                        <p>{t.text}</p>
                        {t.example && <blockquote>{t.example}</blockquote>}
                      </li>
                    ))}
                  </ul>
                  {aPhase === 'loading' && (
                    <div className="seo-wait">
                      <span className="seo-dots">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span key={waitA} className="seo-wait__t">
                        {ai.tips.length ? 'Piszę kolejne rady…' : waitA}
                      </span>
                    </div>
                  )}
                  {aPhase === 'loading' && !ai.tips.length && (
                    <div className="seo-skel">
                      <i />
                      <i />
                      <i />
                    </div>
                  )}
                  {(ai.title || ai.excerpt) && (
                    <div className="seo-props seo-pop">
                      {ai.title && (
                        <Proposal label="Proponowany tytuł" text={ai.title} len={[40, 60]} disabled={!editable || ai.title === input.title} onUse={() => write({ title: ai.title })} />
                      )}
                      {ai.excerpt && (
                        <Proposal label="Proponowany opis (zajawka)" text={ai.excerpt} len={[120, 160]} disabled={!editable || ai.excerpt === input.excerpt} onUse={() => write({ excerpt: ai.excerpt })} />
                      )}
                    </div>
                  )}
                </>
              )}
            </section>

            {backup && (
              <button type="button" className="seo-undo seo-pop" onClick={() => (write(backup), setBackup(null), toast('Przywrócono poprzednią wersję tekstu.'))}>
                <Icon n="undo" s={15} /> Przywróć tekst sprzed przepisania
              </button>
            )}
          </>
        ) : (
          /* ───────── przepisywanie ───────── */
          <div className="seo-rw">
            <ol className="seo-steps">
              {(['title', 'excerpt', 'body'] as const).map((k, i) => {
                const order = ['wait', 'title', 'excerpt', 'body']
                const cur = order.indexOf(rw.stage)
                const me = i + 1
                const st = rPhase === 'done' || cur > me ? 'done' : cur === me ? 'on' : ''
                return (
                  <li key={k} className={st}>
                    <span>{st === 'done' ? <Icon n="check" s={12} /> : me}</span>
                    {k === 'title' ? 'Tytuł' : k === 'excerpt' ? 'Opis' : 'Treść'}
                  </li>
                )
              })}
            </ol>

            {rPhase === 'error' && (
              <div className="seo-err">
                <p>{rErr}</p>
                <button type="button" className="seo-btn seo-btn--soft" onClick={runRewrite}>
                  Spróbuj ponownie
                </button>
              </div>
            )}

            {rPhase === 'loading' && rw.stage === 'wait' && (
              <div className="seo-wait seo-wait--big">
                <span className="seo-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span key={waitR} className="seo-wait__t">
                  {waitR}
                </span>
              </div>
            )}

            {rPhase === 'done' && (
              <div className="seo-gain seo-pop">
                <Ring score={res.score} size={56} />
                <span className="seo-gain__arrow">
                  <Icon n="right" s={18} />
                </span>
                <Ring score={rwScore} size={56} />
                <div>
                  <strong>{rwScore > res.score ? `+${rwScore - res.score} pkt` : 'Nowa wersja gotowa'}</strong>
                  <small>
                    {analyze({ ...input, ...rw }).stats.words} słów · bez długich myślników
                  </small>
                </div>
              </div>
            )}

            {rPhase === 'done' && (
              <div className="seo-seg" role="group">
                <button type="button" className={view === 'diff' ? 'on' : ''} onClick={() => setView('diff')}>
                  Zmiany
                </button>
                <button type="button" className={view === 'new' ? 'on' : ''} onClick={() => setView('new')}>
                  Nowa wersja
                </button>
              </div>
            )}

            {(rw.title || rw.stage !== 'wait') && (
              <RwBlock label="Tytuł" before={input.title} after={rw.title} live={rPhase === 'loading' && rw.stage === 'title'} diff={rPhase === 'done' && view === 'diff'} />
            )}
            {(rw.excerpt || rw.stage === 'excerpt' || rw.stage === 'body') && (
              <RwBlock label="Opis (zajawka)" before={input.excerpt} after={rw.excerpt} live={rPhase === 'loading' && rw.stage === 'excerpt'} diff={rPhase === 'done' && view === 'diff'} />
            )}
            {(rw.body || rw.stage === 'body') && <RwBlock label="Treść" before={input.body} after={rw.body} live={rPhase === 'loading' && rw.stage === 'body'} diff={rPhase === 'done' && view === 'diff'} body />}
          </div>
        )}
      </div>

      <footer className="seo__foot">
        {!rewriting ? (
          <button type="button" className="seo-btn seo-btn--magic" disabled={!editable || (!input.title && !input.body)} onClick={runRewrite} title={editable ? '' : 'Twoja rola nie pozwala zmieniać wpisów'}>
            <Icon n="wand" s={17} />
            <span>Przepisz według zaleceń</span>
          </button>
        ) : rPhase === 'loading' ? (
          <button type="button" className="seo-btn seo-btn--ghost" onClick={() => (ctl.current?.abort(), setRPhase('idle'), setRRaw(''))}>
            Zatrzymaj
          </button>
        ) : (
          <>
            <button type="button" className="seo-btn seo-btn--ghost" onClick={() => (setRPhase('idle'), setRRaw(''))}>
              Odrzuć
            </button>
            {rPhase === 'done' && (
              <button type="button" className="seo-btn seo-btn--magic" onClick={apply} disabled={!rw.body && !rw.title}>
                <Icon n="check" s={17} />
                <span>Zastosuj zmiany</span>
              </button>
            )}
          </>
        )}
      </footer>
    </aside>
  )
}

const fold2 = (s: string) => s.trim().toLowerCase()

function CheckRow({ c, i }: { c: Check; i: number }) {
  return (
    <li className={`seo-chk seo-chk--${c.level}`} style={{ '--d': i } as any}>
      <span className="seo-chk__ic">
        <Icon n={c.level === 'good' ? 'check' : c.level === 'warn' ? 'info' : 'x'} s={12} />
      </span>
      <div>
        <strong>{c.label}</strong>
        <p>{c.detail}</p>
      </div>
    </li>
  )
}

function Proposal({ label, text, len, onUse, disabled }: { label: string; text: string; len: [number, number]; onUse: () => void; disabled: boolean }) {
  const n = text.length
  const ok = n >= len[0] && n <= len[1]
  return (
    <div className="seo-prop">
      <p className="seo-prop__l">
        {label} <span className={ok ? 'seo-t--good' : 'seo-t--warn'}>{n} zn.</span>
      </p>
      <p className="seo-prop__t">{text}</p>
      <button type="button" className="seo-link" onClick={onUse} disabled={disabled}>
        {disabled ? 'Wstawione' : 'Wstaw do wpisu'}
      </button>
    </div>
  )
}

/** Nowy tekst podzielony na akapity, z podświetleniem słów, których wcześniej nie było. */
function marked(before: string, after: string) {
  const parts = diffWords(before, after)
  if (!parts) return null
  const paras: { t: string; k: 'same' | 'add' }[][] = [[]]
  for (const p of parts) {
    if (p.k === 'del') continue
    const chunks = p.t.split(/(\n\s*\n)/)
    chunks.forEach((c, i) => {
      if (i % 2 === 1) paras.push([])
      else if (c) paras[paras.length - 1].push({ t: c, k: p.k as 'same' | 'add' })
    })
  }
  return paras.filter((x) => x.some((s) => s.t.trim()))
}

function RwBlock({ label, before, after, live, diff, body }: { label: string; before: string; after: string; live: boolean; diff: boolean; body?: boolean }) {
  const [old, setOld] = useState(false)
  const paras = useMemo(() => (diff ? marked(before, noDashes(after)) : null), [diff, before, after])
  const caret = live ? <span className="seo-caret" /> : null
  const render = (s: string) => {
    if (!body)
      return (
        <>
          {s}
          {caret}
        </>
      )
    const ps = s.split(/\n\s*\n/)
    return ps.map((p, i) => {
      const c = i === ps.length - 1 ? caret : null
      return p.startsWith('## ') ? (
        <h4 key={i}>
          {p.slice(3)}
          {c}
        </h4>
      ) : (
        <p key={i}>
          {p}
          {c}
        </p>
      )
    })
  }
  const renderMarked = () =>
    paras!.map((segs, i) => {
      const head = body && segs.map((x) => x.t).join('').trimStart().startsWith('## ')
      let cut = head
      const inner = segs.map((x, j) => {
        let t = x.t
        if (cut) {
          const m = t.match(/^\s*##\s?/)
          if (m) (t = t.slice(m[0].length)), (cut = false)
        }
        return x.k === 'add' ? <ins key={j}>{t}</ins> : <span key={j}>{t}</span>
      })
      return head ? <h4 key={i}>{inner}</h4> : body ? <p key={i}>{inner}</p> : <span key={i}>{inner}</span>
    })
  return (
    <section className={`seo-rwb seo-pop ${live ? 'is-live' : ''}`}>
      <p className="seo-rwb__l">
        {label}
        {diff && before.trim() && (
          <button type="button" className="seo-old-t" onClick={() => setOld(!old)}>
            {old ? 'Ukryj poprzednią' : 'Poprzednia wersja'}
          </button>
        )}
      </p>
      {diff && old && <div className="seo-old">{body ? render(before) : before}</div>}
      <div className={`seo-rwb__t ${body ? 'seo-rwb__t--body' : ''} ${diff ? 'seo-marked' : ''}`}>{diff && paras ? renderMarked() : render(noDashes(after))}</div>
    </section>
  )
}
