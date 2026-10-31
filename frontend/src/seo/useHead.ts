import { useEffect } from 'react'
import { useLocation } from 'react-router'

import { routeFor } from './routes'
import { absolute } from './site'

function setMeta(selector: string, attr: 'content' | 'href', value: string | null): void {
  const el = document.head.querySelector(selector)
  if (!el) return
  if (value === null) el.remove()
  else el.setAttribute(attr, value)
}

/** Keeps the head in step on client-side navigation. The first load comes prerendered. */
export function useHead(): void {
  const { pathname } = useLocation()
  useEffect(() => {
    const meta = routeFor(pathname)
    const url = absolute(meta.path)
    document.title = meta.title
    setMeta('meta[name="description"]', 'content', meta.description)
    setMeta('meta[name="robots"]', 'content', meta.index ? 'index, follow' : 'noindex, nofollow')
    setMeta('meta[property="og:title"]', 'content', meta.title)
    setMeta('meta[property="og:description"]', 'content', meta.description)
    setMeta('meta[property="og:url"]', 'content', url)
    setMeta('meta[name="twitter:title"]', 'content', meta.title)
    setMeta('meta[name="twitter:description"]', 'content', meta.description)

    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (meta.index) {
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.setAttribute('rel', 'canonical')
        document.head.appendChild(canonical)
      }
      canonical.setAttribute('href', url)
    } else {
      canonical?.remove()
    }
  }, [pathname])
}
