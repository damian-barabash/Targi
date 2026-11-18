// Tłumaczenie treści PL → EN (lub odwrotnie) przez model językowy.
// Sekrety: AI_API_KEY, AI_BASE_URL (API zgodne z OpenAI, np. https://api.deepseek.com/v1), AI_MODEL;
// opcjonalnie AI_FORMAT=anthropic (wtedy AI_BASE_URL np. https://api.anthropic.com/v1).
import { caller, cors, json } from '../_shared/auth.ts'

const NAMES: Record<string, string> = { pl: 'Polish', en: 'British English' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { role } = await caller(req)
    if (!role || role === 'reports') return json({ error: 'forbidden' }, 403)
    const key = Deno.env.get('AI_API_KEY')
    const base = (Deno.env.get('AI_BASE_URL') ?? '').replace(/\/$/, '')
    const model = Deno.env.get('AI_MODEL')
    if (!key || !base || !model) return json({ error: 'not_configured' }, 501)

    const b = await req.json()
    const texts: string[] = (b.texts ?? []).map((x: unknown) => String(x).slice(0, 6000)).slice(0, 60)
    if (!texts.length) return json({ texts: [] })
    const from = NAMES[b.from] ?? 'Polish'
    const to = NAMES[b.to] ?? 'British English'
    const system =
      `You translate website copy for "Beauty & Hair Expo", a premium beauty and hair trade show in Rzeszów, Poland, from ${from} to ${to}. ` +
      `Tone: elegant, concise, natural marketing language — never literal. Keep brand names, proper names, numbers, prices, dates, e-mail addresses and URLs unchanged. ` +
      `Keep line breaks, "## " heading markers and *asterisk emphasis* exactly where they are. ` +
      `You receive a JSON array of strings; reply with ONLY a JSON array of the same length with the translations, in the same order.`
    const user = JSON.stringify(texts)

    let out = ''
    if (Deno.env.get('AI_FORMAT') === 'anthropic') {
      const res = await fetch(`${base}/messages`, {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 8000, system, messages: [{ role: 'user', content: user }] }),
      })
      if (!res.ok) return json({ error: `AI ${res.status}: ${(await res.text()).slice(0, 300)}` }, 502)
      out = (await res.json()).content?.[0]?.text ?? ''
    } else {
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, temperature: 0.3, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
      })
      if (!res.ok) return json({ error: `AI ${res.status}: ${(await res.text()).slice(0, 300)}` }, 502)
      out = (await res.json()).choices?.[0]?.message?.content ?? ''
    }
    const m = out.match(/\[[\s\S]*\]/)
    const arr = m ? JSON.parse(m[0]) : null
    if (!Array.isArray(arr) || arr.length !== texts.length) return json({ error: 'AI zwróciło nieoczekiwaną odpowiedź — spróbuj ponownie.' }, 502)
    return json({ texts: arr.map(String) })
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500)
  }
})
