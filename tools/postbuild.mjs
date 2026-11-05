// Po buildzie: 404.html dla GitHub Pages, sitemap.xml, robots.txt, .nojekyll
import { copyFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
const site = (process.env.SITE_URL || 'https://beauty.barabashflow.pl').replace(/\/$/, '')
const base = (process.env.BASE_PATH || '/').replace(/\/?$/, '/')

if (existsSync(join(dist, '404/index.html'))) copyFileSync(join(dist, '404/index.html'), join(dist, '404.html'))
writeFileSync(join(dist, '.nojekyll'), '')

const urls = []
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p)
    else if (f === 'index.html') {
      const rel = p.slice(dist.length + 1).replace(/index\.html$/, '')
      if (!rel.startsWith('404')) urls.push(`${site}${base}${rel}`)
    }
  }
}
walk(dist)
urls.sort()
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`,
)
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site}${base}sitemap.xml\n`)
console.log(`postbuild: ${urls.length} urls in sitemap, 404.html ready`)
