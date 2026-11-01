import { Check, Circle, CircleDot } from 'lucide-react'

import { ExternalLink, NextPage, PageHeader } from '../components/Page'
import { Reveal } from '../components/Reveal'
import { SITE } from '../seo/site'
import { Progress } from '../components/Visuals'

type State = 'done' | 'active' | 'next'

const MILESTONES: {
  id: string
  title: string
  target: string
  state: State
  items: [string, boolean][]
}[] = [
  {
    id: 'M1',
    title: 'Skeleton',
    target: 'November 2026',
    state: 'done',
    items: [
      ['Flask API, MariaDB, Redis and a worker in Docker Compose', true],
      ['Accounts, CSRF, rate limits, security headers', true],
      ['Tests and CodeQL required on every pull request', true],
      ['This site: prerendered pages, SEO, accessibility', true],
    ],
  },
  {
    id: 'M2',
    title: 'Builders',
    target: 'November 2026',
    state: 'active',
    items: [
      ['Wikimedia client with User-Agent, maxlag and backoff', true],
      ['Build queue, versions and articles API', true],
      ['Category, Wikidata, pasted titles and pageviews builders, written by hand', false],
    ],
  },
  {
    id: 'M3',
    title: 'Jobs and schedules',
    target: 'December 2026',
    state: 'active',
    items: [
      ['Every build is a background job; failures keep the last good version', true],
      ['Email when a build fails, at most once a day per list', true],
      ['Monthly rebuilds that catch up after downtime', true],
      ['Articles added and removed between versions', false],
      ['Lists of 100,000 articles tested end to end', false],
    ],
  },
  {
    id: 'M4',
    title: 'Combinations and exports',
    target: 'December 2026',
    state: 'active',
    items: [
      ['TSV export with attribution, streamed', true],
      ['Static HTML bundle with local links and an attribution page', true],
      ['Downloads that expire after seven days', true],
      ['Combinations that rebuild when a source changes', true],
      ['Union, intersection and difference logic, written by hand', false],
    ],
  },
  {
    id: 'M5',
    title: 'Web app',
    target: 'January 2027',
    state: 'active',
    items: [
      ['Builder forms, including combinations', true],
      ['Live build status, history and articles', true],
      ['Download buttons for TSV and bundles', true],
      ['Diffs between versions', false],
      ['Accessibility pass on phones and screen readers', false],
    ],
  },
  {
    id: 'M6',
    title: 'ZIM, docs and launch',
    target: 'February 2027',
    state: 'next',
    items: [
      ['ZIM export for small lists (stretch)', false],
      ['Seed lists and screenshots', false],
      ['Public launch at offlineshelf.ahmershah.dev, v1.0.0', false],
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
              className={`grid grid-cols-1 gap-6 border-t hairline py-12 md:grid-cols-12 md:py-16 ${m.state === 'next' ? 'text-paper/60' : ''}`}
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
                <div className="mb-6">
                  <Progress
                    done={m.items.filter(([, done]) => done).length}
                    total={m.items.length}
                  />
                </div>
                <ul className="space-y-2">
                  {m.items.map(([item, done]) => (
                    <li key={item} className={`flex gap-3 ${done ? '' : 'text-paper/55'}`}>
                      {done ? (
                        <Check className="mt-1 size-4 shrink-0 text-signal" aria-hidden="true" />
                      ) : (
                        <Circle className="mt-1 size-4 shrink-0 text-dim" aria-hidden="true" />
                      )}
                      <span>
                        {item}
                        <span className="sr-only">{done ? ' (done)' : ' (not done yet)'}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          )
        })}
      </ol>
      <NextPage
        to="/builders"
        title="Builders"
        text="Five ways to build a list, and how to choose."
      />
    </article>
  )
}
