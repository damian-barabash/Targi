// Skaner biletów przy wejściu: kamera telefonu → kod QR → check_in w bazie → duży wynik (kolor, dźwięk, wibracja).
import { useCallback, useEffect, useRef, useState } from 'react'
import { rpc } from '../api'
import { errText, signOut, useStore } from '../store'
import { Icon } from '../ui'
import './scanner.css'

type Res = {
  result: 'ok' | 'reentry' | 'again' | 'not_today' | 'cancelled' | 'unknown' | 'forced'
  code: string; type?: string; holder?: string; dates?: string[]; catering?: boolean; reentry?: boolean; first?: string | null; order?: string; kind?: string; entries?: number
}
type Stats = { today: number; reentry: number; rejected: number; mine: number }

const VIEW: Record<Res['result'], { tone: 'ok' | 'warn' | 'bad'; title: string; icon: string }> = {
  ok: { tone: 'ok', title: 'Wejście OK', icon: 'check' },
  forced: { tone: 'ok', title: 'Wpuszczono ręcznie', icon: 'check' },
  reentry: { tone: 'ok', title: 'Ponowne wejście', icon: 'refresh' },
  again: { tone: 'bad', title: 'Bilet już użyty dziś', icon: 'x' },
  not_today: { tone: 'warn', title: 'Bilet na inny dzień', icon: 'calendar' },
  cancelled: { tone: 'bad', title: 'Bilet anulowany', icon: 'x' },
  unknown: { tone: 'bad', title: 'Nieznany kod', icon: 'x' },
}
const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
const hm = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '')

function beep(ok: boolean) {
  try {
    const A = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext
    const ctx = new A()
    const tones = ok ? [880, 1320] : [220, 180]
    tones.forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = f
      o.type = ok ? 'sine' : 'square'
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.13)
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.13 + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.13 + 0.12)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + i * 0.13)
      o.stop(ctx.currentTime + i * 0.13 + 0.13)
    })
    setTimeout(() => ctx.close(), 600)
  } catch {
    /* brak dźwięku */
  }
  navigator.vibrate?.(ok ? 80 : [120, 60, 120])
}

export default function Scanner({ standalone }: { standalone?: boolean }) {
  const me = useStore((s) => s.me!)
  const canForce = me.role === 'admin' || me.role === 'tickets'
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const busy = useRef(false)
  const last = useRef<{ code: string; at: number }>({ code: '', at: 0 })
  const [cam, setCam] = useState<'off' | 'starting' | 'on' | 'error'>('off')
  const [camErr, setCamErr] = useState('')
  const [res, setRes] = useState<Res | null>(null)
  const [checking, setChecking] = useState(false)
  const [manual, setManual] = useState('')
  const [hist, setHist] = useState<(Res & { at: number })[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [err, setErr] = useState('')

  const loadStats = () => rpc<Stats>('scan_stats').then(setStats).catch(() => {})
  useEffect(() => {
    loadStats()
    const t = setInterval(loadStats, 30000)
    return () => (clearInterval(t), stop())
  }, [])

  const check = useCallback(
    async (raw: string, force = false) => {
      if (busy.current) return
      busy.current = true
      setChecking(true)
      setErr('')
      try {
        const r = await rpc<Res>('check_in', { p_code: raw, p_force: force })
        setRes(r)
        setHist((h) => [{ ...r, at: Date.now() }, ...h].slice(0, 12))
        beep(VIEW[r.result].tone === 'ok')
        loadStats()
      } catch (e) {
        setErr(errText(e))
        beep(false)
      }
      setChecking(false)
      busy.current = false
    },
    [],
  )

  // automatyczne zamknięcie wyniku po udanym wejściu
  useEffect(() => {
    if (!res || VIEW[res.result].tone !== 'ok') return
    const t = setTimeout(() => setRes(null), 2600)
    return () => clearTimeout(t)
  }, [res])

  async function start() {
    setCam('starting')
    setCamErr('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      stream.current = s
      const v = video.current!
      v.srcObject = s
      v.setAttribute('playsinline', 'true')
      await v.play()
      setCam('on')
      const { default: jsQR } = await import('jsqr')
      const ctx = canvas.current!.getContext('2d', { willReadFrequently: true })!
      let lastT = 0
      const loop = (t: number) => {
        if (!stream.current) return
        if (t - lastT > 140 && !busy.current && v.readyState >= 2) {
          lastT = t
          const w = 640
          const h = Math.round((v.videoHeight / v.videoWidth) * w) || 360
          canvas.current!.width = w
          canvas.current!.height = h
          ctx.drawImage(v, 0, 0, w, h)
          const q = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })
          if (q?.data) {
            const now = Date.now()
            if (!(q.data === last.current.code && now - last.current.at < 4000) && !document.querySelector('.scan-res')) {
              last.current = { code: q.data, at: now }
              check(q.data)
            }
          }
        }
        requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    } catch (e: any) {
      setCam('error')
      setCamErr(/Permission|NotAllowed/i.test(String(e?.name ?? e)) ? 'Brak zgody na kamerę. Zezwól na dostęp w ustawieniach przeglądarki i spróbuj ponownie.' : 'Nie udało się włączyć kamery. Wpisz kod ręcznie poniżej.')
    }
  }
  function stop() {
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    setCam('off')
  }

  const v = res ? VIEW[res.result] : null
  return (
    <div className={`scan ${standalone ? 'scan--solo' : ''}`}>
      <header className="scan__top">
        <div className="scan__brand">
          <span>B&amp;H</span>
          <div>
            <strong>Skaner biletów</strong>
            <small>{me.name || me.email}</small>
          </div>
        </div>
        {standalone && (
          <button type="button" className="scan__out" onClick={signOut} title="Wyloguj">
            <Icon n="logout" s={18} />
          </button>
        )}
      </header>

      <div className="scan__stats">
        {(
          [
            ['Weszło', stats?.today],
            ['Moje', stats?.mine],
            ['Powroty', stats?.reentry],
            ['Odmowy', stats?.rejected],
          ] as const
        ).map(([l, n], i) => (
          <div key={l} className={i === 3 && n ? 'bad' : ''}>
            <span>{l}</span>
            <b key={n ?? 'x'}>{n ?? '—'}</b>
          </div>
        ))}
      </div>

      <div className={`scan__cam scan__cam--${cam} ${checking ? 'is-checking' : ''}`}>
        <video ref={video} muted playsInline />
        <canvas ref={canvas} hidden />
        {cam === 'on' && (
          <div className="scan__frame" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <span className="scan__line" />
          </div>
        )}
        {cam !== 'on' && (
          <div className="scan__idle">
            <span className="scan__idleic">
              <Icon n="target" s={26} />
            </span>
            <p>{cam === 'error' ? camErr : 'Włącz kamerę i skieruj ją na kod QR z biletu.'}</p>
            <button type="button" className="scan__go" onClick={start} disabled={cam === 'starting'}>
              {cam === 'starting' ? 'Włączam…' : 'Włącz kamerę'}
            </button>
          </div>
        )}
        {checking && <div className="scan__checking">Sprawdzam…</div>}
        {cam === 'on' && (
          <button type="button" className="scan__stop" onClick={stop}>
            <Icon n="x" s={14} /> Wyłącz
          </button>
        )}
      </div>

      <form
        className="scan__manual"
        onSubmit={(e) => {
          e.preventDefault()
          if (manual.trim()) check(manual.trim()), setManual('')
        }}
      >
        <input value={manual} onChange={(e) => setManual(e.target.value.toUpperCase())} placeholder="Kod z biletu, np. K7MPQ-2XRTA" autoCapitalize="characters" autoComplete="off" spellCheck={false} />
        <button type="submit" disabled={!manual.trim()}>
          Sprawdź
        </button>
      </form>
      {err && <p className="scan__err">{err}</p>}

      {hist.length > 0 && <p className="scan__h">Ostatnie skany</p>}
      {hist.length > 0 && (
        <ul className="scan__hist">
          {hist.map((h) => (
            <li key={h.at} className={`t-${VIEW[h.result].tone}`}>
              <i />
              <span>
                <strong>{VIEW[h.result].title}</strong>
                <small>{[h.type, h.holder, h.code].filter(Boolean).join(' · ')}</small>
              </span>
              <time>{new Date(h.at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</time>
            </li>
          ))}
        </ul>
      )}

      {res && v && (
        <div className={`scan-res scan-res--${v.tone}`} onClick={() => setRes(null)} role="alert">
          <span className="scan-res__pulse" aria-hidden="true" />
          <div className="scan-res__ic" aria-hidden="true">
            <svg viewBox="0 0 52 52" width="76" height="76" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="26" cy="26" r="23" className="scan-res__ring" />
              <path className="scan-res__mark" d={v.tone === 'ok' ? 'M15 27l8 8 15-17' : v.tone === 'warn' ? 'M26 14v15M26 37v.4' : 'M18 18l16 16M34 18L18 34'} />
            </svg>
          </div>
          <h2>{v.title}</h2>
          <p className="scan-res__sub">
            {res.result === 'reentry' && res.first && <>Pierwsze wejście dziś o {hm(res.first)}</>}
            {res.result === 'again' && <>Wszedł(a) dziś{res.first ? ` o ${hm(res.first)}` : ''}. Ten bilet nie pozwala na ponowne wejście.</>}
            {res.result === 'not_today' && res.dates && <>Ważny: {res.dates.map(day).join(', ')}</>}
            {res.result === 'unknown' && <>Tego kodu nie ma w systemie. Poproś o bilet z e-maila.</>}
            {res.result === 'cancelled' && <>Bilet został anulowany. Skieruj gościa do kasy.</>}
          </p>
          {res.type && (
            <div className="scan-stub">
              <strong>{res.type}</strong>
              {res.holder && <span className="scan-stub__who">{res.holder}</span>}
              <div className="scan-stub__tags">
                {res.catering && <i>Catering</i>}
                {res.kind === 'invitation' && <i>Zaproszenie</i>}
                {res.reentry === false && <i>Jedno wejście</i>}
              </div>
              <div className="scan-stub__foot">
                <span>{res.order}</span>
                <span>{res.code}</span>
              </div>
            </div>
          )}
          {!res.type && <p className="scan-res__code">{res.code}</p>}
          {res.result === 'not_today' && canForce && (
            <button
              type="button"
              className="scan-res__force"
              onClick={(e) => {
                e.stopPropagation()
                const c = res.code
                setRes(null)
                check(c, true)
              }}
            >
              Wpuść mimo to
            </button>
          )}
          <p className="scan-res__tap">{v.tone === 'ok' ? 'Następny gość…' : 'Dotknij, aby skanować dalej'}</p>
          {v.tone === 'ok' && <span className="scan-res__bar" aria-hidden="true" />}
        </div>
      )}
    </div>
  )
}
