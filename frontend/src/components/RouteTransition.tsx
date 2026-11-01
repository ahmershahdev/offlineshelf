import type { ReactNode } from 'react'
import { useLocation } from 'react-router'

const LANDING = typeof window === 'undefined' ? null : window.location.pathname
let navigated = false

// Decided during render, not in an effect: an effect would let the new page paint once before
// the animation class arrives, which shows as a flash. On the server every page is the landing
// page, so prerendered HTML carries data-first and hydrates without a mismatch.
function isLanding(pathname: string): boolean {
  if (LANDING === null) return true
  if (pathname !== LANDING) navigated = true
  return !navigated
}

export function RouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const first = isLanding(pathname)
  return (
    <>
      {first ? null : (
        <div key={`curtain-${pathname}`} className="route-curtain" aria-hidden="true" />
      )}
      <div key={pathname} className="route" data-first={first ? '' : undefined}>
        {children}
      </div>
    </>
  )
}
