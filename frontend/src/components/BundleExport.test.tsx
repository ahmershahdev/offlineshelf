import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, api, type Export, type ListVersion, type ShelfList } from '../api/client'
import { POLL_MS } from '../lib/shelf'
import { BundleExport } from './BundleExport'

const LIST = { id: 7, wiki: 'en.wikipedia.org' } as ShelfList
const VERSION = { id: 2, status: 'ready', article_count: 40 } as ListVersion

function exp(status: Export['status'], extra: Partial<Export> = {}): Export {
  return {
    id: 11,
    version_id: 2,
    format: 'html',
    status,
    progress: 0,
    total: 40,
    size_bytes: null,
    missing: null,
    error: null,
    created_at: '2026-11-01T10:00:00Z',
    finished_at: null,
    expires_at: null,
    ...extra,
  }
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-02T10:00:00Z'))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('BundleExport', () => {
  it('starts a bundle, shows progress, then the download link', async () => {
    const list = vi
      .spyOn(api, 'exports')
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [exp('building', { progress: 25 })] })
      .mockResolvedValue({
        items: [
          exp('ready', {
            progress: 40,
            size_bytes: 2_500_000,
            missing: ['Gone'],
            expires_at: '2026-11-08T10:00:00Z',
          }),
        ],
      })
    vi.spyOn(api, 'createExport').mockResolvedValue(exp('queued'))

    render(<BundleExport list={LIST} version={VERSION} />)
    await flush()
    fireEvent.click(screen.getByRole('button', { name: 'Make HTML bundle' }))
    await flush()
    await flush()
    expect(screen.getByText(/Making HTML bundle: 25 of 40/)).toBeTruthy()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS)
    })
    const link = screen.getByRole('link', { name: 'Download HTML bundle' })
    expect(link.getAttribute('href')).toBe('/api/v1/lists/7/exports/11/download')
    expect(screen.getByText(/2\.4 MB, available until/)).toBeTruthy()
    expect(screen.getByText(/1 pages no longer exist/)).toBeTruthy()

    const calls = list.mock.calls.length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS * 3)
    })
    expect(list.mock.calls.length).toBe(calls)
  })

  it('offers a new bundle when the last one failed or expired', async () => {
    vi.spyOn(api, 'exports').mockResolvedValue({
      items: [exp('failed', { error: 'HTTP 403' })],
    })
    render(<BundleExport list={LIST} version={VERSION} />)
    await flush()
    expect(screen.getByText('The last bundle failed: HTTP 403')).toBeTruthy()
    cleanup()

    vi.spyOn(api, 'exports').mockResolvedValue({
      items: [exp('ready', { expires_at: '2026-11-01T00:00:00Z' })],
    })
    render(<BundleExport list={LIST} version={VERSION} />)
    await flush()
    expect(screen.getByRole('button', { name: 'Make HTML bundle' })).toBeTruthy()
  })

  it('shows why a bundle could not start', async () => {
    vi.spyOn(api, 'exports').mockResolvedValue({ items: [] })
    vi.spyOn(api, 'createExport').mockRejectedValue(
      new ApiError(422, {
        type: 'about:blank',
        title: 'Unprocessable',
        status: 422,
        detail: 'HTML bundles hold up to 1,000 articles. Use the TSV export instead.',
      }),
    )
    render(<BundleExport list={LIST} version={VERSION} />)
    await flush()
    fireEvent.click(screen.getByRole('button', { name: 'Make HTML bundle' }))
    await flush()
    await flush()
    expect(screen.getByRole('alert').textContent).toContain('Use the TSV export instead.')
  })
})
