import { Check, Circle, CircleDot } from 'lucide-react'

import { ExternalLink, NextPage, PageHeader } from '../components/Page'
import { Reveal } from '../components/Reveal'
import { SITE } from '../seo/site'

type State = 'done' | 'active' | 'next'

const MILESTONES: { id: string; title: string; target: string; state: State; items: string[] }[] = [
  {
    id: 'M1',
    title: 'Skeleton',
    target: 'November 2026',
    state: 'done',
    items: [
      'Flask API, MariaDB, Redis and a worker in Docker Compose',
      'Accounts, CSRF, rate limits, security headers',
      'Tests and CodeQL required on every pull request',
      'This site: prerendered pages, SEO, accessibility',
    ],
  },
  {
    id: 'M2',
    title: 'Builders',
    target: 'November 2026',
    state: 'active',
    items: [
      'Wikimedia client with User-Agent, maxlag and backoff (done)',
      'Build queue, versions and articles API (done)',
      'Category, Wikidata, pasted titles and pageviews builders',
    ],
  },
  {
    id: 'M3',
    title: 'Jobs and schedules',
    target: 'December 2026',
    state: 'next',
    items: [
      'Monthly rebuilds with added and removed articles',
      'Email when a build fails, at most once a day per list',
      'Lists of 100,000 articles written in batches',
    ],
  },
  {
    id: 'M4',
    title: 'Combinations and exports',
    target: 'December 2026',
    state: 'next',
    items: [
      'Union, intersection and difference of up to ten lists',
      'TSV and static HTML exports with attribution',
      'Streamed downloads that expire after seven days',
    ],
  },
  {
    id: 'M5',
    title: 'Web app',
    target: 'January 2027',
    state: 'next',
    items: [
      'Builder forms and combination editor',
      'Build progress, history and diffs',
      'Downloads',
    ],
  },
  {
    id: 'M6',
    title: 'ZIM, docs and launch',
    target: 'February 2027',
    state: 'next',
    items: [
      'ZIM export for small lists (stretch)',
      'Seed lists and screenshots',
      'Public launch at offlineshelf.ahmershah.dev, v1.0.0',
    ],
  },
]

const ICON = { done: Check, active: CircleDot, next: Circle }
const LABEL = { done: 'Done', active: 'In progress', next: 'Planned' }

export function Roadmap() {
  return (
    <article>
      <PageHeader
        eyebrow="Roadmap"
        title="Six milestones to February 2027."
        intro={
          <>
            Built in the open, one milestone at a time. Dates are plans, not promises; the live
            checklist is{' '}
            <ExternalLink href={`${SITE.repo}/blob/main/docs/roadmap.md`}>
              in the repository
            </ExternalLink>
            .
          </>
        }
      />
      <ol className="gutter pb-24">
        {MILESTONES.map((m) => {
          const Icon = ICON[m.state]
          return (
            <Reveal
              as="li"
              key={m.id}
              className={`grid gap-6 border-t hairline py-12 md:grid-cols-12 md:py-16 ${m.state === 'next' ? 'text-paper/60' : ''}`}
            >
              <div className="flex items-center gap-4 md:col-span-3">
                <span
                  className={`grid size-10 place-items-center rounded-full ${m.state === 'done' ? 'bg-paper text-ink' : m.state === 'active' ? 'bg-signal text-ink' : 'border hairline'}`}
                >
                  <Icon className="size-4" strokeWidth={2} aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-mono text-sm">{m.id}</span>
                  <span className="label">{LABEL[m.state]}</span>
                </span>
              </div>
              <h2 className="text-title font-serif md:col-span-4">{m.title}</h2>
              <div className="md:col-span-5">
                <p className="label mb-4">Target: {m.target}</p>
                <ul className="space-y-2">
                  {m.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-3 h-px w-3 shrink-0 bg-signal" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          )
        })}
      </ol>
      <NextPage to="/builders" title="Builders" text="How each of the four builders works." />
    </article>
  )
}
