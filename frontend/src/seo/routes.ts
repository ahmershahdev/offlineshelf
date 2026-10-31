import { FAQ } from './faq'
import { SITE, absolute } from './site'

export type RouteMeta = {
  path: string
  title: string
  description: string
  index: boolean
  sitemap?: { priority: number; changefreq: 'weekly' | 'monthly' | 'yearly' }
  crumb?: string
  jsonLd: (meta: RouteMeta) => object[]
}

const person = {
  '@type': 'Person',
  '@id': `${SITE.author.url}/#person`,
  name: SITE.author.name,
  url: SITE.author.url,
}

const website = {
  '@type': 'WebSite',
  '@id': `${SITE.url}/#website`,
  url: SITE.url,
  name: SITE.name,
  inLanguage: 'en',
  publisher: { '@id': person['@id'] },
}

function webPage(meta: RouteMeta): object {
  return {
    '@type': 'WebPage',
    '@id': `${absolute(meta.path)}#webpage`,
    url: absolute(meta.path),
    name: meta.title,
    description: meta.description,
    isPartOf: { '@id': website['@id'] },
    inLanguage: 'en',
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
      webPage(meta),
      {
        '@type': 'WebApplication',
        '@id': `${SITE.url}/#app`,
        name: SITE.name,
        url: SITE.url,
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
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  },
  {
    path: '/how-it-works',
    title: 'How OfflineShelf builds offline Wikipedia lists',
    description:
      'Builders, set operations, versioned monthly rebuilds and exports: how OfflineShelf turns Wikipedia into offline lists.',
    index: true,
    crumb: 'How it works',
    sitemap: { priority: 0.8, changefreq: 'monthly' },
    jsonLd: (meta) => [website, webPage(meta), breadcrumbs(meta)],
  },
  {
    path: '/privacy',
    title: 'Privacy | OfflineShelf',
    description:
      'What OfflineShelf stores (an email, a password hash, your list settings), the one cookie it sets, and what it never collects.',
    index: true,
    crumb: 'Privacy',
    sitemap: { priority: 0.3, changefreq: 'yearly' },
    jsonLd: (meta) => [website, webPage(meta), breadcrumbs(meta)],
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
  const clean = pathname !== '/' ? pathname.replace(/\/+$/, '') : '/'
  return ROUTES.find((r) => r.path === clean) ?? NOT_FOUND
}
