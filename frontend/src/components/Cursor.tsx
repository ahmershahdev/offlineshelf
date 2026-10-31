import { Hand, HandGrab } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { hasFinePointer, prefersReducedMotion, useClientValue } from '../lib/motion'

type Mode = 'default' | 'link' | 'grab' | 'grabbing' | 'text'

const GRAB = '[data-cursor="grab"]'
const LINK = 'a, button, summary, [role="tab"], [role="radio"], label[for]'
const TEXT = 'input:not([type="checkbox"]):not([type="radio"]), textarea, select'

function modeFor(target: EventTarget | null, pressed: boolean): [Mode, string] {
  if (!(target instanceof Element)) return ['default', '']
  if (target.closest(GRAB)) return [pressed ? 'grabbing' : 'grab', '']
  if (target.closest(TEXT)) return ['text', '']
  const link = target.closest(LINK)
  if (!link) return ['default', '']
  return ['link', link.closest('[data-cursor-label]')?.getAttribute('data-cursor-label') ?? '']
}

export function Cursor() {
  const enabled = useClientValue(() => hasFinePointer() && !prefersReducedMotion())
  const cursor = useRef<HTMLDivElement>(null)
  const follower = useRef<HTMLDivElement>(null)
  const core = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    root.classList.add('has-cursor')
    const pos = { x: window.innerWidth / 2, y: window.innerHeight * 0.4 }
    const ringPos = { ...pos }
    const torchPos = { ...pos }
    let pressed = false
    let lastTarget: EventTarget | null = null
    let frame = 0

    const apply = (): void => {
      const [mode, text] = modeFor(lastTarget, pressed)
      const el = cursor.current
      if (!el) return
      el.dataset.mode = mode
      el.dataset.label = String(text !== '')
      el.dataset.pressed = String(pressed)
      root.dataset.cursorMode = mode
      if (label.current) label.current.textContent = text
    }

    const move = (e: PointerEvent): void => {
      if (e.pointerType !== 'mouse') return
      pos.x = e.clientX
      pos.y = e.clientY
      if (cursor.current) cursor.current.style.opacity = '1'
      if (core.current) core.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`
    }
    const over = (e: PointerEvent): void => {
      lastTarget = e.target
      apply()
    }
    const down = (): void => {
      pressed = true
      apply()
    }
    const up = (): void => {
      pressed = false
      apply()
    }
    const leave = (): void => {
      if (cursor.current) cursor.current.style.opacity = '0'
    }

    const start = performance.now()
    let last = start
    const tick = (now: number): void => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const follow = 1 - Math.exp(-dt * 14)
      const drift = 1 - Math.exp(-dt * 5)
      ringPos.x += (pos.x - ringPos.x) * follow
      ringPos.y += (pos.y - ringPos.y) * follow
      torchPos.x += (pos.x - torchPos.x) * drift
      torchPos.y += (pos.y - torchPos.y) * drift
      if (follower.current) {
        follower.current.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`
      }
      // Two incommensurate sines read as a live flame; a single one looks like a pulse.
      const t = (now - start) / 1000
      const flicker = Math.sin(t * 6.3) * 5 + Math.sin(t * 13.7) * 3
      root.style.setProperty('--tx', `${torchPos.x}px`)
      root.style.setProperty('--ty', `${torchPos.y}px`)
      root.style.setProperty('--torch-r', `${340 + flicker}px`)
      frame = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerover', over, { passive: true })
    window.addEventListener('pointerdown', down, { passive: true })
    window.addEventListener('pointerup', up, { passive: true })
    root.addEventListener('pointerleave', leave)
    frame = requestAnimationFrame(tick)
    return () => {
      root.classList.remove('has-cursor')
      delete root.dataset.cursorMode
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerover', over)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      root.removeEventListener('pointerleave', leave)
      cancelAnimationFrame(frame)
    }
  }, [enabled])

  if (!enabled) return null
  return (
    <>
      <div className="torch-shade" aria-hidden="true" />
      <div className="torch" aria-hidden="true" />
      <div
        ref={cursor}
        className="cursor opacity-0 transition-opacity duration-300"
        data-mode="default"
        aria-hidden="true"
      >
        <div ref={follower} className="absolute top-0 left-0">
          <div className="cursor-ring" />
          <Hand className="cursor-hand" data-hand="open" strokeWidth={1.6} />
          <HandGrab className="cursor-hand" data-hand="closed" strokeWidth={1.6} />
          <span ref={label} className="cursor-label" />
        </div>
        <div ref={core} className="cursor-core" />
      </div>
    </>
  )
}
