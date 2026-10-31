import type Lenis from 'lenis'

let lenis: Lenis | null = null

export function setLenis(instance: Lenis | null): void {
  lenis = instance
}

export function getLenis(): Lenis | null {
  return lenis
}

export function scrollToTarget(target: string | number): void {
  if (lenis) lenis.scrollTo(target, { offset: -80 })
  else if (typeof target === 'number') window.scrollTo({ top: target })
  else document.querySelector(target)?.scrollIntoView()
}
