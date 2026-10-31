import { useEffect, useRef, useSyncExternalStore, type RefObject } from 'react'

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function hasFinePointer(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  )
}

/** Sets data-in="true" on the element once it scrolls into view. */
export function useReveal<T extends HTMLElement>(threshold = 0.2): RefObject<T | null> {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.dataset.in = 'true'
          io.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => {
      io.disconnect()
    }
  }, [threshold])
  return ref
}

const noopSubscribe = (): (() => void) => () => undefined

/** False during prerender and hydration, the real value right after, without a mismatch. */
export function useClientValue(read: () => boolean): boolean {
  return useSyncExternalStore(noopSubscribe, read, () => false)
}
