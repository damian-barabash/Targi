// PDF z biletami: jedna strona A4 na bilet, w stylu strony (krem, grafit, złoto, linie włosowe).
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'npm:pdf-lib@1.17.1'
import fontkit from 'npm:@pdf-lib/fontkit@1.1.1'
import { SANS, SANS_BOLD, SERIF, SERIF_ITALIC } from './fonts.ts'
import { qrMatrix } from './qr.ts'
import { SITE_URL, dayText, type Site } from './site.ts'
import type { MailOrder, MailTicket } from './mail.ts'

const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255)
const C = { bg: hex('#f4f0ea'), paper: hex('#fbf9f6'), ink: hex('#26221f'), ink2: hex('#5a524a'), mute: hex('#8a8178'), gold: hex('#b79c6b'), goldDark: hex('#7d6139'), band: hex('#e4d6b9'), line: hex('#d9cfbf'), white: rgb(1, 1, 1) }
const bytes = (b: string) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0))
const mm = (v: number) => (v * 72) / 25.4

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const w of para.split(/\s+/)) {
      const next = line ? `${line} ${w}` : w
      if (font.widthOfTextAtSize(next, size) > width && line) (out.push(line), (line = w))
      else line = next
    }
    out.push(line)
  }
  return out
}

function tracked(page: PDFPage, s: string, x: number, y: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>, track = 1.6) {
  let cx = x
  for (const ch of s) {
    page.drawText(ch, { x: cx, y, size, font, color })
    cx += font.widthOfTextAtSize(ch, size) + track
  }
  return cx - x
}

export async function ticketsPdf(site: Site, o: MailOrder, tickets: MailTicket[]): Promise<Uint8Array> {
  const l = o.locale
  const pl = l === 'pl'
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  doc.setTitle(`${pl ? 'Bilety' : 'Tickets'} ${o.number} · ${site.event.brand}`)
  doc.setAuthor(site.event.organizer)
  doc.setCreator('ohtargi.pl')
  const f = {
    sans: await doc.embedFont(bytes(SANS), { subset: true }),
    bold: await doc.embedFont(bytes(SANS_BOLD), { subset: true }),
    serif: await doc.embedFont(bytes(SERIF), { subset: true }),
    italic: await doc.embedFont(bytes(SERIF_ITALIC), { subset: true }),
  }
  const W = mm(210), H = mm(297), M = mm(16)

  tickets.forEach((t, i) => {
    const page = doc.addPage([W, H])
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.white })

    // ───── część biletowa (góra strony)
    const top = H - M
    const tH = mm(150)
    page.drawRectangle({ x: M, y: top - tH, width: W - 2 * M, height: tH, color: C.bg })
    page.drawRectangle({ x: M, y: top - mm(1.2), width: W - 2 * M, height: mm(1.2), color: C.gold })

    // znak słowny
    const pad = mm(11)
    let y = top - pad - 40
    page.drawText('Beauty & Hair', { x: M + pad, y, size: 46, font: f.bold, color: C.ink })
    y -= 22
    tracked(page, `EXPO · ${site.event.edition.toUpperCase()}`, M + pad, y, f.sans, 8.5, C.goldDark, 2.2)
    const lab = `${pl ? 'BILET' : 'TICKET'}${tickets.length > 1 ? ` ${i + 1}/${tickets.length}` : ''}`
    const lw = tracked(page, lab, -1000, -1000, f.sans, 8.5, C.goldDark, 2.2)
    tracked(page, lab, W - M - pad - lw, top - pad - 12, f.sans, 8.5, C.goldDark, 2.2)
    if (o.kind === 'invitation') {
      const iw = f.italic.widthOfTextAtSize(pl ? 'zaproszenie' : 'invitation', 13)
      page.drawText(pl ? 'zaproszenie' : 'invitation', { x: W - M - pad - iw, y: top - pad - 30, size: 13, font: f.italic, color: C.goldDark })
    }

    // QR (prawa kolumna)
    const qrSize = mm(62)
    const qrX = W - M - pad - qrSize
    const qrY = top - mm(118)
    page.drawRectangle({ x: qrX - mm(4), y: qrY - mm(4), width: qrSize + mm(8), height: qrSize + mm(8), color: C.white })
    const mtx = qrMatrix(`${SITE_URL}/bilet/?k=${t.code}`)
    const cell = qrSize / mtx.length
    mtx.forEach((r, ry) => r.forEach((d, rx) => d && page.drawRectangle({ x: qrX + rx * cell, y: qrY + qrSize - (ry + 1) * cell, width: cell + 0.15, height: cell + 0.15, color: C.ink })))
    const cw = f.bold.widthOfTextAtSize(t.code, 11)
    tracked(page, t.code, qrX + qrSize / 2 - (cw + t.code.length * 1.2) / 2, qrY - mm(10), f.bold, 11, C.ink, 1.2)

    // dane biletu (lewa kolumna)
    const colW = qrX - mm(14) - (M + pad)
    let ly = top - mm(52)
    for (const line of wrap(t.type_name, f.serif, 26, colW)) {
      page.drawText(line, { x: M + pad, y: ly, size: 26, font: f.serif, color: C.ink })
      ly -= 30
    }
    ly -= 4
    const rows: [string, string][] = [
      [pl ? 'WAŻNY' : 'VALID', t.valid_dates.map((d) => dayText(d, l)).join('\n')],
      [pl ? 'GODZINY' : 'HOURS', site.event.hours.replace(/[–—]/g, '-')],
      [pl ? 'MIEJSCE' : 'VENUE', `${site.event.venue}\n${site.event.address}`],
      [pl ? 'OSOBA' : 'HOLDER', t.holder_name || o.buyer_name || '-'],
      ['CATERING', t.catering ? (pl ? 'tak' : 'yes') : pl ? 'nie' : 'no'],
      [pl ? 'ZAMÓWIENIE' : 'ORDER', o.number],
    ]
    for (const [k, v] of rows) {
      page.drawLine({ start: { x: M + pad, y: ly + 10 }, end: { x: M + pad + colW, y: ly + 10 }, thickness: 0.5, color: C.line })
      tracked(page, k, M + pad, ly - 4, f.sans, 7, C.mute, 1.4)
      let vy = ly - 4
      for (const line of wrap(v, f.sans, 10.5, colW - mm(30))) {
        page.drawText(line, { x: M + pad + mm(30), y: vy, size: 10.5, font: f.sans, color: C.ink })
        vy -= 14
      }
      ly = Math.min(ly - 22, vy - 8)
    }

    // ───── linia do oderwania
    const cutY = top - tH - mm(9)
    for (let x = M; x < W - M; x += 7) page.drawLine({ start: { x, y: cutY }, end: { x: Math.min(x + 3.5, W - M), y: cutY }, thickness: 0.6, color: C.line })

    // ───── informacje (dół strony)
    let iy = cutY - mm(14)
    page.drawText(pl ? 'Dobrze wiedzieć' : 'Good to know', { x: M, y: iy, size: 20, font: f.serif, color: C.ink })
    iy -= mm(9)
    const info = pl
      ? [
          ['Wejście', 'Pokaż kod QR przy bramce: na telefonie albo wydrukowany. Jeden kod = jedna osoba. Bilet jednodniowy jest ważny tylko w wybranym dniu.'],
          ['Ponowne wejście', 'Po zeskanowaniu biletu możesz wyjść i wrócić tego samego dnia, jeśli Twój bilet na to pozwala.'],
          ['Dojazd', `${site.event.venue}, ${site.event.address}. Parking przy hali, 10 minut od lotniska Rzeszów-Jasionka.`],
          ['Pytania', `Odpowiedz na e-mail z biletem albo napisz przez ${SITE_URL.replace(/^https?:\/\//, '')}/kontakt.`],
        ]
      : [
          ['Entry', 'Show the QR code at the gate, on your phone or printed. One code = one person. A one-day ticket is valid only on the chosen day.'],
          ['Re-entry', 'Once scanned, you can leave and come back the same day if your ticket allows it.'],
          ['Getting there', `${site.event.venue}, ${site.event.address}. Parking next to the hall, 10 minutes from Rzeszów-Jasionka airport.`],
          ['Questions', 'Reply to the e-mail with your ticket.'],
        ]
    const colGap = mm(10)
    const icw = (W - 2 * M - colGap) / 2
    info.forEach(([k, v], j) => {
      const x = M + (j % 2) * (icw + colGap)
      const by = iy - Math.floor(j / 2) * mm(30)
      page.drawLine({ start: { x, y: by + 12 }, end: { x: x + icw, y: by + 12 }, thickness: 0.5, color: C.line })
      tracked(page, k.toUpperCase(), x, by, f.sans, 7, C.goldDark, 1.4)
      let vy = by - 14
      for (const line of wrap(v, f.sans, 9.5, icw)) {
        page.drawText(line, { x, y: vy, size: 9.5, font: f.sans, color: C.ink2 })
        vy -= 13
      }
    })

    // stopka
    page.drawLine({ start: { x: M, y: M + 16 }, end: { x: W - M, y: M + 16 }, thickness: 0.5, color: C.line })
    page.drawText(`${pl ? 'Organizator' : 'Organiser'}: ${site.event.organizer}`, { x: M, y: M + 2, size: 8, font: f.sans, color: C.mute })
    const s = 'ohtargi.pl'
    page.drawText(s, { x: W - M - f.bold.widthOfTextAtSize(s, 8), y: M + 2, size: 8, font: f.bold, color: C.goldDark })
  })
  return await doc.save()
}
