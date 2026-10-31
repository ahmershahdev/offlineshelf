import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'

import { SITE } from '../seo/site'
import { Reveal } from './Reveal'

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: 'Product',
    links: [
      ['/how-it-works', 'How it works'],
      ['/builders', 'Builders'],
      ['/exports', 'Exports'],
      ['/app', 'Open app'],
    ],
  },
  {
    title: 'Developers',
    links: [
      ['/developers', 'API'],
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
      ['/privacy', 'Privacy'],
      ['/terms', 'Terms'],
    ],
  },
]

export function Footer() {
  return (
    <footer className="gutter relative overflow-hidden border-t hairline pt-24 pb-8">
      <Reveal className="grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="label mb-6">Launching February 2027</p>
          <p className="mb-10 max-w-md font-serif text-4xl leading-[1.04] md:text-5xl">
            Pick the articles. <em className="text-signal">Carry them anywhere.</em>
          </p>
          <a
            href={`mailto:${SITE.email}`}
            data-cursor-label="Write"
            className="group inline-flex items-center gap-3 font-serif text-2xl md:text-3xl"
          >
            <span className="link-draw">{SITE.email}</span>
            <ArrowUpRight
              className="size-6 transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </a>
        </div>
        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3 lg:col-span-6 lg:col-start-7"
        >
          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <span className="label mb-1">{col.title}</span>
              {col.links.map(([to, text]) => (
                <Link key={to} to={to} className="link-draw w-fit text-paper/80 hover:text-paper">
                  {text}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </Reveal>

      <p
        aria-hidden="true"
        className="pointer-events-none mt-24 select-none font-serif text-[22vw] leading-[0.78] tracking-[-0.055em] text-paper/[0.06]"
      >
        OfflineShelf
      </p>

      <div className="mt-8 flex flex-col justify-between gap-4 border-t hairline pt-6 text-xs text-dim md:flex-row">
        <p>
          &copy; 2026{' '}
          <a
            href={SITE.author.url}
            rel="author noopener"
            target="_blank"
            className="link-draw text-paper"
          >
            {SITE.author.name}
          </a>{' '}
          (ahmershah.dev). Code under MIT.{' '}
          <a href={SITE.repo} rel="noopener" target="_blank" className="link-draw text-paper">
            Source
          </a>{' '}
          &middot;{' '}
          <a href="/llms.txt" className="link-draw text-paper">
            llms.txt
          </a>
        </p>
        <p className="max-w-xl md:text-right">
          Wikipedia is a trademark of the Wikimedia Foundation. OfflineShelf is an independent
          project and is not endorsed by or affiliated with the Foundation.
        </p>
      </div>
    </footer>
  )
}
