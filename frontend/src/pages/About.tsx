import { ArrowUpRight } from 'lucide-react'

import { ExternalLink, NextPage, PageHeader, Section } from '../components/Page'
import { SITE } from '../seo/site'

export function About() {
  return (
    <article>
      <PageHeader
        eyebrow="About"
        title="Picking the articles is the hard part."
        intro={
          <>
            Millions of people learn without a reliable connection. Offline Wikipedia reaches them
            through Kiwix, on phones, laptops and classroom hotspots. OfflineShelf helps with the
            step before that: deciding which articles to carry.
          </>
        }
      />

      <Section index="01" title="Why it exists">
        <div className="prose-shelf">
          <p>
            A full English Wikipedia is over 100 GB with images. A school with a Raspberry Pi, a
            clinic with one laptop or a library with old phones needs a few thousand of the right
            articles, in the right language, kept current.
          </p>
          <p>
            Making those selections by hand does not scale, and doing it with scripts is not
            reproducible. OfflineShelf turns a selection into something you can describe, rebuild,
            combine and hand to someone else.
          </p>
          <h3>Standing on WP1</h3>
          <p>
            The ideas come from WP1, the tool Wikimedia's offline community uses to build article
            selections for Kiwix. OfflineShelf uses the same stack (Flask, RQ, MariaDB) and the same
            concepts (builders, combinations, queued builds) in a small, self-hostable package that
            does not need access to Wikimedia's database replicas.
          </p>
        </div>
      </Section>

      <Section index="02" title="Principles">
        <div className="prose-shelf">
          <ol>
            <li>
              <strong>Store titles, not text.</strong> The database holds what was picked, never
              what it says.
            </li>
            <li>
              <strong>Attribute everything.</strong> Every export carries the CC BY-SA licence and
              its authors.
            </li>
            <li>
              <strong>Be polite to Wikimedia.</strong> An identified User-Agent, maxlag, backoff,
              one build at a time.
            </li>
            <li>
              <strong>Never lose the last good list.</strong> A failed rebuild leaves the previous
              version in place.
            </li>
            <li>
              <strong>Stay small.</strong> Few dependencies, one Compose file, documented decisions.
            </li>
          </ol>
        </div>
      </Section>

      <Section index="03" title="Who makes it">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_auto] md:items-end">
          <div className="prose-shelf">
            <p>
              OfflineShelf is designed and built by <strong>{SITE.author.name}</strong>, in the
              open; the project is part of a proposal to the Kiwix community.
            </p>
            <p>
              More work, writing and contact details are on{' '}
              <ExternalLink href={SITE.author.url}>ahmershah.dev</ExternalLink>.
            </p>
          </div>
          <a
            href={SITE.author.url}
            rel="author noopener"
            target="_blank"
            data-cursor-label="Visit"
            className="group flex items-center gap-4 rounded-full border hairline py-3 pr-6 pl-3 transition-colors duration-500 hover:border-paper hover:bg-paper hover:text-ink"
          >
            <span className="grid size-12 place-items-center rounded-full bg-paper font-serif text-xl text-ink">
              SA
            </span>
            <span>
              <span className="block text-sm">{SITE.author.name}</span>
              <span className="block font-mono text-xs text-dim group-hover:text-ink/60">
                ahmershah.dev
              </span>
            </span>
            <ArrowUpRight className="size-5" strokeWidth={1.5} aria-hidden="true" />
          </a>
        </div>
      </Section>

      <Section index="04" title="Open source">
        <div className="prose-shelf">
          <p>
            The code is on <ExternalLink href={SITE.repo}>GitHub</ExternalLink> under the MIT
            licence: issues, the roadmap and the architecture notes are all public. Contributions
            are welcome; read the contributing guide and the code of conduct first.
          </p>
          <p>
            Wikipedia is a trademark of the Wikimedia Foundation. OfflineShelf is an independent
            project and is not endorsed by or affiliated with the Foundation.
          </p>
        </div>
      </Section>

      <NextPage to="/contact" title="Contact" text="Questions, ideas, partnerships." />
    </article>
  )
}
