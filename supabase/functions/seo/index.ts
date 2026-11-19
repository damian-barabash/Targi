// Asystent SEO dla wpisów (Aktualności): porady po polsku i przepisanie tekstu według zaleceń.
// Ten sam model co tłumaczenia: AI_API_KEY + AI_BASE_URL (API zgodne z OpenAI) + AI_MODEL (opcjonalnie AI_SEO_MODEL).
// Odpowiedź zawsze strumieniem tekstu, żeby panel mógł pokazywać ją na żywo:
//   analyze → linie JSON (NDJSON), jedna rada w linii;
//   rewrite → sekcje <<TYTUL>> / <<ZAJAWKA>> / <<TRESC>>.
import { caller, cors, json } from '../_shared/auth.ts'

const BRAND =
  'Beauty & Hair Expo Rzeszów 2028: targi branży beauty i fryzjerskiej, 19 i 20 lutego 2028, ZEN.COM Expo w Jasionce koło Rzeszowa. ' +
  'Odbiorcy: styliści, fryzjerzy, kosmetolodzy, wizażyści, barberzy, właściciele salonów oraz osoby zainteresowane urodą.'

const NO_DASH =
  'NIGDY nie używaj długich myślników (— ani –). Zamiast nich stosuj przecinek, dwukropek, kropkę albo nawias. ' +
  'Krótki łącznik (-) wolno użyć tylko wewnątrz wyrazów złożonych i w zakresach liczb (np. 10-12).'

type Post = { lang?: string; keyword?: string; title?: string; excerpt?: string; body?: string; slug?: string; issues?: string[]; tips?: { title: string; text: string }[] }

const words = (s = '') => (s.match(/[\p{L}\p{N}]+/gu) ?? []).length

function prompts(mode: string, p: Post) {
  const lang = p.lang === 'en' ? 'angielskim (British English)' : 'polskim'
  const post =
    `FRAZA KLUCZOWA: ${p.keyword?.trim() || '(nie podano)'}\n` +
    `ADRES (slug): ${p.slug ?? ''}\n` +
    `TYTUŁ: ${p.title ?? ''}\n` +
    `ZAJAWKA (używana jako opis w Google): ${p.excerpt ?? ''}\n` +
    `TREŚĆ (pusta linia = akapit, "## " = śródtytuł):\n${p.body ?? ''}`
  const issues = (p.issues ?? []).slice(0, 20).map((x) => `- ${x}`).join('\n')

  if (mode === 'analyze') {
    return {
      system:
        `Jesteś doświadczonym redaktorem SEO i copywriterem. Oceniasz wpis na blog strony ${BRAND} ` +
        `Wpis jest w języku ${lang}. Wszystkie Twoje rady piszesz PO POLSKU, konkretnie, życzliwie, bez żargonu, ` +
        `tak żeby zrozumiała je osoba bez wiedzy o SEO. ${NO_DASH}\n\n` +
        'Odpowiadasz WYŁĄCZNIE liniami JSON (każda linia to osobny, kompletny obiekt JSON, bez tablic, bez markdown, bez komentarzy):\n' +
        '{"t":"keyword","value":"<najlepsza fraza kluczowa dla wpisu, 2-4 słowa, w języku wpisu>"}\n' +
        '{"t":"summary","text":"<jedno zdanie: ogólna ocena wpisu>"}\n' +
        'potem 4-7 linii z radami, od najważniejszej:\n' +
        '{"t":"tip","level":"high|medium|low","title":"<krótki tytuł rady, max 6 słów>","text":"<co poprawić i dlaczego, 1-2 zdania>","example":"<opcjonalnie: gotowy przykład poprawionego fragmentu>"}\n' +
        'na końcu:\n' +
        '{"t":"title","value":"<proponowany tytuł SEO, 40-60 znaków, z frazą kluczową, w języku wpisu>"}\n' +
        '{"t":"excerpt","value":"<proponowana zajawka/opis meta, 130-155 znaków, z frazą kluczową i zachętą, w języku wpisu>"}',
      user: `${post}\n\nAutomatyczna kontrola wykryła:\n${issues || '- brak uwag'}\n\nOceń wpis i podaj rady.`,
      temperature: 0.4,
    }
  }
  const tips = (p.tips ?? []).slice(0, 12).map((x) => `- ${x.title}: ${x.text}`).join('\n')
  return {
    system:
      `Jesteś doświadczonym copywriterem SEO. Przepisujesz wpis na blog strony ${BRAND} ` +
      `Piszesz w języku ${lang}, naturalnie i elegancko, dla ludzi, nie dla robotów. ` +
      'Zachowaj wszystkie fakty, nazwy, daty, liczby i ceny. Niczego nie wymyślaj: żadnych nowych faktów, cytatów, liczb ani nazwisk. ' +
      'Zasady SEO: fraza kluczowa w tytule, w zajawce i w pierwszym akapicie, potem 2-4 razy naturalnie w tekście; ' +
      'tytuł 40-60 znaków; zajawka 130-155 znaków z zachętą; śródtytuły "## " co 150-250 słów; akapity 2-4 zdania; ' +
      'zdania przeważnie krótsze niż 20 słów; strona czynna; konkretne korzyści dla czytelnika. ' +
      `DŁUGOŚĆ: treść musi mieć co najmniej ${Math.max(450, Math.round(words(p.body) * 1.05))} słów (obecnie ${words(p.body)}). Rozwijaj tylko na podstawie tego, co jest we wpisie i w opisie targów: korzyści dla odwiedzających, dla kogo jest wydarzenie, co zobaczą, jak się przygotować. ` +
      `${NO_DASH} Bez emoji, bez pogrubień i bez list markdown innych niż śródtytuły "## ".\n\n` +
      'Odpowiedz DOKŁADNIE w tym formacie, bez żadnego tekstu przed ani po:\n<<TYTUL>>\n(tytuł)\n<<ZAJAWKA>>\n(zajawka)\n<<TRESC>>\n(treść: pusta linia między akapitami)',
    user: `${post}\n\nZalecenia do wprowadzenia:\n${[issues, tips].filter(Boolean).join('\n') || '- popraw SEO i czytelność'}\n\nPrzepisz wpis.`,
    temperature: 0.55,
  }
}

// HTTP/1.1: przy HTTP/2 przez Tailscale Funnel bramka AI potrafi uznać strumień za przerwany i zamknąć odpowiedź w połowie.
// deno-lint-ignore no-explicit-any
const http1 = (Deno as any).createHttpClient?.({ http1: true, http2: false })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { role } = await caller(req)
    if (!role || role === 'reports') return json({ error: 'forbidden' }, 403)
    const key = Deno.env.get('AI_API_KEY')
    const base = (Deno.env.get('AI_BASE_URL') ?? '').replace(/\/$/, '')
    const model = Deno.env.get('AI_SEO_MODEL') || Deno.env.get('AI_MODEL')
    if (!key || !base || !model) return json({ error: 'not_configured' }, 501)

    const b = await req.json()
    const mode = b.mode === 'rewrite' ? 'rewrite' : 'analyze'
    const p: Post = {
      lang: b.lang === 'en' ? 'en' : 'pl',
      keyword: String(b.keyword ?? '').slice(0, 120),
      title: String(b.title ?? '').slice(0, 300),
      excerpt: String(b.excerpt ?? '').slice(0, 1000),
      body: String(b.body ?? '').slice(0, 20000),
      slug: String(b.slug ?? '').slice(0, 200),
      issues: Array.isArray(b.issues) ? b.issues.map(String) : [],
      tips: Array.isArray(b.tips) ? b.tips.map((x: any) => ({ title: String(x?.title ?? ''), text: String(x?.text ?? '') })) : [],
    }
    if (!(p.title || p.body)) return json({ error: 'Wpis jest pusty.' }, 400)
    const { system, user, temperature } = prompts(mode, p)

    const call = () =>
      fetch(`${base}/chat/completions`, {
        // @ts-ignore: opcja Deno
        client: http1,
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, stream: true, think: false, temperature, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
      })
    const first = await call()
    if (!first.ok || !first.body) return json({ error: `AI ${first.status}: ${(await first.text()).slice(0, 300)}` }, 502)

    // SSE z modelu → czysty tekst dla panelu. Na końcu znacznik <<END>>; gdy model urwie odpowiedź
    // bez finish_reason, jedna ponowna próba poprzedzona <<RESTART>> (panel zaczyna wtedy od nowa).
    const enc = new TextEncoder()
    const out = new ReadableStream<Uint8Array>({
      async start(ctl) {
        let res: Response | null = first
        for (let attempt = 0; attempt < 2 && res?.body; attempt++) {
          const reader = res.body.getReader()
          const dec = new TextDecoder()
          let buf = ''
          let finished = false
          try {
            for (;;) {
              const { done, value } = await reader.read()
              if (done) break
              buf += dec.decode(value, { stream: true })
              const lines = buf.split('\n')
              buf = lines.pop() ?? ''
              for (const line of lines) {
                const t = line.trim()
                if (!t.startsWith('data:')) continue
                const data = t.slice(5).trim()
                if (data === '[DONE]') continue
                try {
                  const j = JSON.parse(data)
                  if (j.error) {
                    console.error('seo upstream error', String(j.error?.message ?? j.error).slice(0, 300))
                    finished = false
                    break
                  }
                  const piece = j.choices?.[0]?.delta?.content
                  if (piece) ctl.enqueue(enc.encode(piece))
                  if (j.choices?.[0]?.finish_reason) finished = true
                } catch {
                  /* niepełna linia */
                }
              }
            }
          } catch (e) {
            console.error('seo stream broken', String(e))
          }
          if (finished) {
            ctl.enqueue(enc.encode('\n<<END>>'))
            break
          }
          console.error('seo stream ended early, attempt', attempt)
          if (attempt === 0) {
            ctl.enqueue(enc.encode('\n<<RESTART>>\n'))
            res = await call().catch(() => null)
          }
        }
        ctl.close()
      },
    })
    return new Response(out, { headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } })
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500)
  }
})
