import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { Reveal, Split } from './Reveal'

type HeaderProps = {
  eyebrow: string
  title: string
  intro: ReactNode
  aside?: ReactNode
}

export function PageHeader({ eyebrow, title, intro, aside }: HeaderProps) {
  return (
    <header className="gutter relative pt-40 pb-24 md:pt-52 md:pb-32">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
        <p className="label md:col-span-3">{eyebrow}</p>
        <div className="md:col-span-9">
          <Split as="h1" text={title} className="text-headline font-serif" />
        </div>
      </div>
      <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-12">
        <Reveal className="text-xl leading-snug text-paper/75 md:col-span-6 md:col-start-4 md:text-2xl">
          {intro}
        </Reveal>
        {aside ? <Reveal className="md:col-span-3 md:col-start-10">{aside}</Reveal> : null}
      </div>
    </header>
  )
}

type SectionProps = {
  index: string
  title: string
  id?: string
  children: ReactNode
}

export function Section({ index, title, id, children }: SectionProps) {
  const anchor = id ?? title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return (
    <section
      id={anchor}
      className="gutter border-t hairline py-20 md:py-28"
      aria-labelledby={`${anchor}-h`}
    >
      <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
        <div className="md:col-span-3">
          <div className="md:sticky md:top-28">
            <span className="mb-4 block font-mono text-xs text-signal">{index}</span>
            <h2 id={`${anchor}-h`} className="text-title font-serif">
              {title}
            </h2>
          </div>
        </div>
        <Reveal className="md:col-span-8 md:col-start-5">{children}</Reveal>
      </div>
    </section>
  )
}

export function Code({ label, children }: { label?: string; children: string }) {
  return (
    <figure className="my-8 overflow-hidden rounded-xl border hairline bg-ink-2">
      {label ? (
        <figcaption className="label flex items-center gap-2 border-b hairline px-5 py-3">
          <span className="size-1.5 rounded-full bg-signal" />
          {label}
        </figcaption>
      ) : null}
      <pre className="overflow-x-auto p-5 font-mono text-[0.8125rem] leading-relaxed text-paper/85">
        <code>{children}</code>
      </pre>
    </figure>
  )
}

export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="my-8 border-t hairline">
      {items.map(([k, v]) => (
        <div
          key={k}
          className="grid gap-2 border-b hairline py-4 sm:grid-cols-[14rem_1fr] sm:gap-8"
        >
          <dt className="text-paper/60">{k}</dt>
          <dd className="font-mono text-sm text-paper">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="my-10 rounded-2xl bg-paper p-7 text-ink md:p-9">
      <p className="mb-3 font-mono text-xs tracking-[0.1em] text-ink/60 uppercase">{title}</p>
      <div className="text-lg leading-relaxed [&_a]:underline [&_a]:decoration-signal [&_a]:underline-offset-4">
        {children}
      </div>
    </aside>
  )
}

export function NextPage({ to, title, text }: { to: string; title: string; text: string }) {
  return (
    <Link
      to={to}
      data-cursor-label="Next"
      className="group gutter block border-t hairline py-20 transition-colors duration-700 hover:bg-paper hover:text-ink md:py-28"
    >
      <span className="label mb-6 block group-hover:text-ink/60">Next</span>
      <span className="flex items-end justify-between gap-8">
        <span>
          <span className="text-headline block font-serif">{title}</span>
          <span className="mt-4 block max-w-xl text-lg text-paper/60 group-hover:text-ink/70">
            {text}
          </span>
        </span>
        <ArrowUpRight
          className="size-16 shrink-0 transition-transform duration-700 group-hover:translate-x-2 group-hover:-translate-y-2 md:size-24"
          strokeWidth={1}
          aria-hidden="true"
        />
      </span>
    </Link>
  )
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} rel="noopener" target="_blank">
      {children}
    </a>
  )
}
