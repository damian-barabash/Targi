// Jednorazowy zasiew bazy treściami domyślnymi: node tools/seed.mjs > seed.sql (potem ./tools/sb.sh sql seed.sql).
// Nie nadpisuje istniejących sekcji. Panel robi to samo sam przy pierwszym logowaniu administratora.
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const tmp = resolve('node_modules/.cache/default-seed.mjs')
await build({ entryPoints: ['src/content/default.ts'], bundle: true, format: 'esm', outfile: tmp, logLevel: 'silent' })
const { DEFAULT } = await import(pathToFileURL(tmp).href)

const EDITION = ['event', 'stats', 'tickets', 'ticketDays', 'catering', 'promoCodes', 'faces', 'zones', 'masterclasses', 'experts', 'program', 'exhibitors', 'partners']
const TAG = 'seed'
const q = (v) => '$' + TAG + '$' + JSON.stringify(v) + '$' + TAG + '$::jsonb'
const out = ["insert into public.editions (name, year, is_current) select 'Rzeszów 2028', 2028, true where not exists (select 1 from public.editions);"]
for (const [key, data] of Object.entries(DEFAULT)) {
  if (key === 'pages' || key === 'edition') continue
  const scope = EDITION.includes(key) ? '(select id::text from public.editions where is_current)' : "'global'"
  out.push('insert into public.content (scope, key, data) values (' + scope + ", '" + key + "', " + q(data) + ') on conflict do nothing;')
}
for (const p of DEFAULT.pages) out.push("insert into public.content (scope, key, data) values ('global', 'page:" + p.id + "', " + q(p) + ') on conflict do nothing;')
console.log(out.join('\n'))
