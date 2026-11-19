// Haki z bazy (pg_net): nowe zgłoszenie / zapis na newsletter → e-mail powitalny i powiadomienia dla zespołu.
// GET ?u=<id>&s=<podpis> → wypisanie z newslettera jednym kliknięciem.
// Wdrażana bez weryfikacji JWT: chroni ją sekret HOOK_SECRET (nagłówek x-hook-secret) albo podpis HMAC linku.
import { service } from '../_shared/auth.ts'
import { FROM, esc, send, staffMail, welcomeMail } from '../_shared/mail.ts'
import { PANEL_URL, SITE_URL, loadNotify, loadSite } from '../_shared/site.ts'

const SECRET = Deno.env.get('HOOK_SECRET') ?? ''
const FN_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/notify`

async function sign(v: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const s = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(`unsub:${v}`)))
  return Array.from(s.slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('')
}
const KIND: Record<string, string> = { exhibitor: 'Wystawca', partner: 'Partner / reklama', media: 'Media (akredytacja)', contact: 'Kontakt' }
const SEG: Record<string, string> = { visitor: 'Odwiedzający', professional: 'Specjaliści beauty', exhibitor: 'Wystawcy' }

function page(title: string, text: string) {
  return new Response(
    `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f4f0ea;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#26221f;display:grid;place-items:center;min-height:100vh">
<main style="max-width:520px;padding:40px 24px"><div style="font-size:40px;font-weight:600;letter-spacing:-1.5px">Beauty &amp; Hair</div>
<div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#7d6139;margin:8px 0 34px">Expo · Rzeszów 2028</div>
<h1 style="font-family:Georgia,serif;font-weight:400;font-size:30px;margin:0 0 12px">${esc(title)}</h1><p style="font-size:16px;line-height:1.6;color:#5a524a">${text}</p>
<p style="margin-top:28px"><a href="${SITE_URL}" style="color:#7d6139;font-weight:600;text-decoration:none">ohtargi.pl &rarr;</a></p></main></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

Deno.serve(async (req) => {
  const db = service()
  const url = new URL(req.url)

  // wypisanie z newslettera
  if (req.method === 'GET' && url.searchParams.get('u')) {
    const id = url.searchParams.get('u')!
    if ((await sign(id)) !== url.searchParams.get('s')) return page('Link jest nieprawidłowy', 'Skopiuj cały link z wiadomości albo odpisz na e-mail, a wypiszemy Cię ręcznie.')
    const { data: sub } = await db.from('newsletter_subscribers').select('email').eq('id', id).maybeSingle()
    if (sub) {
      await db.from('newsletter_subscribers').delete().eq('id', id)
      const n = await loadNotify(db)
      if (n.newsletter.length) {
        const site = await loadSite(db)
        await send({ from: FROM.system, to: n.newsletter, ...staffMail(site, `Wypis z newslettera: ${sub.email}`, [['E-mail', sub.email]], { href: `${PANEL_URL}#/newsletter`, label: 'Newsletter w panelu' }) })
      }
    }
    return page('Wypisano z newslettera', 'Nie będziemy już wysyłać Ci wiadomości. Jeśli to pomyłka, zapisz się ponownie na stronie.')
  }

  if (req.method !== 'POST' || !SECRET || req.headers.get('x-hook-secret') !== SECRET) return new Response('forbidden', { status: 403 })
  try {
    const { event, id } = await req.json()
    const notify = await loadNotify(db)
    const site = await loadSite(db)

    if (event === 'newsletter') {
      const { data: s } = await db.from('newsletter_subscribers').select('*').eq('id', id).maybeSingle()
      if (!s) return new Response('gone')
      if (notify.welcome) {
        const unsub = `${FN_URL}?u=${s.id}&s=${await sign(s.id)}`
        const m = welcomeMail(site, s.locale === 'en' ? 'en' : 'pl', s.segment, unsub)
        await send({ from: FROM.hello, to: [s.email], reply_to: notify.replyTo, ...m, headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } })
      }
      if (notify.newsletter.length)
        await send({ from: FROM.system, to: notify.newsletter, ...staffMail(site, `Nowy zapis na newsletter: ${s.email}`, [['E-mail', s.email], ['Grupa', SEG[s.segment] ?? s.segment], ['Język', s.locale.toUpperCase()]], { href: `${PANEL_URL}#/newsletter`, label: 'Newsletter w panelu' }) })
    }

    if (event === 'lead' && notify.lead.length) {
      const { data: l } = await db.from('leads').select('*').eq('id', id).maybeSingle()
      if (l) {
        const m = staffMail(
          site,
          `Nowe zgłoszenie (${KIND[l.kind] ?? l.kind}): ${l.company || l.name}`,
          [['Rodzaj', KIND[l.kind] ?? l.kind], ['Osoba', l.name], ['Firma', l.company ?? ''], ['E-mail', l.email], ['Telefon', l.phone ?? ''], ['Temat', l.topic ?? ''], ['Wiadomość', (l.message ?? '').slice(0, 1500)], ['NIP', l.details?.nip ?? '']],
          { href: l.contact_id ? `${PANEL_URL}#/crm/o/${l.contact_id}` : `${PANEL_URL}#/leads`, label: 'Otwórz kartę klienta' },
        )
        await send({ from: FROM.system, to: notify.lead, reply_to: l.email, ...m })
      }
    }
    return new Response('ok')
  } catch (e) {
    console.error(e)
    return new Response(String(e), { status: 500 })
  }
})
