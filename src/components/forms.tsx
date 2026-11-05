import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { href, type Locale } from '../i18n'
import { insertRow } from '../lib/supabase'
import { useLocale } from './ui'

type Status = 'idle' | 'sending' | 'ok' | 'error'

const L = {
  send: { pl: 'Wyślij', en: 'Send' },
  sending: { pl: 'Wysyłanie…', en: 'Sending…' },
  error: { pl: 'Nie udało się wysłać. Spróbuj ponownie lub napisz do nas e-mailem.', en: 'Could not send. Please try again or e-mail us.' },
  name: { pl: 'Imię i nazwisko', en: 'Full name' },
  email: { pl: 'E-mail', en: 'E-mail' },
  phone: { pl: 'Telefon', en: 'Phone' },
  company: { pl: 'Firma', en: 'Company' },
  message: { pl: 'Wiadomość', en: 'Message' },
}

function Consent({ l, name, children }: { l: Locale; name: string; children?: ReactNode }) {
  return (
    <label className="check">
      <input type="checkbox" name={name} required />
      <span>
        {children ??
          (l === 'pl' ? (
            <>
              Akceptuję <Link to={href(l, 'privacy')}>politykę prywatności</Link> i zgadzam się na kontakt w sprawie zgłoszenia.
            </>
          ) : (
            <>
              I accept the <Link to={href(l, 'privacy')}>privacy policy</Link> and agree to be contacted about my request.
            </>
          ))}
      </span>
    </label>
  )
}

export type Field = {
  name: string
  label: { pl: string; en: string }
  type?: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'number'
  required?: boolean
  options?: { value: string; label: { pl: string; en: string } }[]
  wide?: boolean
}

const CORE = new Set(['name', 'email', 'phone', 'company', 'topic', 'message'])

/** Jeden formularz dla wystawców, partnerów, mediów i kontaktu → tabela `leads`. */
export function LeadForm({
  kind,
  fields,
  submitLabel,
  success,
}: {
  kind: 'exhibitor' | 'partner' | 'media' | 'contact'
  fields: Field[]
  submitLabel?: { pl: string; en: string }
  success: { pl: string; en: string }
}) {
  const l = useLocale()
  const { pathname } = useLocation()
  const [status, setStatus] = useState<Status>('idle')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (fd.get('website')) return // pułapka na boty
    const row: Record<string, unknown> = { kind, locale: l, consent_privacy: true, source_path: pathname }
    const details: Record<string, string> = {}
    for (const f of fields) {
      const v = String(fd.get(f.name) ?? '').trim()
      if (!v) continue
      if (CORE.has(f.name)) row[f.name] = v
      else details[f.name] = v
    }
    row.details = details
    setStatus('sending')
    try {
      await insertRow('leads', row)
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'ok')
    return (
      <div className="form-ok" role="status">
        <span className="form-ok__icon">✓</span>
        <p>{success[l]}</p>
      </div>
    )

  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="form__grid">
        {fields.map((f) => (
          <label key={f.name} className={`field ${f.wide || f.type === 'textarea' ? 'field--wide' : ''}`}>
            <span className="field__label">
              {f.label[l]}
              {f.required && ' *'}
            </span>
            {f.type === 'textarea' ? (
              <textarea name={f.name} rows={5} required={f.required} maxLength={4000} />
            ) : f.type === 'select' ? (
              <select name={f.name} required={f.required} defaultValue="">
                <option value="" disabled>
                  {l === 'pl' ? 'Wybierz…' : 'Choose…'}
                </option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label[l]}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name={f.name}
                type={f.type ?? 'text'}
                required={f.required}
                autoComplete={f.name === 'name' ? 'name' : f.name === 'email' ? 'email' : f.name === 'phone' ? 'tel' : f.name === 'company' ? 'organization' : 'off'}
              />
            )}
          </label>
        ))}
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
      <Consent l={l} name="consent" />
      <div className="form__foot">
        <button className="btn btn--dark" type="submit" disabled={status === 'sending'}>
          <span>{status === 'sending' ? L.sending[l] : (submitLabel ?? L.send)[l]}</span>
        </button>
        {status === 'error' && <p className="form__err">{L.error[l]}</p>}
      </div>
    </form>
  )
}

export const baseFields: Field[] = [
  { name: 'name', label: L.name, required: true },
  { name: 'email', label: L.email, type: 'email', required: true },
  { name: 'phone', label: L.phone, type: 'tel' },
  { name: 'company', label: L.company },
]

export function NewsletterForm({ dark = false }: { dark?: boolean }) {
  const l = useLocale()
  const [segment, setSegment] = useState('visitor')
  const [status, setStatus] = useState<Status>('idle')
  const segments = [
    { v: 'visitor', label: { pl: 'Odwiedzam targi', en: 'I’m visiting' } },
    { v: 'professional', label: { pl: 'Pracuję w beauty', en: 'I work in beauty' } },
    { v: 'exhibitor', label: { pl: 'Chcę wystawiać', en: 'I want to exhibit' } },
  ]

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (fd.get('website')) return
    setStatus('sending')
    try {
      await insertRow('newsletter_subscribers', {
        email: String(fd.get('email')).trim().toLowerCase(),
        segment,
        locale: l,
        consent_marketing: true,
      })
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'ok')
    return (
      <p className={`nl__ok ${dark ? 'nl__ok--dark' : ''}`} role="status">
        {l === 'pl' ? 'Dziękujemy! Jesteś na liście — damy znać o starcie sprzedaży.' : 'Thank you! You’re on the list — we’ll let you know when sales open.'}
      </p>
    )

  return (
    <form className={`nl ${dark ? 'nl--dark' : ''}`} onSubmit={onSubmit}>
      <div className="nl__segments" role="radiogroup" aria-label={l === 'pl' ? 'Kim jesteś?' : 'Who are you?'}>
        {segments.map((s) => (
          <button
            type="button"
            role="radio"
            aria-checked={segment === s.v}
            key={s.v}
            className={`chip ${segment === s.v ? 'chip--on' : ''}`}
            onClick={() => setSegment(s.v)}
          >
            {s.label[l]}
          </button>
        ))}
      </div>
      <div className="nl__row">
        <input type="email" name="email" required placeholder={l === 'pl' ? 'Twój e-mail' : 'Your e-mail'} aria-label="E-mail" autoComplete="email" />
        <button className="btn btn--dark" type="submit" disabled={status === 'sending'}>
          <span>{l === 'pl' ? 'Zapisz mnie' : 'Sign me up'}</span>
        </button>
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
      <Consent l={l} name="consent">
        {l === 'pl'
          ? 'Zgadzam się na otrzymywanie informacji marketingowych od organizatora Beauty & Hair Expo. Zgodę mogę wycofać w każdej chwili.'
          : 'I agree to receive marketing e-mails from the Beauty & Hair Expo organiser. I can withdraw consent at any time.'}
      </Consent>
      {status === 'error' && <p className="form__err">{L.error[l]}</p>}
    </form>
  )
}
