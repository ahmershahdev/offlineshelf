import { useEffect, useRef } from 'react'

const BOOKS = [
  {
    title: 'Vaccines',
    meta: 'Category, depth 3',
    wiki: 'en.wikipedia',
    size: 'h-[22rem]',
    tone: 'bg-paper text-ink',
  },
  {
    title: 'Rivers of Pakistan',
    meta: 'Wikidata query',
    wiki: 'ur.wikipedia',
    size: 'h-[26rem]',
    tone: 'bg-ink-3',
  },
  {
    title: 'Most read, August',
    meta: 'Top 1,000 by pageviews',
    wiki: 'en.wikipedia',
    size: 'h-[20rem]',
    tone: 'bg-signal text-ink',
  },
  {
    title: 'Physics minus Biographies',
    meta: 'Difference of two lists',
    wiki: 'en.wikipedia',
    size: 'h-[24rem]',
    tone: 'bg-ink-2',
  },
  {
    title: 'WHO essential medicines',
    meta: 'Pasted titles',
    wiki: 'fr.wikipedia',
    size: 'h-[25rem]',
    tone: 'bg-paper-2 text-ink',
  },
  {
    title: 'Wikivoyage: South Asia',
    meta: 'Category, depth 2',
    wiki: 'en.wikivoyage',
    size: 'h-[21rem]',
    tone: 'bg-ink-3',
  },
  {
    title: 'Nobel laureates in medicine',
    meta: 'Wikidata query',
    wiki: 'sw.wikipedia',
    size: 'h-[23rem]',
    tone: 'bg-ember text-ink',
  },
  {
    title: 'Climate and weather',
    meta: 'Union of three lists',
    wiki: 'bn.wikipedia',
    size: 'h-[26rem]',
    tone: 'bg-ink-2',
  },
]

/** A horizontal shelf of example lists you can grab and throw with the mouse. Touch and
    keyboard keep native scrolling. */
export function DragShelf() {
  const track = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = track.current
    if (!el) return
    let dragging = false
    let moved = 0
    let lastX = 0
    let lastT = 0
    let velocity = 0
    let frame = 0

    const glide = (): void => {
      velocity *= 0.94
      el.scrollLeft -= velocity
      if (Math.abs(velocity) > 0.3) frame = requestAnimationFrame(glide)
    }
    const down = (e: PointerEvent): void => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      cancelAnimationFrame(frame)
      dragging = true
      moved = 0
      lastX = e.clientX
      lastT = performance.now()
      velocity = 0
      el.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent): void => {
      if (!dragging) return
      const now = performance.now()
      const dx = e.clientX - lastX
      el.scrollLeft -= dx
      moved += Math.abs(dx)
      velocity = (dx / Math.max(now - lastT, 1)) * 16
      lastX = e.clientX
      lastT = now
    }
    const up = (e: PointerEvent): void => {
      if (!dragging) return
      dragging = false
      el.releasePointerCapture(e.pointerId)
      frame = requestAnimationFrame(glide)
    }
    // A drag that ends over a card must not count as a click on it.
    const click = (e: MouseEvent): void => {
      if (moved > 6) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('click', click, true)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('click', click, true)
    }
  }, [])

  return (
    <div
      ref={track}
      data-cursor="grab"
      data-lenis-prevent-wheel=""
      tabIndex={0}
      role="region"
      aria-label="Example lists, scroll sideways"
      className="no-scrollbar flex cursor-grab items-end gap-4 overflow-x-auto px-[var(--gutter)] pb-4 select-none active:cursor-grabbing"
    >
      {BOOKS.map((b, i) => (
        <article
          key={b.title}
          className={`${b.size} ${b.tone} flex w-[15rem] shrink-0 flex-col justify-between rounded-[1.25rem] p-6 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)] md:w-[17rem]`}
        >
          <div className="flex items-center justify-between font-mono text-[0.6875rem] tracking-[0.1em] uppercase opacity-60">
            <span>{String(i + 1).padStart(2, '0')}</span>
            <span>{b.wiki}</span>
          </div>
          <div>
            <h3 className="mb-3 font-serif text-[2rem] leading-[1] tracking-tight">{b.title}</h3>
            <p className="text-sm opacity-70">{b.meta}</p>
          </div>
        </article>
      ))}
    </div>
  )
}
