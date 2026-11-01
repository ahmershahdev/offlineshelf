import { Link } from 'react-router'

import { Combine } from '../components/Combine'
import { DragShelf } from '../components/DragShelf'
import { Hero } from '../components/Hero'
import { Reveal, Split } from '../components/Reveal'
import { FAQ } from '../seo/faq'

const BUILDERS = [
  {
    n: '01',
    title: 'Category',
    text: 'Every article in a category and its subcategories, down to a depth you choose. Loops in the category tree are caught.',
    param: 'category: "Vaccines"  depth: 3',
  },
  {
    n: '02',
    title: 'Wikidata',
    text: 'A SPARQL query against Wikidata, mapped to articles on the wiki you pick through sitelinks.',
    param: '?item wdt:P31 wd:Q3918 .',
  },
  {
    n: '03',
    title: 'Pasted titles',
    text: 'A list you already have. Redirects are resolved and missing pages are reported, not silently dropped.',
    param: 'titles: 20,000 max',
  },
  {
    n: '04',
    title: 'Pageviews',
    text: 'The most-read articles of a month, straight from the Wikimedia pageviews API.',
    param: 'top: 1,000  month: 2026-09',
  },
]

const VERSIONS = [
  { v: 'v4', date: '2026-10-01', added: 41, removed: 6, status: 'ready' },
  { v: 'v3', date: '2026-09-01', added: 128, removed: 14, status: 'ready' },
  { v: 'v2', date: '2026-08-01', added: 0, removed: 0, status: 'failed' },
  { v: 'v1', date: '2026-07-01', added: 3912, removed: 0, status: 'ready' },
]

const EXPORTS = [
  {
    format: 'TSV',
    text: 'Title, page ID and revision ID. Opens in any spreadsheet, feeds any script.',
    tag: 'M4',
  },
  {
    format: 'HTML bundle',
    text: 'The articles as static pages with local links rewritten and an attribution page.',
    tag: 'M4',
  },
  {
    format: 'ZIM',
    text: 'One file that Kiwix opens on a phone, a laptop or a Raspberry Pi in a classroom.',
    tag: 'Stretch',
  },
]

const PRINCIPLES = [
  {
    title: 'Titles, not text',
    text: 'Only titles and IDs are stored. Article text is fetched while an export is written, never kept.',
  },
  {
    title: 'Attribution built in',
    text: 'Every export carries the CC BY-SA 4.0 notice and links back to each article.',
  },
  {
    title: 'Polite to Wikimedia',
    text: 'One identified User-Agent, maxlag on every request, and backoff when the servers are busy.',
  },
  {
    title: 'Yours to host',
    text: 'MIT licensed. One Docker Compose file runs the whole thing on a small server.',
  },
]

export function Home() {
  return (
    <>
      <Hero />

      <section aria-labelledby="shelves-title" className="border-y hairline py-20 md:py-28">
        <div className="gutter mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="label mb-4">Example shelves</p>
            <h2 id="shelves-title" className="text-title max-w-xl font-serif">
              Grab the shelf. Every book is a list someone could build today.
            </h2>
          </div>
          <p className="label hidden md:block">Drag sideways</p>
        </div>
        <DragShelf />
      </section>

      <section id="builders" className="gutter py-32 md:py-48" aria-labelledby="builders-title">
        <div className="mb-20 grid grid-cols-1 gap-8 md:grid-cols-12">
          <p className="label md:col-span-3">01 / Build</p>
          <div className="md:col-span-9">
            <Split
              as="h2"
              text="Four ways to start a list."
              id="builders-title"
              className="text-headline font-serif"
            />
          </div>
        </div>
        <div className="grid border-t hairline md:grid-cols-2 lg:grid-cols-4">
          {BUILDERS.map((b) => (
            <Reveal
              key={b.n}
              as="article"
              className="group relative flex min-h-[26rem] flex-col justify-between overflow-hidden border-b hairline p-6 md:border-r md:p-8 lg:last:border-r-0"
            >
              <span className="absolute inset-0 -z-0 origin-bottom scale-y-0 bg-signal transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-y-100" />
              <div className="relative flex items-start justify-between">
                <span className="label transition-colors group-hover:text-ink">{b.n}</span>
                <span
                  className="text-2xl transition-transform duration-700 group-hover:rotate-45 group-hover:text-ink"
                  aria-hidden="true"
                >
                  +
                </span>
              </div>
              <div className="relative">
                <h3 className="mb-4 font-serif text-5xl transition-colors group-hover:text-ink">
                  {b.title}
                </h3>
                <p className="mb-8 text-paper/70 transition-colors group-hover:text-ink/80">
                  {b.text}
                </p>
                <code className="block border-t hairline pt-4 font-mono text-xs text-dim transition-colors group-hover:border-ink/20 group-hover:text-ink">
                  {b.param}
                </code>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="gutter bg-ink-2 py-32 md:py-48" aria-labelledby="combine-title">
        <div className="mb-20 grid grid-cols-1 gap-8 md:grid-cols-12">
          <p className="label md:col-span-3">02 / Combine</p>
          <div className="md:col-span-9">
            <Split
              as="h2"
              text="Lists are sets. Treat them like sets."
              id="combine-title"
              className="text-headline font-serif"
            />
          </div>
        </div>
        <Reveal>
          <Combine />
        </Reveal>
      </section>

      <section className="gutter py-32 md:py-48" aria-labelledby="rebuild-title">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="label mb-8">03 / Rebuild</p>
            <Split
              as="h2"
              text="Wikipedia moves. Your shelf keeps up."
              id="rebuild-title"
              className="text-headline font-serif"
            />
            <Reveal as="p" className="mt-8 max-w-md text-paper/70">
              Lists rebuild every month in a background queue. Each build is a new version with the
              articles that came and went. When a build fails, the last good version stays exactly
              where it was.
            </Reveal>
          </div>
          <Reveal className="md:col-span-6 md:col-start-7">
            <p className="label mb-4">Example history</p>
            <ol className="border-t hairline font-mono text-sm">
              {VERSIONS.map((ver) => (
                <li
                  key={ver.v}
                  className="grid grid-cols-[3rem_1fr_auto_auto] items-center gap-4 border-b hairline py-5 md:gap-8"
                >
                  <span className="text-paper">{ver.v}</span>
                  <span className="text-dim">{ver.date}</span>
                  {ver.status === 'failed' ? (
                    <span className="col-span-2 text-right text-signal">failed, v1 kept</span>
                  ) : (
                    <>
                      <span className="text-paper">+{ver.added.toLocaleString('en-US')}</span>
                      <span className="text-dim">&minus;{ver.removed}</span>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      <section className="gutter border-t hairline py-32 md:py-48" aria-labelledby="export-title">
        <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-12">
          <p className="label md:col-span-3">04 / Export</p>
          <div className="md:col-span-9">
            <Split
              as="h2"
              text="Out of the browser, onto the device."
              id="export-title"
              className="text-headline font-serif"
            />
          </div>
        </div>
        <ul className="border-t hairline">
          {EXPORTS.map((e) => (
            <Reveal
              as="li"
              key={e.format}
              className="group grid items-baseline gap-4 border-b hairline py-8 md:grid-cols-12 md:py-12"
            >
              <span className="font-serif text-6xl transition-[color,transform] duration-700 group-hover:translate-x-4 group-hover:text-signal md:col-span-5 md:text-8xl">
                {e.format}
              </span>
              <p className="max-w-md text-paper/70 md:col-span-5">{e.text}</p>
              <span className="label md:col-span-2 md:text-right">{e.tag}</span>
            </Reveal>
          ))}
        </ul>
      </section>

      <section
        className="gutter bg-paper py-32 text-ink md:py-48"
        aria-labelledby="principles-title"
      >
        <p className="label mb-8 !text-ink/60">05 / Principles</p>
        <h2 id="principles-title" className="text-headline mb-20 max-w-5xl font-serif">
          Built the way the Wikimedia movement would want it built.
        </h2>
        <div className="grid gap-x-12 gap-y-16 md:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} className="border-t border-ink/15 pt-6">
              <span className="mb-10 block font-mono text-xs text-ink/50">0{i + 1}</span>
              <h3 className="mb-3 text-xl font-medium tracking-tight">{p.title}</h3>
              <p className="text-ink/70">{p.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="gutter py-32 md:py-48" aria-labelledby="faq-title">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="label mb-8">Questions</p>
            <h2 id="faq-title" className="text-headline font-serif">
              Asked often.
            </h2>
            <Link to="/faq" className="link-draw mt-8 inline-block text-paper/80 hover:text-paper">
              All questions
            </Link>
          </div>
          <div className="md:col-span-7 md:col-start-6">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-b hairline py-6 first:border-t">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-xl [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    aria-hidden="true"
                    className="text-signal transition-transform duration-500 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-2xl text-paper/70">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
