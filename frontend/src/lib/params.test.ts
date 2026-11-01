import { describe, expect, it } from 'vitest'

import { paramsFrom } from './params'

function form(entries: [string, string][]): FormData {
  const data = new FormData()
  for (const [k, v] of entries) data.append(k, v)
  return data
}

describe('paramsFrom', () => {
  it('reads each builder', () => {
    expect(paramsFrom('category', form([['category', ' Vaccines ']]))).toEqual({
      kind: 'category',
      category: 'Vaccines',
      depth: 0,
    })
    expect(paramsFrom('wikidata', form([['sparql', 'SELECT ?item']]))).toEqual({
      kind: 'wikidata',
      sparql: 'SELECT ?item',
    })
    expect(paramsFrom('pasted', form([['titles', 'A\n\n B \nC']]))).toEqual({
      kind: 'pasted',
      titles: ['A', 'B', 'C'],
    })
    expect(
      paramsFrom(
        'pageviews',
        form([
          ['year', '2026'],
          ['month', '8'],
          ['limit', '50'],
        ]),
      ),
    ).toEqual({ kind: 'pageviews', year: 2026, month: 8, limit: 50 })
  })

  it('reads a combination with its sources in form order', () => {
    expect(
      paramsFrom(
        'combination',
        form([
          ['operation', 'difference'],
          ['sources', '3'],
          ['sources', '1'],
        ]),
      ),
    ).toEqual({ kind: 'combination', operation: 'difference', sources: [3, 1] })
  })
})
