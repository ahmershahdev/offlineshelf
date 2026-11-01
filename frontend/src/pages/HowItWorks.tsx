import { Link } from 'react-router'

import { Reveal, Split } from '../components/Reveal'

const STEPS = [
  {
    title: 'You describe a list',
    text: 'Pick a wiki (any Wikimedia content project, any language) and a builder: a category with a depth limit, a Wikidata SPARQL query, a pasted list of titles, or the top articles by pageviews for a month.',
  },
  {
    title: 'A worker builds it',
    text: 'The build never runs inside a web request. It goes to a queue, a worker calls the MediaWiki Action API, the Wikimedia REST API or the Wikidata Query Service, and writes titles and page IDs in batches. Network errors are retried with backoff; anything else fails the build cleanly.',
  },
  {
    title: 'Each build is a version',
    text: 'A new version is stored next to the old one, with the articles added and removed. A failed build is recorded but never replaces the last good version, so an export link never points at half a list.',
  },
  {
    title: 'Lists combine',
    text: 'Union, intersection and difference of up to ten lists. Cycles are refused, and a combination rebuilds when one of its sources gets a new version.',
  },
  {
    title: 'You export',
    text: 'A TSV of titles and IDs, or a static HTML bundle with local links rewritten and an attribution page. Downloads are streamed and expire after seven days. ZIM export for Kiwix comes later for small lists.',
  },
]

const LIMITS = [
  ['Category depth', '5 levels'],
  ['Pasted titles', '20,000 per list'],
  ['SPARQL query', '10,000 characters, 60 s timeout'],
  ['Top by pageviews', '1,000 articles'],
  ['Lists per account', '100'],
  ['Combination sources', '10 lists'],
]

export function HowItWorks() {
  return (
    <article className="gutter pt-40 pb-32">
      <header className="mb-24 grid grid-cols-1 gap-8 md:grid-cols-12">
        <p className="label md:col-span-3">How it works</p>
        <div className="md:col-span-9">
          <Split
            as="h1"
            text="From a question to a shelf of articles."
            className="text-headline font-serif"
          />
          <Reveal as="p" className="mt-10 max-w-2xl text-xl text-paper/70">
            OfflineShelf is a list builder. It decides which articles go offline and keeps that
            decision reproducible. The article text stays with Wikipedia until you export.
          </Reveal>
        </div>
      </header>

      <ol className="mb-32 border-t hairline">
        {STEPS.map((s, i) => (
          <Reveal
            as="li"
            key={s.title}
            className="grid gap-6 border-b hairline py-12 md:grid-cols-12"
          >
            <span className="font-mono text-sm text-signal md:col-span-1">0{i + 1}</span>
            <h2 className="font-serif text-4xl md:col-span-4 md:text-5xl">{s.title}</h2>
            <p className="max-w-xl text-lg text-paper/70 md:col-span-6 md:col-start-7">{s.text}</p>
          </Reveal>
        ))}
      </ol>

      <section className="mb-32 grid grid-cols-1 gap-12 md:grid-cols-12" aria-labelledby="limits">
        <div className="md:col-span-4">
          <h2 id="limits" className="mb-4 font-serif text-5xl">
            Limits
          </h2>
          <p className="text-paper/70">
            Every input has a ceiling, checked before anything is queued. They keep one list from
            using up a shared server or Wikimedia's patience.
          </p>
        </div>
        <dl className="border-t hairline md:col-span-7 md:col-start-6">
          {LIMITS.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-6 border-b hairline py-4">
              <dt className="text-paper/70">{k}</dt>
              <dd className="font-mono text-sm">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid grid-cols-1 gap-12 md:grid-cols-12" aria-labelledby="api">
        <div className="md:col-span-4">
          <h2 id="api" className="mb-4 font-serif text-5xl">
            API
          </h2>
        </div>
        <div className="md:col-span-7 md:col-start-6">
          <p className="mb-6 text-lg text-paper/70">
            The app is a client of a public JSON API. Endpoints, sessions and CSRF, errors and rate
            limits are documented on the developers page.
          </p>
          <Link to="/developers" className="btn btn-ghost">
            Read the API docs
          </Link>
        </div>
      </section>
    </article>
  )
}
