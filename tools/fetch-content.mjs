// Przed buildem: pobiera ostatnią opublikowaną migawkę treści z Supabase (jedno zapytanie),
// uzupełnia ją wartościami domyślnymi, zapisuje src/content/published.json
// i kopiuje użyte zdjęcia z biblioteki mediów do public/m (strona nie serwuje nic z magazynu Supabase).
import { build } from 'esbuild'
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const env = { ...process.env }
for (const f of ['.env', '.env.local'])
  if (existsSync(f)) for (const line of readFileSync(f, 'utf8').split('\n')) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim())
    if (m && !env[m[1]]) env[m[1]] = m[2]
  }
const URL = env.VITE_SUPABASE_URL
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY

// wartości domyślne z src/content/default.ts
const tmp = resolve('node_modules/.cache/default-content.mjs')
await build({ entryPoints: ['src/content/default.ts'], bundle: true, format: 'esm', outfile: tmp, logLevel: 'silent' })
const { DEFAULT } = await import(pathToFileURL(tmp).href + `?t=${Date.now()}`)
rmSync(tmp, { force: true })

let published = null
if (URL && KEY && !process.env.CONTENT_DEFAULT) {
  try {
    const res = await fetch(`${URL}/rest/v1/rpc/published_site`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: '{}' })
    if (res.ok) published = await res.json()
    else console.warn(`content: Supabase odpowiedział ${res.status} — używam treści domyślnych`)
  } catch (e) {
    console.warn(`content: brak połączenia z Supabase (${e.message}) — używam treści domyślnych`)
  }
}

const data = published?.pages?.length ? { ...DEFAULT, ...published } : DEFAULT
data.settings = { ...DEFAULT.settings, ...data.settings }
data.event = { ...DEFAULT.event, ...data.event }
writeFileSync('src/content/published.json', JSON.stringify(data))

// kopia zdjęć z biblioteki mediów
const ids = [...new Set(JSON.stringify(data).match(/media:[0-9a-f-]{36}/g) ?? [])].map((x) => x.slice(6))
mkdirSync('public/m', { recursive: true })
let copied = 0
for (const id of ids)
  for (const w of [800, 1600, 2400]) {
    const out = `public/m/${id}-${w}.webp`
    if (existsSync(out)) continue
    const res = await fetch(`${URL}/storage/v1/object/public/m/${id}-${w}.webp`)
    if (!res.ok) {
      console.warn(`content: brak pliku ${id}-${w}.webp (${res.status})`)
      continue
    }
    writeFileSync(out, Buffer.from(await res.arrayBuffer()))
    copied++
  }
console.log(`content: ${published?.pages?.length ? `migawka #${published.snapshotId} z ${published.publishedAt}` : 'treści domyślne'}, strony: ${data.pages.length}, zdjęcia z biblioteki: ${ids.length} (pobrano ${copied} plików)`)
