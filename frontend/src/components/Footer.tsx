import { Link } from 'react-router'

import { SITE } from '../seo/site'
import { Reveal } from './Reveal'

export function Footer() {
  const year = 2026
  return (
    <footer className="gutter relative overflow-hidden border-t hairline pt-24 pb-8">
      <Reveal className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-6">
          <p className="label mb-6">Launching February 2027</p>
          <p className="max-w-md font-serif text-4xl leading-[1.05] md:text-5xl">
            Pick the articles. <em className="text-signal">Carry them anywhere.</em>
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-8 text-sm md:col-span-6 md:grid-cols-3"
        >
          <div className="flex flex-col gap-3">
            <span className="label">Product</span>
            <Link to="/how-it-works" className="link-draw w-fit">
              How it works
            </Link>
            <Link to="/app" className="link-draw w-fit">
              Open app
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            <span className="label">Project</span>
            <a href={SITE.repo} rel="noopener" className="link-draw w-fit">
              Source code
            </a>
            <a
              href={`${SITE.repo}/blob/main/docs/roadmap.md`}
              rel="noopener"
              className="link-draw w-fit"
            >
              Roadmap
            </a>
            <a href="/llms.txt" className="link-draw w-fit">
              llms.txt
            </a>
          </div>
          <div className="flex flex-col gap-3">
            <span className="label">Legal</span>
            <Link to="/privacy" className="link-draw w-fit">
              Privacy
            </Link>
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              rel="noopener license"
              className="link-draw w-fit"
            >
              CC BY-SA 4.0
            </a>
          </div>
        </nav>
      </Reveal>

      <p
        aria-hidden="true"
        className="pointer-events-none mt-24 select-none font-serif text-[23vw] leading-[0.75] tracking-[-0.05em] text-paper/[0.06]"
      >
        OfflineShelf
      </p>

      <div className="mt-8 flex flex-col justify-between gap-4 border-t hairline pt-6 text-xs text-dim md:flex-row">
        <p>
          &copy; {year}{' '}
          <a href={SITE.author.url} rel="author" className="link-draw text-paper">
            {SITE.author.name}
          </a>
          . Code under MIT.
        </p>
        <p className="max-w-xl md:text-right">
          Wikipedia is a trademark of the Wikimedia Foundation. OfflineShelf is an independent
          project and is not endorsed by or affiliated with the Foundation.
        </p>
      </div>
    </footer>
  )
}
