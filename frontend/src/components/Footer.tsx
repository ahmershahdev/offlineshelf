import { ArrowUp, ArrowUpRight, Code2, Globe, Mail } from 'lucide-react'
import { Link } from 'react-router'

import { scrollToTarget } from '../lib/scroll'
import { SITE } from '../seo/site'
import { Logo } from './Header'
import { Reveal } from './Reveal'

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: 'Product',
    links: [
      ['/how-it-works', 'How it works'],
      ['/builders', 'Builders'],
      ['/exports', 'Exports'],
      ['/app', 'Open the app'],
    ],
  },
  {
    title: 'Developers',
    links: [
      ['/developers', 'API reference'],
      ['/self-host', 'Self-hosting'],
      ['/security', 'Security'],
      ['/roadmap', 'Roadmap'],
    ],
  },
  {
    title: 'Project',
    links: [
      ['/about', 'About'],
      ['/faq', 'FAQ'],
      ['/contact', 'Contact'],
    ],
  },
]

const FACTS: [string, string][] = [
  ['5', 'ways to build a list'],
  ['2', 'export formats, ZIM next'],
  ['8', 'Wikimedia projects, any language'],
  ['MIT', 'open source licence'],
]

export function Footer() {
  return (
    <footer className="gutter relative border-t hairline pt-20 pb-8 md:pt-28">
      <Reveal className="footer-glow relative overflow-hidden rounded-[2rem] border hairline p-8 md:p-14">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="label mb-6 flex items-center gap-3">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex size-2 rounded-full bg-signal" />
              </span>
              Launching February 2027
            </p>
            <p className="max-w-2xl font-serif text-4xl leading-[1.04] md:text-6xl">
              Pick the articles. <em className="text-signal">Carry them anywhere.</em>
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/app" className="btn btn-solid" data-cursor-label="Open">
                Build your first list
              </Link>
              <Link to="/how-it-works" className="btn btn-ghost">
                Read the guide
              </Link>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border hairline bg-[var(--color-line)] lg:col-span-5">
            {FACTS.map(([value, label]) => (
              <div key={label} className="bg-ink-2/90 p-5 md:p-6">
                <dt className="sr-only">{label}</dt>
                <dd>
                  <span className="block font-serif text-4xl leading-none md:text-5xl">
                    {value}
                  </span>
                  <span className="mt-2 block text-sm text-dim">{label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Reveal>

      <div className="mt-20 grid grid-cols-1 gap-14 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo />
          <p className="mt-6 max-w-sm text-paper/65">
            Wikipedia reading lists for schools, libraries and places where the internet is slow,
            expensive or missing. Built in the open, ready for Kiwix.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            <li>
              <a
                href={`mailto:${SITE.email}`}
                className="group inline-flex items-center gap-3 text-paper/80 hover:text-paper"
              >
                <Mail className="size-4 text-signal" strokeWidth={1.5} aria-hidden="true" />
                <span className="link-draw">{SITE.email}</span>
              </a>
            </li>
            <li>
              <a
                href={SITE.repo}
                rel="noopener"
                target="_blank"
                className="group inline-flex items-center gap-3 text-paper/80 hover:text-paper"
              >
                <Code2 className="size-4 text-signal" strokeWidth={1.5} aria-hidden="true" />
                <span className="link-draw">Source on GitHub</span>
              </a>
            </li>
            <li>
              <a
                href={SITE.author.url}
                rel="author noopener"
                target="_blank"
                className="group inline-flex items-center gap-3 text-paper/80 hover:text-paper"
              >
                <Globe className="size-4 text-signal" strokeWidth={1.5} aria-hidden="true" />
                <span className="link-draw">{SITE.author.name}</span>
              </a>
            </li>
          </ul>
        </div>

        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3 lg:col-span-6 lg:col-start-7"
        >
          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <span className="label mb-2">{col.title}</span>
              {col.links.map(([to, text]) => (
                <Link
                  key={to}
                  to={to}
                  className="group inline-flex w-fit items-center gap-1 text-paper/75 transition-colors hover:text-paper"
                >
                  <span className="link-draw">{text}</span>
                  <ArrowUpRight
                    className="size-3.5 -translate-x-1 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </div>

      <div className="mt-20 flex flex-col gap-6 border-t hairline pt-6 text-xs text-dim lg:flex-row lg:items-center lg:justify-between">
        <p className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span>&copy; 2026 {SITE.author.name}. Code under MIT.</span>
          <Link to="/privacy" className="link-draw hover:text-paper">
            Privacy
          </Link>
          <Link to="/terms" className="link-draw hover:text-paper">
            Terms
          </Link>
          <Link to="/security" className="link-draw hover:text-paper">
            Report a vulnerability
          </Link>
          <a href="/llms.txt" className="link-draw hover:text-paper">
            llms.txt
          </a>
        </p>
        <div className="flex items-center justify-between gap-6 lg:justify-end">
          <p className="max-w-md lg:text-right">
            Wikipedia is a trademark of the Wikimedia Foundation. OfflineShelf is independent and
            not endorsed by the Foundation.
          </p>
          <button
            type="button"
            onClick={() => {
              scrollToTarget(0)
            }}
            className="grid size-11 shrink-0 place-items-center rounded-full border hairline text-paper transition-colors hover:border-paper hover:bg-paper hover:text-ink"
            aria-label="Back to top"
            data-cursor-label="Top"
          >
            <ArrowUp className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  )
}
