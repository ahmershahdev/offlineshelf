// Renders every public route to static HTML at build time, so crawlers and link previews get
// full content and head tags without running JavaScript. Also writes sitemap.xml and robots.txt
// from the same route table, so the three can never disagree.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const ssrEntry = pathToFileURL(join(root, 'dist-ssr', 'entry-server.js')).href

const { render, ROUTES, NOT_FOUND } = await import(ssrEntry)
const template = await readFile(join(dist, 'index.html'), 'utf8')
const siteUrl = (process.env.VITE_SITE_URL ?? 'https://offlineshelf.ahmershah.dev').replace(
  /\/$/,
  '',
)
const today = new Date().toISOString().slice(0, 10)

function page(url) {
  const { html, head } = render(url)
  if (!template.includes('<!--app-head-->') || !template.includes('<!--app-html-->')) {
    throw new Error('index.html lost its <!--app-head--> or <!--app-html--> placeholder')
  }
  return template.replace('<!--app-head-->', head).replace('<!--app-html-->', html)
}

for (const route of ROUTES) {
  const file =
    route.path === '/' ? join(dist, 'index.html') : join(dist, route.path.slice(1), 'index.html')
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, page(route.path))
  console.log(`prerendered ${route.path}`)
}
await writeFile(join(dist, '404.html'), page(NOT_FOUND.path))

const urls = ROUTES.filter((r) => r.index && r.sitemap)
  .map(
    (r) => `  <url>
    <loc>${siteUrl}${r.path === '/' ? '/' : r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.sitemap.changefreq}</changefreq>
    <priority>${r.sitemap.priority.toFixed(1)}</priority>
  </url>`,
  )
  .join('\n')
await writeFile(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
)

const disallow = ROUTES.filter((r) => !r.index).map((r) => `Disallow: ${r.path}`)
await writeFile(
  join(dist, 'robots.txt'),
  `User-agent: *
Allow: /
Disallow: /api/
${disallow.join('\n')}

Sitemap: ${siteUrl}/sitemap.xml
`,
)

await rm(join(root, 'dist-ssr'), { recursive: true, force: true })
console.log('sitemap.xml and robots.txt written')
