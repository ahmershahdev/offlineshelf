import { useEffect, useRef } from 'react'

import { hasFinePointer, prefersReducedMotion, useClientValue } from '../lib/motion'

const INTERACTIVE = 'a, button, summary, [data-cursor]'

export function Cursor() {
  const enabled = useClientValue(() => hasFinePointer() && !prefersReducedMotion())
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    root.classList.add('has-cursor')
    const target = { x: -100, y: -100 }
    const ringPos = { x: -100, y: -100 }
    let frame = 0

    const move = (e: PointerEvent): void => {
      target.x = e.clientX
      target.y = e.clientY
      if (dot.current)
        dot.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
    }
    const over = (e: MouseEvent): void => {
      const hit = e.target instanceof Element && e.target.closest(INTERACTIVE) !== null
      if (ring.current) ring.current.dataset.hover = String(hit)
    }
    const tick = (): void => {
      ringPos.x += (target.x - ringPos.x) * 0.16
      ringPos.y += (target.y - ringPos.y) * 0.16
      if (ring.current) {
        ring.current.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`
      }
      frame = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('mouseover', over, { passive: true })
    frame = requestAnimationFrame(tick)
    return () => {
      root.classList.remove('has-cursor')
      window.removeEventListener('pointermove', move)
      document.removeEventListener('mouseover', over)
      cancelAnimationFrame(frame)
    }
  }, [enabled])

  if (!enabled) return null
  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden="true" />
      <div ref={dot} className="cursor-dot" aria-hidden="true" />
    </>
  )
}
