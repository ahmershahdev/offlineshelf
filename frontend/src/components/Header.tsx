import { Link, NavLink } from 'react-router'

import { SITE } from '../seo/site'

const NAV = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/privacy', label: 'Privacy' },
]

export function Header() {
  return (
    <header className="gutter fixed inset-x-0 top-0 z-50 flex items-center justify-between py-5 mix-blend-difference">
      <Link to="/" className="flex items-baseline gap-2 text-paper" aria-label="OfflineShelf home">
        <span className="font-serif text-2xl leading-none tracking-tight">OfflineShelf</span>
        <span className="label hidden text-paper/60 sm:inline">beta soon</span>
      </Link>

      <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `link-draw text-sm text-paper ${isActive ? 'bg-[length:100%_1px]' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
        <a href={SITE.repo} className="link-draw text-sm text-paper" rel="noopener">
          Source
        </a>
      </nav>

      <Link
        to="/app"
        className="group flex items-center gap-2 rounded-full border border-paper/30 px-4 py-2 text-sm text-paper transition-colors hover:border-paper"
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2 rounded-full bg-signal" />
        </span>
        Open app
      </Link>
    </header>
  )
}
