// E-maile w stylu strony (krem, grafit, przygaszone złoto, proste kąty) + wysyłka przez Resend.
import { SITE_URL, PANEL_URL, dayText, money, tr, type Site } from './site.ts'

const C = { bg: '#f4f0ea', paper: '#fbf9f6', ink: '#26221f', ink2: '#5a524a', mute: '#8a8178', gold: '#b79c6b', goldDark: '#7d6139', band: '#e4d6b9', line: '#e2d9cb' }
const SANS = "'Instrument Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const SERIF = "Newsreader, Georgia, 'Times New Roman', serif"
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export type Attachment = { filename: string; content: string; content_id?: string; content_type?: string }
export type Mail = { from: string; to: string[]; subject: string; html: string; text?: string; reply_to?: string; attachments?: Attachment[]; headers?: Record<string, string> }

export const FROM = {
  tickets: 'Beauty & Hair Expo <bilety@ohtargi.pl>',
  hello: 'Beauty & Hair Expo <newsletter@ohtargi.pl>',
  system: 'Panel Beauty & Hair Expo <powiadomienia@ohtargi.pl>',
}

export async function send(m: Mail): Promise<{ id?: string; error?: string }> {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) return { error: 'RESEND_API_KEY not set' }
  if (!m.to.length) return { error: 'no recipients' }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(m),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('resend', res.status, JSON.stringify(j).slice(0, 400))
    return { error: j?.message ?? `HTTP ${res.status}` }
  }
  return { id: j.id }
}

/* ───────── układ ───────── */
function layout({ site, l, preheader, body, foot }: { site: Site; l: 'pl' | 'en'; preheader: string; body: string; foot?: string }) {
  const e = site.event
  return `<!doctype html><html lang="${l}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(e.brand)}</title>
<style>
@media (max-width:620px){.wrap{width:100%!important}.pad{padding-left:22px!important;padding-right:22px!important}.mark{font-size:38px!important}.stack{display:block!important;width:100%!important}.qrcell{padding:18px 0 0!important;text-align:left!important}}
a{color:${C.goldDark}}
</style></head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg}">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:28px 12px 40px">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px">
<tr><td class="pad" style="padding:8px 36px 22px">
  <div class="mark" style="font-family:${SANS};font-size:46px;line-height:1;font-weight:600;letter-spacing:-2px;color:${C.ink}">Beauty &amp; Hair</div>
  <div style="font-family:${SANS};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${C.goldDark};padding-top:10px">Expo · ${esc(e.edition)}</div>
</td></tr>
<tr><td style="background:#ffffff;border-top:3px solid ${C.gold}">${body}</td></tr>
<tr><td class="pad" style="padding:26px 36px 0;font-family:${SANS};font-size:12px;line-height:1.7;color:${C.mute}">
  <strong style="color:${C.ink2};font-weight:600">${esc(e.dates[l])} · ${esc(e.venue)}</strong><br>
  ${esc(e.address)}<br>
  ${l === 'pl' ? 'Organizator' : 'Organiser'}: ${esc(e.organizer)} · <a href="${SITE_URL}" style="color:${C.goldDark};text-decoration:none">ohtargi.pl</a>
  ${foot ? `<br><br>${foot}` : ''}
</td></tr>
</table></td></tr></table></body></html>`
}

const h1 = (s: string) => `<h1 style="margin:0 0 14px;font-family:${SERIF};font-weight:400;font-size:32px;line-height:1.15;color:${C.ink}">${s}</h1>`
const p = (s: string, extra = '') => `<p style="margin:0 0 14px;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.ink2};${extra}">${s}</p>`
const kicker = (s: string) => `<div style="font-family:${SANS};font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:${C.goldDark};padding-bottom:12px">${s}</div>`
const btn = (href: string, label: string, dark = true) =>
  `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${dark ? C.ink : C.band}"><a href="${href}" style="display:inline-block;padding:14px 26px;font-family:${SANS};font-size:14px;font-weight:600;letter-spacing:.3px;color:${dark ? '#ffffff' : C.ink};text-decoration:none">${label} &rarr;</a></td></tr></table>`
const row = (k: string, v: string) =>
  `<tr><td style="padding:9px 0;border-bottom:1px solid ${C.line};font-family:${SANS};font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${C.mute};width:130px;vertical-align:top">${k}</td><td style="padding:9px 0;border-bottom:1px solid ${C.line};font-family:${SANS};font-size:14px;color:${C.ink}">${v}</td></tr>`

/* ───────── bilety ───────── */
export type MailTicket = { code: string; type_name: string; valid_dates: string[]; catering: boolean; holder_name: string | null; price: number }
export type MailOrder = { number: string; kind: string; buyer_name: string; buyer_email: string; total: number; locale: 'pl' | 'en'; items: { label: string; qty: number; sum: number }[] }

export function ticketMail(site: Site, o: MailOrder, tickets: MailTicket[]) {
  const l = o.locale
  const pl = l === 'pl'
  const first = (o.buyer_name || '').split(' ')[0]
  const inv = o.kind === 'invitation'
  const blocks = tickets
    .map(
      (t, i) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;background:${C.paper};border:1px solid ${C.line}">
<tr><td class="stack" style="padding:22px 24px;vertical-align:top">
  ${kicker(`${pl ? 'Bilet' : 'Ticket'} ${tickets.length > 1 ? `${i + 1}/${tickets.length}` : ''}`)}
  <div style="font-family:${SERIF};font-size:24px;line-height:1.2;color:${C.ink};padding-bottom:12px">${esc(t.type_name)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${row(pl ? 'Ważny' : 'Valid', t.valid_dates.map((d) => esc(dayText(d, l))).join('<br>'))}
    ${row(pl ? 'Godziny' : 'Hours', esc(site.event.hours))}
    ${t.holder_name ? row(pl ? 'Osoba' : 'Holder', esc(t.holder_name)) : ''}
    ${row('Catering', t.catering ? (pl ? 'tak' : 'yes') : pl ? 'nie' : 'no')}
    ${row(pl ? 'Kod' : 'Code', `<span style="font-family:Menlo,Consolas,monospace;letter-spacing:1px">${esc(t.code)}</span>`)}
  </table>
  <div style="padding-top:16px"><a href="${SITE_URL}/bilet/?k=${encodeURIComponent(t.code)}" style="font-family:${SANS};font-size:13px;font-weight:600;color:${C.goldDark};text-decoration:none">${pl ? 'Otwórz bilet online' : 'Open ticket online'} &rarr;</a></div>
</td>
<td class="stack qrcell" width="190" style="padding:22px 24px 22px 0;vertical-align:top;text-align:right">
  <img src="cid:qr-${esc(t.code)}" width="170" height="170" alt="QR ${esc(t.code)}" style="display:inline-block;width:170px;height:170px;border:0">
</td></tr></table>`,
    )
    .join('')
  const summary = inv
    ? ''
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 24px">
${o.items.map((x) => `<tr><td style="padding:7px 0;font-family:${SANS};font-size:14px;color:${C.ink2}">${x.qty} × ${esc(x.label)}</td><td align="right" style="padding:7px 0;font-family:${SANS};font-size:14px;color:${C.ink2}">${money(x.sum, l)}</td></tr>`).join('')}
<tr><td style="padding:12px 0 0;border-top:1px solid ${C.ink};font-family:${SANS};font-size:15px;font-weight:600;color:${C.ink}">${pl ? 'Razem' : 'Total'}</td><td align="right" style="padding:12px 0 0;border-top:1px solid ${C.ink};font-family:${SANS};font-size:15px;font-weight:600;color:${C.ink}">${money(o.total, l)}</td></tr></table>`
  const body = `<div class="pad" style="padding:34px 36px 30px">
${kicker(`${pl ? 'Zamówienie' : 'Order'} ${esc(o.number)}`)}
${h1(inv ? (pl ? 'Zaproszenie na Beauty &amp; Hair Expo' : 'Your invitation to Beauty &amp; Hair Expo') : pl ? `Dziękujemy${first ? `, ${esc(first)}` : ''}! Oto Twoje bilety` : `Thank you${first ? `, ${esc(first)}` : ''}! Here are your tickets`)}
${p(pl ? `Przy wejściu pokaż kod QR na telefonie albo wydrukowany. Każdy kod wpuszcza jedną osobę. Wszystkie bilety są też w załączonym pliku PDF.` : `Show the QR code at the entrance, on your phone or printed. Each code admits one person. All tickets are also in the attached PDF.`)}
${summary}
${blocks}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;background:${C.band}"><tr><td style="padding:18px 22px;font-family:${SANS};font-size:13.5px;line-height:1.6;color:${C.ink}">
<strong>${pl ? 'Jak dojechać' : 'Getting there'}:</strong> ${esc(site.event.venue)}, ${esc(site.event.address)}. ${pl ? 'Parking przy hali, 10 min od lotniska Rzeszów-Jasionka.' : 'Parking next to the hall, 10 minutes from Rzeszów-Jasionka airport.'}
</td></tr></table>
</div>`
  return {
    subject: inv ? (pl ? `Zaproszenie na ${site.event.brand} · ${o.number}` : `Your invitation to ${site.event.brand} · ${o.number}`) : pl ? `Twoje bilety na ${site.event.brand} · ${o.number}` : `Your tickets for ${site.event.brand} · ${o.number}`,
    html: layout({ site, l, preheader: pl ? `Bilety z kodem QR · ${site.event.dates.pl} · ${site.event.venue}` : `Tickets with QR code · ${site.event.dates.en}`, body, foot: pl ? 'Pytania o bilety? Odpowiedz na tę wiadomość.' : 'Questions about your tickets? Just reply to this e-mail.' }),
  }
}

/* ───────── newsletter: powitanie ───────── */
export function welcomeMail(site: Site, l: 'pl' | 'en', segment: string, unsubUrl: string) {
  const pl = l === 'pl'
  const seg: Record<string, [string, string]> = { visitor: ['dla odwiedzających', 'for visitors'], professional: ['dla specjalistów beauty', 'for beauty professionals'], exhibitor: ['dla wystawców', 'for exhibitors'] }
  const points = pl
    ? ['Pierwsi dowiesz się o starcie sprzedaży i cenach w przedsprzedaży.', 'Dostaniesz program pokazów, masterclass i nazwiska ekspertów.', 'Raz na jakiś czas: konkursy i zaproszenia od partnerów targów.']
    : ['Be the first to hear when tickets go on sale and about early-bird prices.', 'Get the show programme, masterclasses and expert line-up.', 'Now and then: contests and invitations from our partners.']
  const body = `<div class="pad" style="padding:34px 36px 30px">
${kicker(pl ? `Newsletter ${seg[segment]?.[0] ?? ''}` : `Newsletter ${seg[segment]?.[1] ?? ''}`)}
${h1(pl ? 'Witamy na liście gości Beauty &amp; Hair Expo' : 'Welcome to the Beauty &amp; Hair Expo guest list')}
${p(pl ? 'Dziękujemy za zapis. Będziemy pisać rzadko i tylko wtedy, gdy mamy coś naprawdę wartego uwagi.' : 'Thank you for signing up. We will write rarely, and only when we have something worth your time.')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 26px">
${points.map((x, i) => `<tr><td style="width:44px;padding:12px 0;border-top:1px solid ${C.line};font-family:${SERIF};font-size:22px;color:${C.gold};vertical-align:top">0${i + 1}</td><td style="padding:14px 0;border-top:1px solid ${C.line};font-family:${SANS};font-size:15px;line-height:1.55;color:${C.ink}">${x}</td></tr>`).join('')}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};border:1px solid ${C.line};margin-bottom:26px"><tr><td style="padding:22px 24px">
  ${kicker(pl ? 'Zapisz w kalendarzu' : 'Save the date')}
  <div style="font-family:${SERIF};font-size:26px;line-height:1.2;color:${C.ink}">${esc(site.event.dates[l])}</div>
  <div style="font-family:${SANS};font-size:14px;color:${C.ink2};padding-top:6px">${esc(site.event.venue)} · ${esc(site.event.city[l])} · ${esc(site.event.hours)}</div>
</td></tr></table>
${btn(`${SITE_URL}${pl ? '/bilety' : '/en/tickets'}`, pl ? 'Zobacz bilety' : 'See tickets')}
</div>`
  return {
    subject: pl ? 'Witamy na liście gości Beauty & Hair Expo' : 'Welcome to the Beauty & Hair Expo guest list',
    html: layout({ site, l, preheader: pl ? `${site.event.dates.pl} · ${site.event.venue}. Pierwsi dowiecie się o biletach.` : `${site.event.dates.en} · ${site.event.venue}.`, body, foot: `${pl ? 'Nie chcesz więcej wiadomości?' : 'No longer interested?'} <a href="${unsubUrl}" style="color:${C.mute}">${pl ? 'Wypisz się jednym kliknięciem' : 'Unsubscribe in one click'}</a>.` }),
  }
}

/* ───────── powiadomienia dla zespołu ───────── */
export function staffMail(site: Site, title: string, lines: [string, string][], link: { href: string; label: string }, preheader = title) {
  const body = `<div class="pad" style="padding:28px 36px 30px">
${kicker('Powiadomienie z panelu')}
${h1(esc(title))}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 24px">${lines.filter(([, v]) => v).map(([k, v]) => row(esc(k), esc(v).replace(/\n/g, '<br>'))).join('')}</table>
${btn(link.href, esc(link.label))}
</div>`
  return { subject: title, html: layout({ site, l: 'pl', preheader, body, foot: `Te powiadomienia ustawiasz w panelu: Ustawienia → Powiadomienia e-mail (<a href="${PANEL_URL}#/notify" style="color:${C.mute}">otwórz</a>).` }) }
}

export const ticketLabel = (site: Site, typeId: string, l: 'pl' | 'en') => tr(site.tickets.find((t) => t.id === typeId)?.name, l) || typeId
