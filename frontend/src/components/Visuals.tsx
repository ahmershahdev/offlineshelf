import {
  ArrowRight,
  Check,
  Clock,
  Cloud,
  Database,
  FileText,
  Folder,
  Globe,
  HardDrive,
  Layers,
  ListChecks,
  Lock,
  Mail,
  Package,
  RefreshCw,
  Server,
  ShieldCheck,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { Reveal } from './Reveal'

function Figure({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <Reveal as="figure" className="my-10">
      {children}
      <figcaption className="mt-4 text-sm text-dim">{caption}</figcaption>
    </Reveal>
  )
}

const PIPELINE: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ListChecks, title: 'Describe', text: 'Wiki, builder, parameters' },
  { icon: Clock, title: 'Queue', text: 'Redis, one build per list' },
  { icon: Cloud, title: 'Fetch', text: 'Wikimedia APIs, polite and retried' },
  { icon: Layers, title: 'Version', text: 'Titles and IDs, never text' },
  { icon: Package, title: 'Export', text: 'TSV or an offline HTML bundle' },
]

export function Pipeline() {
  return (
    <Figure caption="Every list goes through the same five steps. Nothing runs inside a web request; the browser only asks and reads.">
      <ol className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {PIPELINE.map((step, i) => (
          <li
            key={step.title}
            className="relative flex items-center gap-4 rounded-2xl border hairline bg-ink-2 p-5 md:flex-col md:items-start md:gap-6"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-paper text-ink">
              <step.icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span>
              <span className="block font-mono text-xs text-signal">0{i + 1}</span>
              <span className="block font-serif text-2xl leading-tight">{step.title}</span>
              <span className="mt-1 block text-sm text-paper/60">{step.text}</span>
            </span>
            {i < PIPELINE.length - 1 ? (
              <ArrowRight
                className="absolute -right-[0.6rem] top-1/2 z-10 hidden size-4 -translate-y-1/2 rounded-full bg-ink text-signal md:block"
                aria-hidden="true"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </Figure>
  )
}

type Op = 'union' | 'intersection' | 'difference'

const OP_TEXT: Record<Op, [string, string]> = {
  union: ['Union', 'In any of the lists'],
  intersection: ['Intersection', 'In every list'],
  difference: ['Difference', 'In the first, in none of the others'],
}

function Venn({ op }: { op: Op }) {
  const id = `venn-${op}`
  return (
    <svg viewBox="0 0 200 130" className="w-full" role="img" aria-labelledby={`${id}-t`}>
      <title id={`${id}-t`}>{`${OP_TEXT[op][0]}: ${OP_TEXT[op][1]}`}</title>
      <defs>
        <clipPath id={`${id}-a`}>
          <circle cx="78" cy="65" r="48" />
        </clipPath>
        <mask id={`${id}-not-b`}>
          <rect width="200" height="130" fill="white" />
          <circle cx="122" cy="65" r="48" fill="black" />
        </mask>
      </defs>
      {op === 'union' ? (
        <g fill="var(--color-signal)" fillOpacity="0.85">
          <circle cx="78" cy="65" r="48" />
          <circle cx="122" cy="65" r="48" />
        </g>
      ) : null}
      {op === 'intersection' ? (
        <circle
          cx="122"
          cy="65"
          r="48"
          fill="var(--color-signal)"
          fillOpacity="0.85"
          clipPath={`url(#${id}-a)`}
        />
      ) : null}
      {op === 'difference' ? (
        <circle
          cx="78"
          cy="65"
          r="48"
          fill="var(--color-signal)"
          fillOpacity="0.85"
          mask={`url(#${id}-not-b)`}
        />
      ) : null}
      <g fill="none" stroke="var(--color-paper)" strokeOpacity="0.55" strokeWidth="1.2">
        <circle cx="78" cy="65" r="48" />
        <circle cx="122" cy="65" r="48" />
      </g>
      <g fill="var(--color-paper)" fontFamily="var(--font-mono)" fontSize="11">
        <text x="48" y="69">
          A
        </text>
        <text x="146" y="69">
          B
        </text>
      </g>
    </svg>
  )
}

export function SetOperations() {
  return (
    <Figure caption="A combination reads the latest ready version of each source list. Difference keeps the order you chose: A is the first list.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(Object.keys(OP_TEXT) as Op[]).map((op) => (
          <div key={op} className="rounded-2xl border hairline bg-ink-2 p-5">
            <Venn op={op} />
            <p className="mt-4 font-serif text-2xl">{OP_TEXT[op][0]}</p>
            <p className="text-sm text-paper/60">{OP_TEXT[op][1]}</p>
          </div>
        ))}
      </div>
    </Figure>
  )
}

const VERSIONS: {
  v: string
  status: 'ready' | 'failed'
  when: string
  count?: string
  delta?: string
  note?: string
}[] = [
  { v: 'v4', status: 'ready', when: '1 Dec, 00:12', count: '1,284', delta: '+31 / -4' },
  {
    v: 'v3',
    status: 'failed',
    when: '1 Nov, 00:10',
    note: 'Gave up after 5 retries: HTTP 503. v2 stays current.',
  },
  { v: 'v2', status: 'ready', when: '1 Oct, 00:09', count: '1,257', delta: '+12 / -0' },
  { v: 'v1', status: 'ready', when: '14 Sep, 16:40', count: '1,245', delta: 'first build' },
]

export function VersionHistory() {
  return (
    <Figure caption="An example monthly list. The November build failed while Wikimedia was busy; the owner got one email and the October version stayed current until December.">
      <div className="overflow-hidden rounded-2xl border hairline bg-ink-2">
        <div className="flex items-center justify-between border-b hairline px-5 py-4">
          <span>
            <span className="block font-serif text-xl">Vaccines</span>
            <span className="font-mono text-xs text-dim">
              en.wikipedia.org / Category / monthly
            </span>
          </span>
          <RefreshCw className="size-4 text-signal" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <ul>
          {VERSIONS.map((row) => (
            <li
              key={row.v}
              className="grid grid-cols-[3rem_1fr_auto] items-start gap-4 border-b hairline px-5 py-4 text-sm last:border-b-0"
            >
              <span className="font-mono text-dim">{row.v}</span>
              <span>
                <span
                  className={`inline-flex items-center gap-1.5 ${row.status === 'ready' ? 'text-paper' : 'text-signal'}`}
                >
                  {row.status === 'ready' ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    <X className="size-3.5" aria-hidden="true" />
                  )}
                  {row.status}
                </span>
                <span className="ml-3 text-dim">{row.when}</span>
                {row.note ? <span className="mt-1 block text-xs text-dim">{row.note}</span> : null}
              </span>
              <span className="text-right font-mono">
                {row.count ?? ''}
                {row.delta ? <span className="block text-xs text-dim">{row.delta}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Figure>
  )
}

const TREE: [number, string, string][] = [
  [0, 'offlineshelf-12-v4.zip', ''],
  [1, 'index.html', 'every article, plus pages that no longer exist'],
  [1, 'ATTRIBUTION.html', 'licence and a history link per article'],
  [1, 'articles/', ''],
  [2, '32616.html', 'Vaccine'],
  [2, '2361497.html', 'Polio vaccine'],
  [2, '1209427.html', 'Smallpox vaccine'],
]

export function BundlePreview() {
  return (
    <Figure caption="What is inside an HTML bundle, and how an article looks when opened from a USB stick. Files are named by page ID so they work on every file system.">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <div className="rounded-2xl border hairline bg-ink-2 p-5 font-mono text-[0.8125rem] lg:col-span-2">
          {TREE.map(([depth, name, note]) => (
            <div
              key={name}
              className="flex items-baseline gap-2 py-1"
              style={{ paddingLeft: `${depth * 1.1}rem` }}
            >
              {name.endsWith('/') || name.endsWith('.zip') ? (
                <Folder className="size-3.5 shrink-0 text-signal" aria-hidden="true" />
              ) : (
                <FileText className="size-3.5 shrink-0 text-dim" aria-hidden="true" />
              )}
              <span className="text-paper">{name}</span>
              {note ? <span className="truncate text-dim">{note}</span> : null}
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl border hairline bg-paper text-ink lg:col-span-3">
          <div className="flex items-center gap-2 border-b border-ink/10 bg-paper-2 px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-ink/20" />
            <span className="size-2.5 rounded-full bg-ink/20" />
            <span className="size-2.5 rounded-full bg-ink/20" />
            <span className="ml-3 truncate rounded-md bg-paper px-3 py-1 font-mono text-[0.7rem] text-ink/60">
              file:///media/usb/vaccines/articles/2361497.html
            </span>
          </div>
          <div className="space-y-3 p-6 font-serif">
            <p className="text-3xl">Polio vaccine</p>
            <p className="font-sans text-sm leading-relaxed text-ink/75">
              Polio vaccines are vaccines used to prevent poliomyelitis. Two types are used: an
              inactivated poliovirus given by injection and a weakened poliovirus given by mouth...
            </p>
            <p className="font-sans text-sm text-ink/75">
              See also{' '}
              <span className="underline decoration-signal underline-offset-4">Vaccine</span> (opens
              the local copy) and{' '}
              <span className="underline decoration-ink/30 underline-offset-4">Jonas Salk</span>{' '}
              (not on the list, opens Wikipedia).
            </p>
            <p className="border-t border-ink/10 pt-3 font-sans text-xs text-ink/55">
              From Polio vaccine on en.wikipedia.org, revision 1247012388. Text under CC BY-SA 4.0;
              authors in the page history. All articles.
            </p>
          </div>
        </div>
      </div>
    </Figure>
  )
}

const SERVICES: { icon: LucideIcon; name: string; role: string; tone?: 'paper' }[] = [
  { icon: Globe, name: 'web', role: 'nginx: the site, TLS-ready, rate limits', tone: 'paper' },
  { icon: Server, name: 'api', role: 'Flask on gunicorn, migrations on start' },
  { icon: RefreshCw, name: 'worker', role: 'RQ: builds, exports, emails' },
  { icon: Clock, name: 'scheduler', role: 'hourly: monthly rebuilds, cleanup' },
  { icon: Database, name: 'mariadb', role: 'lists, versions, titles and IDs' },
  { icon: Layers, name: 'redis', role: 'queue and rate-limit counters' },
  { icon: HardDrive, name: 'exports-data', role: 'volume: bundles for 7 days' },
  { icon: Mail, name: 'SMTP', role: 'optional: failure emails' },
]

export function StackDiagram() {
  return (
    <Figure caption="The Compose file starts six containers and one volume. Only web is published, on 127.0.0.1:8080; put your TLS proxy in front of it.">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {SERVICES.map((s) => (
          <div
            key={s.name}
            className={`rounded-2xl border hairline p-5 ${s.tone === 'paper' ? 'bg-paper text-ink' : 'bg-ink-2'}`}
          >
            <s.icon
              className={`mb-6 size-5 ${s.tone === 'paper' ? 'text-ink' : 'text-signal'}`}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="font-mono text-sm">{s.name}</p>
            <p className={`mt-1 text-xs ${s.tone === 'paper' ? 'text-ink/65' : 'text-paper/55'}`}>
              {s.role}
            </p>
          </div>
        ))}
      </div>
    </Figure>
  )
}

const LAYERS: { icon: LucideIcon; name: string; text: string }[] = [
  {
    icon: Globe,
    name: 'Edge',
    text: 'nginx limits per IP, small bodies, short timeouts, CSP nonce',
  },
  { icon: Lock, name: 'Session', text: 'HttpOnly __Host- cookie, CSRF token, Argon2id passwords' },
  { icon: ShieldCheck, name: 'Input', text: 'Pydantic limits on every field, wiki allow list' },
  { icon: Database, name: 'Data', text: 'Owner checks on every query, titles and IDs only' },
  { icon: Server, name: 'Runtime', text: 'Non-root, read-only containers, no capabilities' },
]

export function DefenceLayers() {
  return (
    <Figure caption="A request has to get through each layer in turn. No single check is trusted to stop everything.">
      <ol className="space-y-2">
        {LAYERS.map((layer, i) => (
          <li
            key={layer.name}
            className="flex items-center gap-4 rounded-2xl border hairline bg-ink-2 p-4"
            style={{ marginLeft: `${i * 4}%`, marginRight: `${i * 4}%` }}
          >
            <layer.icon
              className="size-5 shrink-0 text-signal"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span className="w-20 shrink-0 font-mono text-xs text-paper">{layer.name}</span>
            <span className="text-sm text-paper/65">{layer.text}</span>
          </li>
        ))}
      </ol>
    </Figure>
  )
}

export type Step = { title: string; body: ReactNode }

export function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="my-8 space-y-0 border-l hairline">
      {steps.map((step, i) => (
        <li key={step.title} className="relative pb-10 pl-10 last:pb-0">
          <span className="absolute -left-4 top-0 grid size-8 place-items-center rounded-full border hairline bg-ink font-mono text-xs text-signal">
            {i + 1}
          </span>
          <p className="mb-2 font-serif text-2xl leading-tight">{step.title}</p>
          <div className="prose-shelf">{step.body}</div>
        </li>
      ))}
    </ol>
  )
}

export function Progress({ done, total }: { done: number; total: number }) {
  const pct = Math.round((done / total) * 100)
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--color-line)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label={`${done} of ${total} done`}
      >
        <div className="h-full rounded-full bg-signal" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-dim">
        {done}/{total}
      </span>
    </div>
  )
}
