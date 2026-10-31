export const SITE = {
  name: 'OfflineShelf',
  url:
    (import.meta.env.VITE_SITE_URL as string | undefined) ?? 'https://offlineshelf.ahmershah.dev',
  repo: 'https://github.com/ahmershahdev/offlineshelf',
  locale: 'en_US',
  themeColor: '#0b0b0a',
  ogImage: '/og/og-default.png',
  ogImageAlt: 'OfflineShelf: Wikipedia reading lists for places without internet',
  author: { name: 'Syed Ahmer Shah', url: 'https://ahmershah.dev' },
  launch: '2027-02',
} as const

export function absolute(path: string): string {
  return new URL(path, SITE.url).toString()
}
