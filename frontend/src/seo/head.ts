import type { RouteMeta } from './routes'
import { SITE, absolute } from './site'

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c)
}

// JSON inside <script> ends at the first "</script>", whatever the JSON says. Escaping "<" (and
// the two line separators JSON allows but old parsers don't) closes that hole.
export function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

export function renderHead(meta: RouteMeta, nonce = '__CSP_NONCE__'): string {
  const url = absolute(meta.path)
  const image = absolute(SITE.ogImage)
  const robots = meta.index ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}">`,
    `<meta name="robots" content="${robots}">`,
    meta.index ? `<link rel="canonical" href="${url}">` : '',
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${SITE.name}">`,
    `<meta property="og:locale" content="${SITE.locale}">`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}">`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:type" content="image/png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${escapeHtml(SITE.ogImageAlt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}">`,
    `<meta name="twitter:image" content="${image}">`,
  ]
  const graph = meta.jsonLd(meta)
  if (graph.length > 0) {
    const json = safeJson({ '@context': 'https://schema.org', '@graph': graph })
    tags.push(`<script type="application/ld+json" nonce="${nonce}">${json}</script>`)
  }
  return tags.filter(Boolean).join('\n    ')
}
