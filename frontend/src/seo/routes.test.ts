import { describe, expect, it } from 'vitest'

import { renderHead, safeJson } from './head'
import { NOT_FOUND, ROUTES, routeFor } from './routes'

describe('route metadata', () => {
  it.each([...ROUTES, NOT_FOUND])('$path has a title under 60 and a description under 140', (r) => {
    expect(r.title.length).toBeLessThan(60)
    expect(r.description.length).toBeLessThan(140)
    expect(r.description.length).toBeGreaterThan(50)
  })

  it('titles are unique', () => {
    expect(new Set(ROUTES.map((r) => r.title)).size).toBe(ROUTES.length)
  })

  it('resolves trailing slashes and unknown paths', () => {
    expect(routeFor('/how-it-works/').path).toBe('/how-it-works')
    expect(routeFor('/nope')).toBe(NOT_FOUND)
  })

  it('indexable pages get a canonical, private ones get noindex', () => {
    expect(renderHead(routeFor('/'))).toContain('rel="canonical"')
    const app = renderHead(routeFor('/app'))
    expect(app).toContain('noindex')
    expect(app).not.toContain('rel="canonical"')
  })

  it('JSON-LD cannot break out of its script tag', () => {
    expect(safeJson({ x: '</script><script>alert(1)</script>' })).not.toContain('</script>')
  })
})
