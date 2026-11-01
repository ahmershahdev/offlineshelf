import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ListVersion, ShelfList } from '../api/client'
import { api } from '../api/client'
import { POLL_MS } from '../lib/shelf'
import { ListDetail } from './ListDetail'

const LIST: ShelfList = {
  id: 7,
  name: 'Vaccines',
  wiki: 'en.wikipedia.org',
  builder: 'category',
  params: {},
  schedule: 'none',
  created_at: '2026-11-01T10:00:00Z',
  latest_status: 'ready',
}

function version(id: number, status: ListVersion['status'], extra: Partial<ListVersion> = {}) {
  return {
    id,
    status,
    started_at: null,
    finished_at: status === 'ready' || status === 'failed' ? '2026-11-01T10:05:00Z' : null,
    article_count: status === 'ready' ? 2 : 0,
    error: null,
    report: null,
    ...extra,
  } satisfies ListVersion
}

function page<T>(items: T[], next_cursor: number | null = null) {
  return { items, next_cursor }
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('ListDetail', () => {
  it('shows the build history and the articles of the latest ready build', async () => {
    vi.spyOn(api, 'versions').mockResolvedValue(
      page([
        version(3, 'failed', { error: 'Category not found' }),
        version(2, 'ready', { report: { missing: ['Foo'] } }),
      ]),
    )
    const articles = vi
      .spyOn(api, 'articles')
      .mockResolvedValueOnce(page([{ page_id: 1, title: 'Polio vaccine', revision_id: 10 }], 1))
      .mockResolvedValueOnce(page([{ page_id: 2, title: 'BCG vaccine', revision_id: 11 }]))
    const onStatus = vi.fn()

    render(<ListDetail list={LIST} onStatus={onStatus} />)
    await flush()
    await flush()

    expect(onStatus).toHaveBeenCalledWith('failed')
    expect(screen.getByText('Category not found')).toBeTruthy()
    expect(screen.getByText('missing: 1 (Foo)')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Polio vaccine' })
    expect(link.getAttribute('href')).toBe('https://en.wikipedia.org/wiki/Polio_vaccine')
    expect(articles).toHaveBeenCalledWith(7, 2)

    fireEvent.click(screen.getByRole('button', { name: 'Show more' }))
    await flush()
    expect(articles).toHaveBeenLastCalledWith(7, 2, 1)
    expect(screen.getByRole('link', { name: 'BCG vaccine' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull()
  })

  it('polls while a build is running and stops when it finishes', async () => {
    const versions = vi
      .spyOn(api, 'versions')
      .mockResolvedValueOnce(page([version(4, 'building')]))
      .mockResolvedValue(page([version(4, 'ready')]))
    vi.spyOn(api, 'articles').mockResolvedValue(page([]))
    const onStatus = vi.fn()

    render(<ListDetail list={{ ...LIST, latest_status: 'building' }} onStatus={onStatus} />)
    await flush()
    expect(screen.getByText('building')).toBeTruthy()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS)
    })
    expect(onStatus).toHaveBeenLastCalledWith('ready')
    const calls = versions.mock.calls.length

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS * 3)
    })
    expect(versions.mock.calls.length).toBe(calls)
  })

  it('says when a list has never been built', async () => {
    vi.spyOn(api, 'versions').mockResolvedValue(page([]))
    render(<ListDetail list={{ ...LIST, latest_status: null }} onStatus={vi.fn()} />)
    await flush()
    expect(screen.getByText('Not built yet.')).toBeTruthy()
  })

  it('reports a failed history request', async () => {
    vi.spyOn(api, 'versions').mockRejectedValue(new Error('offline'))
    render(<ListDetail list={LIST} onStatus={vi.fn()} />)
    await flush()
    expect(screen.getByText('The build history could not be loaded.')).toBeTruthy()
  })
})
