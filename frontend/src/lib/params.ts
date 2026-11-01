import type { ListCreate } from '../api/client'

export type Kind = ListCreate['params']['kind']
export type Operation = Extract<ListCreate['params'], { kind: 'combination' }>['operation']

function field(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

export function paramsFrom(kind: Kind, form: FormData): ListCreate['params'] {
  const s = (k: string): string => field(form, k)
  switch (kind) {
    case 'category':
      return { kind, category: s('category'), depth: Number(s('depth') || 0) }
    case 'wikidata':
      return { kind, sparql: s('sparql') }
    case 'pasted':
      return {
        kind,
        titles: s('titles')
          .split('\n')
          .map((t) => t.trim())
          .filter(Boolean),
      }
    case 'pageviews':
      return { kind, year: Number(s('year')), month: Number(s('month')), limit: Number(s('limit')) }
    case 'combination':
      return {
        kind,
        operation: s('operation') as Operation,
        sources: form.getAll('sources').map(Number),
      }
  }
}
