import Lenis from 'lenis'
import { useEffect } from 'react'
import { useLocation } from 'react-router'

import { prefersReducedMotion } from '../lib/motion'
import { getLenis, setLenis } from '../lib/scroll'

export function SmoothScroll() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (prefersReducedMotion()) return
    const instance = new Lenis({ autoRaf: true, lerp: 0.09, wheelMultiplier: 0.95 })
    setLenis(instance)
    return () => {
      instance.destroy()
      setLenis(null)
    }
  }, [])

  useEffect(() => {
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(0, { immediate: true })
    else window.scrollTo(0, 0)
  }, [pathname])

  return null
}
