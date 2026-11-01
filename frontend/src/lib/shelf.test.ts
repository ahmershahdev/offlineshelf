import { describe, expect, it } from 'vitest'

import { articleUrl, isActive, reportLines } from './shelf'

describe('shelf helpers', () => {
  it('treats queued and building as active', () => {
    expect(isActive('queued')).toBe(true)
    expect(isActive('building')).toBe(true)
    expect(isActive('ready')).toBe(false)
    expect(isActive(null)).toBe(false)
  })

  it('builds article links with underscores and escaped characters', () => {
    expect(articleUrl('en.wikipedia.org', 'AC/DC')).toBe('https://en.wikipedia.org/wiki/AC/DC')
    expect(articleUrl('en.wikipedia.org', 'Talk: A?B#C')).toBe(
      'https://en.wikipedia.org/wiki/Talk:_A%3FB%23C',
    )
    expect(articleUrl('de.wikipedia.org', 'Köln')).toBe('https://de.wikipedia.org/wiki/K%C3%B6ln')
  })

  it('summarises a report', () => {
    expect(reportLines(null)).toEqual([])
    expect(
      reportLines({
        found: 3,
        month: '2026-08',
        missing: ['A', 'B', 'C', 'D', 'E', 'F'],
        invalid: [],
        nested: { a: 1 },
      }),
    ).toEqual([
      'found: 3',
      'month: 2026-08',
      'missing: 6 (A, B, C, D, E, ...)',
      'invalid: 0',
      'nested: {"a":1}',
    ])
  })
})
