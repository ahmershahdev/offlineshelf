import { ArrowUpRight } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, NavLink, useLocation } from 'react-router'

import { getLenis } from '../lib/scroll'
import { ROUTES } from '../seo/routes'
import { SITE } from '../seo/site'

const MENU = ROUTES.filter((r) => r.nav)
const QUICK = ['/how-it-works', '/builders', '/developers']

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-3 text-paper" aria-label="OfflineShelf home">
      <span className="grid size-9 place-items-center rounded-[10px] bg-paper">
        <img src="/img/emblem-64.webp" alt="" width={28} height={28} className="size-7" />
      </span>
      <span className="font-serif text-[1.45rem] leading-none tracking-tight">OfflineShelf</span>
    </Link>
  )
}

export function Header() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const lenis = getLenis()
    if (open) {
      lenis?.stop()
      document.body.style.overflow = 'hidden'
      panel.current?.querySelector<HTMLElement>('a')?.focus()
    } else {
      lenis?.start()
      document.body.style.overflow = ''
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && open) {
        setOpen(false)
        button.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <header className="gutter fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-gradient-to-b from-ink/85 via-ink/40 to-transparent py-5">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
          {QUICK.map((path) => {
            const route = ROUTES.find((r) => r.path === path)
            return (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `link-draw text-sm text-paper/85 hover:text-paper ${isActive ? 'bg-[length:100%_1px] text-paper' : ''}`
                }
              >
                {route?.nav}
              </NavLink>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/app"
            className="hidden items-center gap-2 rounded-full border border-paper/25 px-4 py-2 text-sm text-paper transition-colors hover:border-paper sm:flex"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-signal" />
            </span>
            Open app
          </Link>
          <button
            ref={button}
            type="button"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label="Menu"
            onClick={() => {
              setOpen((v) => !v)
            }}
            className="group flex items-center gap-3 rounded-full bg-paper px-4 py-2 text-sm text-ink"
          >
            <span className="relative block h-5 overflow-hidden" aria-hidden="true">
              <span className="menu-label block" data-open={open}>
                <span className="block h-5 leading-5">Menu</span>
                <span className="block h-5 leading-5">Close</span>
              </span>
            </span>
            <span
              className="menu-icon relative block h-2.5 w-4"
              data-open={open}
              aria-hidden="true"
            >
              <span className="absolute top-0 left-0 block h-px w-4 bg-ink" />
              <span className="absolute top-2 left-0 block h-px w-4 bg-ink" />
            </span>
          </button>
        </div>
      </header>

      <div
        id="site-menu"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        data-open={open}
        inert={!open}
        onClick={(e) => {
          if (e.target instanceof Element && e.target.closest('a')) setOpen(false)
        }}
        className="menu-panel gutter fixed inset-0 z-40 overflow-y-auto bg-ink pt-28 pb-10"
      >
        <div className="grid min-h-full gap-12 lg:grid-cols-12">
          <nav aria-label="All pages" className="lg:col-span-8">
            <ol className="border-t hairline">
              {MENU.map((r, i) => (
                <li
                  key={r.path}
                  className="menu-row border-b hairline"
                  style={{ '--i': i } as CSSProperties}
                >
                  <Link
                    to={r.path}
                    className="group flex items-baseline gap-6 overflow-hidden py-3 md:py-4"
                    aria-current={pathname === r.path ? 'page' : undefined}
                  >
                    <span className="menu-rise w-8 font-mono text-xs text-signal">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="menu-rise">
                      <span className="block font-serif text-4xl leading-none transition-[transform,color] duration-500 group-hover:translate-x-3 group-hover:text-ember group-aria-[current=page]:text-ember md:text-6xl">
                        {r.nav}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
          <div className="menu-fade flex flex-col justify-between gap-10 lg:col-span-3 lg:col-start-10">
            <div className="space-y-6">
              <p className="label">Write to us</p>
              <a href={`mailto:${SITE.email}`} className="link-draw block font-serif text-3xl">
                {SITE.email}
              </a>
              <a
                href={SITE.author.url}
                rel="author noopener"
                target="_blank"
                className="flex items-center gap-2 text-paper/70 hover:text-paper"
              >
                Made by {SITE.author.name} <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-paper/60">
              <Link to="/privacy" className="hover:text-paper">
                Privacy
              </Link>
              <Link to="/terms" className="hover:text-paper">
                Terms
              </Link>
              <a href={SITE.repo} rel="noopener" target="_blank" className="hover:text-paper">
                Source
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
