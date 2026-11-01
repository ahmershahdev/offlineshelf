import { FAQ_ALL } from './faq'
import { SITE, absolute } from './site'

type PageType = 'WebPage' | 'AboutPage' | 'ContactPage' | 'FAQPage' | 'TechArticle'

export type RouteMeta = {
  path: string
  title: string
  description: string
  index: boolean
  nav?: string
  sitemap?: { priority: number; changefreq: 'weekly' | 'monthly' | 'yearly' }
  crumb?: string
  jsonLd: (meta: RouteMeta) => object[]
}

const person = {
  '@type': 'Person',
  '@id': `${SITE.author.url}/#person`,
  name: SITE.author.name,
  url: SITE.author.url,
  email: `mailto:${SITE.email}`,
  sameAs: ['https://github.com/ahmershahdev'],
}

const website = {
  '@type': 'WebSite',
  '@id': `${SITE.url}/#website`,
  url: SITE.url,
  name: SITE.name,
  inLanguage: 'en',
  publisher: { '@id': person['@id'] },
}

function page(meta: RouteMeta, type: PageType = 'WebPage'): object {
  return {
    '@type': type,
    '@id': `${absolute(meta.path)}#webpage`,
    url: absolute(meta.path),
    name: meta.title,
    description: meta.description,
    isPartOf: { '@id': website['@id'] },
    inLanguage: 'en',
    ...(type === 'TechArticle' ? { author: { '@id': person['@id'] } } : {}),
  }
}

function breadcrumbs(meta: RouteMeta): object {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absolute('/') },
      {
        '@type': 'ListItem',
        position: 2,
        name: meta.crumb ?? meta.title,
        item: absolute(meta.path),
      },
    ],
  }
}

function content(type: PageType = 'WebPage') {
  return (meta: RouteMeta): object[] => [website, page(meta, type), breadcrumbs(meta)]
}

export const ROUTES: RouteMeta[] = [
  {
    path: '/',
    title: 'OfflineShelf: Wikipedia reading lists for offline use',
    description:
      'Build Wikipedia reading lists from categories, Wikidata or pageviews, combine them, rebuild monthly and export them offline.',
    index: true,
    sitemap: { priority: 1, changefreq: 'weekly' },
    jsonLd: (meta) => [
      person,
      website,
      page(meta),
      {
        '@type': 'WebApplication',
        '@id': `${SITE.url}/#app`,
        name: SITE.name,
        url: SITE.url,
        image: absolute(SITE.logo),
        description: meta.description,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        isAccessibleForFree: true,
        license: 'https://opensource.org/license/mit',
        author: { '@id': person['@id'] },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        sameAs: [SITE.repo],
      },
    ],
  },
  {
    path: '/how-it-works',
    title: 'How OfflineShelf builds offline Wikipedia lists',
    description:
      'Builders, set operations, versioned monthly rebuilds and exports: how OfflineShelf turns Wikipedia into offline lists.',
    index: true,
    nav: 'How it works',
    crumb: 'How it works',
    sitemap: { priority: 0.9, changefreq: 'monthly' },
    jsonLd: content(),
  },
  {
    path: '/builders',
    title: 'Builders: category, Wikidata, titles and pageviews',
    description:
      'The four ways to start an OfflineShelf list: Wikipedia categories, Wikidata SPARQL, pasted titles and top pageviews.',
    index: true,
    nav: 'Builders',
    crumb: 'Builders',
    sitemap: { priority: 0.8, changefreq: 'monthly' },
    jsonLd: content('TechArticle'),
  },
  {
    path: '/exports',
    title: 'Exports: TSV, HTML bundle and ZIM for Kiwix',
    description:
      'Export a Wikipedia list as TSV, a static HTML bundle with attribution, or a ZIM file for Kiwix. No server needed offline.',
    index: true,
    nav: 'Exports',
    crumb: 'Exports',
    sitemap: { priority: 0.8, changefreq: 'monthly' },
    jsonLd: content('TechArticle'),
  },
  {
    path: '/developers',
    title: 'OfflineShelf API for developers',
    description:
      'The OfflineShelf JSON API: endpoints, sessions and CSRF, RFC 9457 errors, builds and versions, rate limits and examples.',
    index: true,
    nav: 'Developers',
    crumb: 'Developers',
    sitemap: { priority: 0.7, changefreq: 'monthly' },
    jsonLd: content('TechArticle'),
  },
  {
    path: '/self-host',
    title: 'Self-host OfflineShelf with Docker Compose',
    description:
      'Run your own OfflineShelf: requirements, five-command install, configuration, backups, updates and Wikimedia etiquette.',
    index: true,
    nav: 'Self-hosting',
    crumb: 'Self-hosting',
    sitemap: { priority: 0.7, changefreq: 'monthly' },
    jsonLd: content('TechArticle'),
  },
  {
    path: '/roadmap',
    title: 'OfflineShelf roadmap to the February 2027 launch',
    description:
      'Six milestones from skeleton to launch: what is done, what is in progress and what comes next for OfflineShelf.',
    index: true,
    nav: 'Roadmap',
    crumb: 'Roadmap',
    sitemap: { priority: 0.6, changefreq: 'weekly' },
    jsonLd: content(),
  },
  {
    path: '/faq',
    title: 'OfflineShelf FAQ: lists, exports and Kiwix',
    description:
      'Answers about OfflineShelf: what it stores, which wikis it supports, list limits, failed rebuilds, exports and Kiwix.',
    index: true,
    nav: 'FAQ',
    crumb: 'FAQ',
    sitemap: { priority: 0.6, changefreq: 'monthly' },
    jsonLd: (meta) => [
      website,
      {
        ...page(meta, 'FAQPage'),
        mainEntity: FAQ_ALL.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      breadcrumbs(meta),
    ],
  },
  {
    path: '/about',
    title: 'About OfflineShelf and its maker',
    description:
      'Why OfflineShelf exists, the WP1 ideas it builds on, its principles, and Syed Ahmer Shah, who designs and builds it.',
    index: true,
    nav: 'About',
    crumb: 'About',
    sitemap: { priority: 0.6, changefreq: 'yearly' },
    jsonLd: (meta) => [person, ...content('AboutPage')(meta)],
  },
  {
    path: '/security',
    title: 'Security at OfflineShelf',
    description:
      'How OfflineShelf protects accounts and data: Argon2id, CSRF tokens, nonce CSP, rate limits, and how to report a problem.',
    index: true,
    nav: 'Security',
    crumb: 'Security',
    sitemap: { priority: 0.4, changefreq: 'yearly' },
    jsonLd: content(),
  },
  {
    path: '/contact',
    title: 'Contact OfflineShelf',
    description:
      'Reach OfflineShelf at support@ahmershah.dev, on GitHub issues, or privately for security reports. No forms, no tracking.',
    index: true,
    nav: 'Contact',
    crumb: 'Contact',
    sitemap: { priority: 0.5, changefreq: 'yearly' },
    jsonLd: (meta) => [
      website,
      {
        ...page(meta, 'ContactPage'),
        mainEntity: {
          '@type': 'ContactPoint',
          email: SITE.email,
          contactType: 'customer support',
          availableLanguage: ['English'],
        },
      },
      breadcrumbs(meta),
    ],
  },
  {
    path: '/privacy',
    title: 'Privacy | OfflineShelf',
    description:
      'What OfflineShelf stores (an email, a password hash, your list settings), the one cookie it sets, and what it never collects.',
    index: true,
    crumb: 'Privacy',
    sitemap: { priority: 0.3, changefreq: 'yearly' },
    jsonLd: content(),
  },
  {
    path: '/terms',
    title: 'Terms of use | OfflineShelf',
    description:
      'Plain terms for a free tool: the service as is, your account, fair use of Wikimedia APIs, licences and liability.',
    index: true,
    crumb: 'Terms',
    sitemap: { priority: 0.3, changefreq: 'yearly' },
    jsonLd: content(),
  },
  {
    path: '/app',
    title: 'Your shelf | OfflineShelf',
    description:
      'Sign in to build, combine and export your Wikipedia reading lists with OfflineShelf.',
    index: false,
    jsonLd: () => [],
  },
]

export const NOT_FOUND: RouteMeta = {
  path: '/404',
  title: 'Page not found | OfflineShelf',
  description:
    'This page is not on the shelf. Go back to the start or read how OfflineShelf works.',
  index: false,
  jsonLd: () => [],
}

export function routeFor(pathname: string): RouteMeta {
  let clean = pathname
  while (clean.length > 1 && clean.endsWith('/')) clean = clean.slice(0, -1)
  return ROUTES.find((r) => r.path === clean) ?? NOT_FOUND
}
