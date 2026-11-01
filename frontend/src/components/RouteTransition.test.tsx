import { act, cleanup, render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { RouteTransition } from './RouteTransition'

afterEach(cleanup)

describe('RouteTransition', () => {
  it('leaves the landing page alone and animates every page after it', async () => {
    const router = createMemoryRouter(
      [{ path: '*', element: <RouteTransition>page</RouteTransition> }],
      { initialEntries: [window.location.pathname] },
    )
    const { container } = render(<RouterProvider router={router} />)
    expect(container.querySelector('.route')?.hasAttribute('data-first')).toBe(true)
    expect(container.querySelector('.route-curtain')).toBeNull()

    await act(() => router.navigate('/builders'))
    expect(container.querySelector('.route')?.hasAttribute('data-first')).toBe(false)
    expect(container.querySelector('.route-curtain')).not.toBeNull()

    await act(() => router.navigate(window.location.pathname))
    expect(container.querySelector('.route')?.hasAttribute('data-first')).toBe(false)
  })
})
