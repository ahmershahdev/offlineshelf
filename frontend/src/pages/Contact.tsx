import { ArrowUpRight, GitBranch, Globe, Mail, ShieldCheck } from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

import { PageHeader, Section } from '../components/Page'
import { SITE } from '../seo/site'

type Channel = {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  text: string
  href: string
  value: string
}

const CHANNELS: Channel[] = [
  {
    icon: Mail,
    title: 'Email',
    text: 'Questions, ideas, partnerships, account deletion.',
    href: `mailto:${SITE.email}`,
    value: SITE.email,
  },
  {
    icon: GitBranch,
    title: 'GitHub issues',
    text: 'Bugs and feature requests, in public.',
    href: `${SITE.repo}/issues`,
    value: 'github.com/ahmershahdev/offlineshelf',
  },
  {
    icon: ShieldCheck,
    title: 'Security',
    text: 'Vulnerabilities, privately. See the security page.',
    href: `${SITE.repo}/security/advisories/new`,
    value: 'Private advisory',
  },
  {
    icon: Globe,
    title: 'The maker',
    text: `${SITE.author.name}: other projects and writing.`,
    href: SITE.author.url,
    value: 'ahmershah.dev',
  },
]

export function Contact() {
  return (
    <article>
      <PageHeader
        eyebrow="Contact"
        title="Say hello. Real person, real inbox."
        intro={
          <>
            There is no contact form: forms collect data, and email already works. Write to{' '}
            <a className="link-draw text-paper" href={`mailto:${SITE.email}`}>
              {SITE.email}
            </a>{' '}
            and expect an answer within a few days.
          </>
        }
      />

      <section className="gutter pb-24" aria-label="Ways to reach us">
        <ul className="grid border-t hairline md:grid-cols-2">
          {CHANNELS.map(({ icon: Icon, title, text, href, value }) => (
            <li key={title} className="border-b hairline md:odd:border-r">
              <a
                href={href}
                rel={href.startsWith('mailto:') ? undefined : 'noopener'}
                target={href.startsWith('mailto:') ? undefined : '_blank'}
                data-cursor-label="Open"
                className="group relative flex min-h-[18rem] flex-col justify-between overflow-hidden p-8 md:p-12"
              >
                <span className="absolute inset-0 origin-bottom scale-y-0 bg-paper transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-y-100" />
                <span className="relative flex items-start justify-between">
                  <Icon
                    className="size-8 transition-colors group-hover:text-ink"
                    strokeWidth={1.25}
                    aria-hidden="true"
                  />
                  <ArrowUpRight
                    className="size-6 transition-[transform,color] duration-700 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-ink"
                    strokeWidth={1.25}
                    aria-hidden="true"
                  />
                </span>
                <span className="relative">
                  <span className="mb-2 block font-serif text-4xl transition-colors group-hover:text-ink md:text-5xl">
                    {title}
                  </span>
                  <span className="mb-6 block text-paper/60 transition-colors group-hover:text-ink/70">
                    {text}
                  </span>
                  <span className="block font-mono text-sm text-signal">{value}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <Section index="01" title="Before you write">
        <div className="prose-shelf">
          <ul>
            <li>
              <strong>An article is wrong?</strong> OfflineShelf only picks articles; the text comes
              from Wikipedia. Fix it there, and the next rebuild picks up the change.
            </li>
            <li>
              <strong>A list picked the wrong articles?</strong> Open an issue with the list
              settings (wiki, builder and parameters) so it can be reproduced.
            </li>
            <li>
              <strong>Delete your account?</strong> Email from the address you signed up with.
            </li>
          </ul>
        </div>
      </Section>
    </article>
  )
}
