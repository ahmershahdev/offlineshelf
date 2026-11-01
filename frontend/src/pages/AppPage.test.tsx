import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError, api, type ShelfList } from '../api/client'
import { AppPage } from './AppPage'

const LIST: ShelfList = {
  id: 4,
  name: 'Vaccines',
  wiki: 'en.wikipedia.org',
  builder: 'category',
  params: {},
  schedule: 'none',
  created_at: '2026-11-01T10:00:00Z',
  latest_status: 'ready',
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.spyOn(api, 'me').mockResolvedValue({ user: { id: 1, email: 'reader@example.org' } })
  vi.spyOn(api, 'lists').mockResolvedValue({ items: [LIST], next_cursor: null })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

async function renderApp(): Promise<void> {
  render(
    <MemoryRouter>
      <AppPage />
    </MemoryRouter>,
  )
  await flush()
  await flush()
}

describe('AppPage', () => {
  it('has headings for the lists and the form', async () => {
    await renderApp()
    expect(screen.getByRole('heading', { level: 1, name: 'Your shelf' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Your lists: 1' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'New list' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: 'Vaccines' })).toBeTruthy()
  })

  it('asks before deleting a list and can be cancelled', async () => {
    const remove = vi.spyOn(api, 'deleteList').mockResolvedValue(undefined)
    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Delete Vaccines' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }))
    expect(remove).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Vaccines' }))
    expect(document.activeElement?.textContent).toBe('Yes, delete')
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))
    await flush()
    expect(remove).toHaveBeenCalledWith(4)
    expect(screen.queryByRole('heading', { level: 3, name: 'Vaccines' })).toBeNull()
  })

  it('shows why a list could not be deleted', async () => {
    vi.spyOn(api, 'deleteList').mockRejectedValue(
      new ApiError(409, {
        type: 'about:blank',
        title: 'Conflict',
        status: 409,
        detail: 'The combination "Both" uses this list. Delete it first.',
      }),
    )
    await renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Delete Vaccines' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))
    await flush()
    expect(screen.getByRole('alert').textContent).toContain('uses this list')
    expect(screen.getByRole('heading', { level: 3, name: 'Vaccines' })).toBeTruthy()
  })
})
