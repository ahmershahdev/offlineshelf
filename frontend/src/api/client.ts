import type { components } from './schema'

export type User = components['schemas']['User']
export type ShelfList = components['schemas']['ShelfList']
export type ListPage = components['schemas']['ListPage']
export type ListCreate = components['schemas']['ListCreate']
export type Problem = components['schemas']['Problem']
export type ListVersion = components['schemas']['ListVersion']
export type VersionPage = components['schemas']['VersionPage']
export type Article = components['schemas']['Article']
export type ArticlePage = components['schemas']['ArticlePage']
export type Export = components['schemas']['Export']
export type ExportList = components['schemas']['ExportList']

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: Problem | null,
  ) {
    super(problem?.detail ?? problem?.title ?? `Request failed with ${status}`)
  }

  get fieldMessage(): string {
    const first = this.problem?.errors?.[0]
    if (!first) return this.message
    const field = first.loc?.filter((p) => typeof p === 'string' && p !== 'body').at(-1)
    return field ? `${String(field)}: ${first.msg ?? ''}` : (first.msg ?? this.message)
  }
}

let csrf: string | null = null

async function csrfToken(): Promise<string> {
  if (csrf) return csrf
  const res = await fetch('/api/v1/auth/csrf', { credentials: 'same-origin' })
  const body = (await res.json()) as { token: string }
  csrf = body.token
  return csrf
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  retried = false,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (method !== 'GET') headers['X-CSRF-Token'] = await csrfToken()
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const init: RequestInit = { method, headers, credentials: 'same-origin' }
  if (body !== undefined) init.body = JSON.stringify(body)
  const res = await fetch(`/api/v1${path}`, init)

  if (res.status === 204) return undefined as T
  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const problem = data as Problem | null
    // The session (and its token) may have expired since the token was fetched; retry once.
    if (res.status === 403 && !retried && problem?.detail?.includes('CSRF')) {
      csrf = null
      return request<T>(method, path, body, true)
    }
    throw new ApiError(res.status, problem)
  }
  if (data && typeof data === 'object' && 'csrf' in data && typeof data.csrf === 'string') {
    csrf = data.csrf
  }
  return data as T
}

export const api = {
  me: () => request<{ user: User }>('GET', '/auth/me'),
  login: (email: string, password: string) =>
    request<{ user: User; csrf: string }>('POST', '/auth/login', { email, password }),
  register: (email: string, password: string) =>
    request<{ user: User; csrf: string }>('POST', '/auth/register', { email, password }),
  logout: () => request<{ csrf: string }>('POST', '/auth/logout'),
  lists: (cursor?: number) =>
    request<ListPage>('GET', `/lists${cursor ? `?cursor=${cursor}` : ''}`),
  createList: (data: ListCreate) => request<ShelfList>('POST', '/lists', data),
  deleteList: (id: number) => request<undefined>('DELETE', `/lists/${id}`),
  buildList: (id: number) => request<ListVersion>('POST', `/lists/${id}/build`),
  versions: (id: number, limit = 10) =>
    request<VersionPage>('GET', `/lists/${id}/versions?limit=${limit}`),
  articles: (id: number, versionId: number, cursor?: number) =>
    request<ArticlePage>(
      'GET',
      `/lists/${id}/versions/${versionId}/articles?limit=100${cursor ? `&cursor=${cursor}` : ''}`,
    ),
  changes: (id: number, versionId: number, kind: 'added' | 'removed', cursor?: number) =>
    request<ArticlePage>(
      'GET',
      `/lists/${id}/versions/${versionId}/changes?kind=${kind}&limit=100${cursor ? `&cursor=${cursor}` : ''}`,
    ),
  exports: (id: number, versionId: number) =>
    request<ExportList>('GET', `/lists/${id}/versions/${versionId}/exports`),
  createExport: (id: number, versionId: number) =>
    request<Export>('POST', `/lists/${id}/versions/${versionId}/exports`, { format: 'html' }),
}
