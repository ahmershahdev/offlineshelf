import { useEffect, useRef } from 'react'
import { Link } from 'react-router'

import { prefersReducedMotion } from '../lib/motion'
import { scrollToTarget } from '../lib/scroll'

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

export function Hero() {
  const section = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const lineA = useRef<HTMLDivElement>(null)
  const lineB = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const progress = useRef(0)

  useEffect(() => {
    const el = section.current
    if (!el) return
    const reduced = prefersReducedMotion()
    let frame = 0

    const update = (): void => {
      const rect = el.getBoundingClientRect()
      const travel = rect.height - window.innerHeight
      const p = travel > 0 ? clamp01(-rect.top / travel) : 0
      progress.current = p
      if (lineA.current) {
        lineA.current.style.opacity = String(clamp01(1 - p * 2.4))
        lineA.current.style.transform = `translate3d(0, ${-p * 12}vh, 0)`
      }
      if (lineB.current) {
        const q = clamp01((p - 0.55) * 2.6)
        lineB.current.style.opacity = String(q)
        lineB.current.style.transform = `translate3d(0, ${(1 - q) * 8}vh, 0)`
      }
      if (bar.current) bar.current.style.transform = `scaleX(${p})`
      frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)

    let dispose: (() => void) | undefined
    let cancelled = false
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData
    if (canvas.current && !saveData) {
      // three.js is about 600 kB; it loads after first paint so it never delays the headline.
      void import('../webgl/shelfScene').then(({ createShelfScene, webglAvailable }) => {
        if (cancelled || !canvas.current || !webglAvailable()) return
        const scene = createShelfScene({
          canvas: canvas.current,
          progress: () => progress.current,
          animate: !reduced,
        })
        canvas.current.dataset.ready = 'true'
        dispose = scene.dispose
      })
    }

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      dispose?.()
    }
  }, [])

  return (
    <section ref={section} className="relative h-[260vh]" aria-labelledby="hero-title">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <canvas
          ref={canvas}
          aria-hidden="true" // NOSONAR: a canvas is not focusable; it is decoration"
          className="absolute inset-0 size-full opacity-0 transition-opacity duration-[2000ms] data-[ready=true]:opacity-100"
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--color-ink)_85%)]" />

        <div className="gutter relative flex h-full flex-col justify-between pt-28 pb-8">
          <div className="flex justify-between">
            <p className="label">Wikipedia, selected</p>
            <p className="label hidden text-right sm:block">
              Category / Wikidata / Titles / Pageviews
            </p>
          </div>

          <div className="relative">
            <div ref={lineA} className="hero-a will-change-transform">
              <h1 id="hero-title" className="text-display font-serif">
                Millions of articles.
                <br />
                <em className="text-signal">Choose</em> the ones
                <br />
                that matter.
              </h1>
            </div>
            <div
              ref={lineB}
              className="hero-b pointer-events-none absolute inset-x-0 top-0 will-change-transform"
              aria-hidden="true"
            >
              <p className="text-display font-serif">
                Now they fit
                <br />
                on a <em className="text-signal">shelf</em>
                <br />
                you can carry.
              </p>
            </div>
          </div>

          <div className="grid items-end gap-8 md:grid-cols-12">
            <p className="max-w-md text-lg leading-snug text-paper/80 md:col-span-5">
              OfflineShelf builds Wikipedia reading lists for schools, libraries and clinics without
              internet. Build, combine, rebuild every month, export for Kiwix.
            </p>
            <div className="flex flex-wrap gap-3 md:col-span-4 md:col-start-6">
              <Link to="/how-it-works" className="btn btn-solid">
                See how it works
              </Link>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  scrollToTarget('#builders')
                }}
              >
                Scroll to shelve
              </button>
            </div>
            <div className="hidden md:col-span-3 md:block">
              <p className="label mb-2 text-right">Shelving</p>
              <span className="block h-px w-full origin-left bg-line">
                <span ref={bar} className="block h-px w-full origin-left scale-x-0 bg-signal" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
