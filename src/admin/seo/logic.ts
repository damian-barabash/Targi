// Asystent SEO: szybka ocena wpisu w przeglądarce (bez AI), czyszczenie długich myślników, porównanie tekstów.

export type SeoInput = { title: string; excerpt: string; body: string; slug: string; keyword: string; img: string; lang: 'pl' | 'en' }
export type Level = 'good' | 'warn' | 'bad'
export type Check = { id: string; level: Level; label: string; detail: string; weight: number; issue?: string }
export type SeoStats = { words: number; sentences: number; avgSentence: number; longSentences: number; paragraphs: number; headings: number; readMin: number; dashes: number; density: number; kwCount: number }

const DASH = /[—–]/g

/* ───────── tekst ───────── */
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
const tokens = (s: string) => fold(s).match(/[a-z0-9]+/g) ?? []
const plain = (body: string) => body.replace(/^##\s+/gm, '')
export const wordCount = (s: string) => (s.match(/[\p{L}\p{N}]+/gu) ?? []).length

/** Rdzeń słowa: polskie końcówki się zmieniają („targi” → „targach”), więc porównujemy początek. */
const stem = (w: string) => (w.length <= 4 ? w : w.slice(0, Math.max(4, w.length - 2)))
const kwStems = (kw: string) => tokens(kw).filter((w) => w.length > 2 || /\d/.test(w)).map(stem)

/** Czy wszystkie słowa frazy występują w tekście (w dowolnej odmianie). */
export function hasKeyword(text: string, kw: string): boolean {
  const st = kwStems(kw)
  if (!st.length) return false
  const words = tokens(text)
  return st.every((s) => words.some((w) => w.startsWith(s)))
}
/** Ile razy fraza pojawia się w tekście (liczymy najrzadsze z jej słów). */
function keywordCount(text: string, kw: string): number {
  const st = kwStems(kw)
  if (!st.length) return 0
  const words = tokens(text)
  return Math.min(...st.map((s) => words.filter((w) => w.startsWith(s)).length))
}

function sentences(text: string): string[] {
  return plain(text)
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => wordCount(s) > 0)
}

/** Usuwa długie myślniki (— –), których wpisy nie mogą zawierać. */
export function noDashes(s: string): string {
  return s
    .replace(/(\d)\s*[—–]\s*(\d)/g, '$1-$2')
    .replace(/^\s*[—–]\s*/gm, '')
    .replace(/\s*[—–]\s*$/gm, '.')
    .replace(/\s+[—–]\s+/g, ', ')
    .replace(/[—–]/g, '-')
    .replace(/,\s*([,.;:!?])/g, '$1')
}

export const slugify = (s: string) =>
  fold(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')

/* ───────── ocena ───────── */
export function analyze(p: SeoInput): { checks: Check[]; score: number; stats: SeoStats } {
  const body = p.body.trim()
  const words = wordCount(plain(body))
  const sents = sentences(body)
  const lens = sents.map(wordCount)
  const avg = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0
  const longS = lens.filter((n) => n > 25).length
  const paras = body.split(/\n\s*\n/).map((x) => x.trim()).filter((x) => x && !x.startsWith('## '))
  const longestPara = Math.max(0, ...paras.map(wordCount))
  const headings = (body.match(/^##\s+\S/gm) ?? []).length
  const dashes = `${p.title}\n${p.excerpt}\n${body}`.match(DASH)?.length ?? 0
  const kw = p.keyword.trim()
  const kwN = kw ? keywordCount(plain(body), kw) : 0
  const kwWords = Math.max(1, kwStems(kw).length)
  const density = words ? (kwN * kwWords * 100) / words : 0
  const firstPara = paras[0] ?? ''
  const tl = p.title.trim().length
  const el = p.excerpt.trim().length

  const C: Check[] = []
  const add = (id: string, level: Level, label: string, detail: string, weight: number) =>
    C.push({ id, level, label, detail, weight, issue: level === 'good' ? undefined : `${label}: ${detail}` })

  // Fraza kluczowa
  if (!kw) add('kw', 'bad', 'Fraza kluczowa', 'Wpisz frazę, po której ludzie mają znaleźć ten wpis w Google (2-4 słowa).', 3)
  else {
    add('kw-title', hasKeyword(p.title, kw) ? 'good' : 'bad', 'Fraza w tytule', hasKeyword(p.title, kw) ? 'Tytuł zawiera frazę kluczową.' : 'Dodaj frazę kluczową do tytułu, najlepiej na początku.', 3)
    add('kw-excerpt', hasKeyword(p.excerpt, kw) ? 'good' : 'warn', 'Fraza w opisie', hasKeyword(p.excerpt, kw) ? 'Zajawka (opis w Google) zawiera frazę.' : 'Użyj frazy w zajawce: Google pogrubia ją w wynikach.', 2)
    add('kw-first', hasKeyword(firstPara, kw) ? 'good' : 'warn', 'Fraza na początku', hasKeyword(firstPara, kw) ? 'Fraza pojawia się w pierwszym akapicie.' : 'Wspomnij frazę w pierwszym akapicie treści.', 2)
    add(
      'kw-density',
      words < 80 ? 'warn' : density < 0.4 ? 'warn' : density > 4 ? 'bad' : density > 2.8 ? 'warn' : 'good',
      'Nasycenie frazą',
      words < 80 ? 'Za mało tekstu, żeby to ocenić.' : density > 2.8 ? `Fraza powtarza się dość często (${density.toFixed(1)}%). Brzmi to sztucznie, Google może to ukarać.` : density < 0.4 ? `Fraza pojawia się rzadko (${kwN}×). Użyj jej jeszcze 2-3 razy, naturalnie.` : `Fraza występuje ${kwN}× (${density.toFixed(1)}%), w sam raz.`,
      2,
    )
    const sl = slugify(kw)
    const slugOk = sl && kwStems(kw).every((s) => fold(p.slug).includes(s.slice(0, 4)))
    add('kw-slug', slugOk ? 'good' : 'warn', 'Fraza w adresie', slugOk ? 'Adres wpisu zawiera frazę.' : `Adres mógłby zawierać frazę, np. „${sl}”. Zmieniaj go tylko przed publikacją.`, 1)
  }

  // Tytuł i opis
  add('title', tl >= 30 && tl <= 60 ? 'good' : tl < 15 || tl > 75 ? 'bad' : 'warn', 'Długość tytułu', `${tl} znaków. ${tl > 60 ? 'Google utnie tytuł po ok. 60 znakach.' : tl < 30 ? 'Za krótki, dodaj konkret lub korzyść.' : 'Idealnie: 30-60 znaków.'}`, 2)
  add('excerpt', el >= 120 && el <= 160 ? 'good' : el < 70 || el > 200 ? 'bad' : 'warn', 'Długość opisu (zajawki)', `${el} znaków. ${el > 160 ? 'Google pokaże ok. 155 znaków, resztę utnie.' : el < 120 ? 'Napisz 120-160 znaków z zachętą do kliknięcia.' : 'Idealnie: 120-160 znaków.'}`, 2)

  // Treść
  add('words', words >= 500 ? 'good' : words >= 300 ? 'warn' : 'bad', 'Długość treści', `${words} słów. ${words >= 500 ? 'Wystarczająco, by Google uznał wpis za wartościowy.' : words >= 300 ? 'Minimum spełnione, 500+ słów daje większe szanse.' : 'Za mało, celuj w co najmniej 300, najlepiej 500+ słów.'}`, 3)
  const needH = Math.floor(words / 250)
  add('headings', headings >= Math.max(1, needH) || words < 200 ? 'good' : headings ? 'warn' : 'bad', 'Śródtytuły', headings ? `${headings} śródtytuł(y). ${headings < needH ? `Przy tej długości przydałyby się ${needH}.` : 'Tekst łatwo przejrzeć.'}` : 'Podziel tekst śródtytułami: linia zaczynająca się od „## ”.', 2)
  add('paras', longestPara <= 110 ? 'good' : longestPara <= 160 ? 'warn' : 'bad', 'Akapity', longestPara <= 110 ? 'Akapity mają przyjazną długość.' : `Najdłuższy akapit ma ${longestPara} słów. Podziel go: 2-4 zdania na akapit.`, 1)
  const longPct = sents.length ? Math.round((longS / sents.length) * 100) : 0
  add('sentences', avg <= 20 && longPct <= 25 ? 'good' : avg <= 24 ? 'warn' : 'bad', 'Długość zdań', `Średnio ${avg.toFixed(0)} słów w zdaniu${longS ? `, ${longS} bardzo długich` : ''}. ${avg > 20 || longPct > 25 ? 'Skróć zdania: łatwiej się czyta, także na telefonie.' : 'Czyta się lekko.'}`, 1)

  // Myślniki, zdjęcie
  add('dashes', dashes ? 'bad' : 'good', 'Bez długich myślników', dashes ? `Znaleziono ${dashes} długich myślników (— lub –). Zamień je na przecinek, dwukropek albo kropkę.` : 'W tekście nie ma długich myślników.', 2)
  add('img', p.img ? 'good' : 'warn', 'Zdjęcie', p.img ? 'Wpis ma zdjęcie (pokaże się też przy udostępnianiu).' : 'Dodaj zdjęcie: wpis z obrazem częściej się klika.', 1)

  const total = C.reduce((s, c) => s + c.weight, 0)
  const got = C.reduce((s, c) => s + (c.level === 'good' ? c.weight : c.level === 'warn' ? c.weight * 0.5 : 0), 0)
  return {
    checks: C,
    score: Math.round((got / total) * 100),
    stats: { words, sentences: sents.length, avgSentence: avg, longSentences: longS, paragraphs: paras.length, headings, readMin: Math.max(1, Math.round(words / 200)), dashes, density, kwCount: kwN },
  }
}

export const scoreTone = (s: number) => (s >= 80 ? 'good' : s >= 55 ? 'warn' : 'bad')
export const scoreLabel = (s: number) => (s >= 80 ? 'Bardzo dobrze' : s >= 55 ? 'Do poprawy' : 'Słabo')

/* ───────── odpowiedź przepisania: <<TYTUL>> / <<ZAJAWKA>> / <<TRESC>> ───────── */
export type Rewrite = { title: string; excerpt: string; body: string; stage: 'title' | 'excerpt' | 'body' | 'wait' }
export function parseRewrite(raw: string): Rewrite {
  const s = raw.replace(/\r/g, '')
  const at = (tag: string) => s.search(new RegExp(`<<\\s*${tag}\\s*>>`, 'i'))
  const t = at('TYTU[LŁ]'), e = at('ZAJAWKA'), b = at('TRE[SŚ][CĆ]')
  const cut = (from: number, to: number) => (from < 0 ? '' : s.slice(s.indexOf('>>', from) + 2, to < 0 ? undefined : to).replace(/<<[^>]*$/, '').trim())
  const clean = (x: string) => noDashes(x.replace(/\*\*/g, '').replace(/^#\s+/gm, '## '))
  return {
    title: clean(cut(t, e)).replace(/\n+/g, ' '),
    excerpt: clean(cut(e, b)).replace(/\n+/g, ' '),
    body: clean(cut(b, -1)).replace(/\n{3,}/g, '\n\n'),
    stage: b >= 0 ? 'body' : e >= 0 ? 'excerpt' : t >= 0 ? 'title' : 'wait',
  }
}

/* ───────── porównanie słowo po słowie (LCS) ───────── */
export type DiffPart = { t: string; k: 'same' | 'add' | 'del' }
export function diffWords(a: string, b: string): DiffPart[] | null {
  const A = a.match(/\s+|[^\s]+/g) ?? []
  const B = b.match(/\s+|[^\s]+/g) ?? []
  const n = A.length, m = B.length
  if (n * m > 2_500_000) return null
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const out: DiffPart[] = []
  const push = (t: string, k: DiffPart['k']) => {
    const last = out[out.length - 1]
    if (last && last.k === k) last.t += t
    else out.push({ t, k })
  }
  let i = 0, j = 0
  while (i < n && j < m) {
    if (A[i] === B[j]) push(A[i++], 'same'), j++
    else if (dp[i + 1][j] >= dp[i][j + 1]) push(A[i++], 'del')
    else push(B[j++], 'add')
  }
  while (i < n) push(A[i++], 'del')
  while (j < m) push(B[j++], 'add')
  return out
}

/* ───────── analiza AI: linie JSON ───────── */
export type AiTip = { level: 'high' | 'medium' | 'low'; title: string; text: string; example?: string }
export type AiResult = { keyword?: string; summary?: string; tips: AiTip[]; title?: string; excerpt?: string }
export function parseAnalysis(raw: string, done: boolean): AiResult {
  const r: AiResult = { tips: [] }
  const lines = raw.split('\n')
  if (!done) lines.pop()
  for (const line of lines) {
    const m = line.match(/\{.*\}/)
    if (!m) continue
    try {
      const o = JSON.parse(m[0])
      const v = typeof o.value === 'string' ? noDashes(o.value.trim()) : ''
      if (o.t === 'keyword' && v) r.keyword = v
      else if (o.t === 'summary' && o.text) r.summary = noDashes(String(o.text))
      else if (o.t === 'title' && v) r.title = v
      else if (o.t === 'excerpt' && v) r.excerpt = v
      else if (o.t === 'tip' && o.title && o.text)
        r.tips.push({ level: ['high', 'medium', 'low'].includes(o.level) ? o.level : 'medium', title: noDashes(String(o.title)), text: noDashes(String(o.text)), example: o.example ? noDashes(String(o.example)) : undefined })
    } catch {
      /* linia jeszcze niekompletna */
    }
  }
  return r
}

/* ───────── znaczniki strumienia z funkcji seo ───────── */
/** <<RESTART>> = model zaczął od nowa (bierzemy tekst po ostatnim), <<END>> = odpowiedź kompletna. */
export function streamText(raw: string): { text: string; complete: boolean } {
  const i = raw.lastIndexOf('<<RESTART>>')
  const tail = i >= 0 ? raw.slice(i + '<<RESTART>>'.length) : raw
  return { text: tail.replace(/\n?<<END>>\s*$/, ''), complete: /<<END>>\s*$/.test(raw) }
}
