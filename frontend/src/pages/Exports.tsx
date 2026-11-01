import { Link } from 'react-router'

import {
  Callout,
  Code,
  ExternalLink,
  Facts,
  NextPage,
  PageHeader,
  Section,
} from '../components/Page'
import { BundlePreview, Steps } from '../components/Visuals'

export function Exports() {
  return (
    <article>
      <PageHeader
        eyebrow="Exports"
        title="From a list to a device in a classroom."
        intro={
          <>
            A list is only useful once it leaves the browser. Export the titles for your own tools,
            or the articles themselves as offline pages that open from a USB stick with no internet,
            no server and no install.
          </>
        }
        aside={<p className="label leading-relaxed">Live: TSV, HTML bundle and ZIM for Kiwix.</p>}
      />

      <Section index="01" title="Pick a format">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ['TSV', 'Titles, page IDs and revision IDs', 'Spreadsheets, scripts, mwoffliner'],
            ['HTML bundle', 'Every article as an offline page', 'USB sticks, school servers, a Pi'],
            ['ZIM', 'One searchable file for the Kiwix apps', 'Phones, tablets, Kiwix hotspots'],
          ].map(([name, what, where]) => (
            <div key={name} className="rounded-2xl border hairline bg-ink-2 p-5">
              <p className="font-serif text-2xl">{name}</p>
              <p className="mt-2 text-sm text-paper/70">{what}</p>
              <p className="mt-4 font-mono text-xs text-dim">{where}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section index="02" title="TSV">
        <div className="prose-shelf">
          <p>
            One row per article: title, page ID and revision ID, tab separated, UTF-8. It opens in
            any spreadsheet and feeds straight into scripts, including Kiwix&rsquo;s own tooling
            (mwoffliner takes a list of titles). A list of 100,000 articles streams in seconds,
            because rows are read from the database in batches and never held in memory.
          </p>
          <p>
            The first lines start with <code>#</code> and carry the list name, the wiki, the build
            time and the licence. A Wikipedia title can never start with <code>#</code>, so tools
            can skip those lines safely: in pandas,{' '}
            <code>read_csv(sep=&quot;\t&quot;, comment=&quot;#&quot;)</code>.
          </p>
        </div>
        <Code label="offlineshelf-12-v4.tsv">{`# Vaccines
# Titles and IDs from https://en.wikipedia.org/ as of 2026-12-01T00:12:44Z
# Content by en.wikipedia.org contributors, licensed CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/
# Made with OfflineShelf: https://offlineshelf.ahmershah.dev
title\tpage_id\trevision_id
Vaccine\t32616\t1248551023
Polio vaccine\t2361497\t1247012388
Smallpox vaccine\t1209427\t1246780455`}</Code>
      </Section>

      <Section index="03" title="HTML bundle">
        <div className="prose-shelf">
          <p>
            Every article on the list as a static HTML page, fetched from Wikipedia at the exact
            revision stored in the version. Pages are cleaned up for offline reading:
          </p>
          <ul>
            <li>
              Links to other articles on the list open the local copy, keeping section anchors.
            </li>
            <li>Links to articles that are not on the list point back to Wikipedia.</li>
            <li>Scripts are removed; a small built-in stylesheet keeps pages readable.</li>
            <li>Every page ends with its source revision, the licence and a history link.</li>
            <li>
              Pages deleted since the build are listed on the index as not available, instead of
              breaking the bundle.
            </li>
          </ul>
        </div>
        <BundlePreview />
        <Callout title="About images">
          Images are linked, not copied: they load when a device is online and show as missing when
          it is not. Each image keeps its own licence on Wikimedia Commons. HTML bundles and ZIM
          files carry text only, which keeps a 1,000-article export to a few megabytes.
        </Callout>
      </Section>

      <Section index="04" title="Make a bundle">
        <Steps
          steps={[
            {
              title: 'Open the list',
              body: (
                <p>
                  In <Link to="/app">the app</Link>, open <em>Details</em> on a list with a ready
                  version. Pick the version you want in the history; the latest ready one is chosen
                  for you.
                </p>
              ),
            },
            {
              title: 'Make the bundle',
              body: (
                <p>
                  Press <em>Make HTML bundle</em>. It is built in the background, one article at a
                  time to stay polite to Wikipedia; progress shows as articles fetched out of the
                  total. A few hundred articles take a few minutes.
                </p>
              ),
            },
            {
              title: 'Download within 7 days',
              body: (
                <p>
                  When it is ready, <em>Download HTML bundle</em> shows the size and the date it
                  expires. After seven days the file is deleted; make a new one from the same
                  version and you get the same articles.
                </p>
              ),
            },
          ]}
        />
      </Section>

      <Section index="05" title="Take it offline">
        <div className="prose-shelf">
          <h3>On a USB stick or laptop</h3>
          <p>
            Unzip the bundle and open <code>index.html</code> in any browser. Everything works from
            the file system; there is nothing to install.
          </p>
          <h3>On a school or clinic server</h3>
          <p>
            Serve the unzipped folder with any static web server so every device on the local
            network can read it:
          </p>
        </div>
        <Code label="Raspberry Pi or any Linux box">{`unzip offlineshelf-12-v4.zip -d /srv/shelf
cd /srv/shelf && python3 -m http.server 8000
# devices on the same Wi-Fi open http://<pi-address>:8000`}</Code>
        <div className="prose-shelf">
          <h3>With Kiwix</h3>
          <p>
            Choose <em>Make ZIM file for Kiwix</em> instead of the HTML bundle. You get one file
            with the same pages, the list&rsquo;s index as its main page, full-text search, and the
            metadata the Kiwix library shows (title, language, date, licence). Open it in Kiwix on
            Android, iOS, Windows, macOS or Linux, or copy it to a Kiwix hotspot. For collections
            bigger than 1,000 articles, feed the TSV titles to{' '}
            <ExternalLink href="https://github.com/openzim/mwoffliner">mwoffliner</ExternalLink>.
          </p>
        </div>
      </Section>

      <Section index="06" title="Attribution">
        <div className="prose-shelf">
          <p>
            Wikipedia text is licensed under{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="noopener license">
              CC BY-SA 4.0
            </a>
            . Sharing it offline is allowed as long as the authors are credited and the licence
            travels with the text. Every export does both, so you can hand a bundle to anyone:
          </p>
          <ul>
            <li>TSV: the licence and source in the header lines.</li>
            <li>Bundle: an ATTRIBUTION page listing every article with a link to its authors.</li>
            <li>Bundle: a footer on every article with its exact revision and the licence.</li>
          </ul>
          <p>
            If you change the articles and share them, keep the licence and say what you changed.
          </p>
        </div>
        <Callout title="What OfflineShelf keeps">
          Only titles and IDs live in the database. Article text is fetched while a bundle is
          written, packed into the zip and never stored anywhere else.
        </Callout>
      </Section>

      <Section index="07" title="Details">
        <Facts
          items={[
            ['TSV delivery', 'Streamed from the database in batches of 5,000'],
            ['TSV size limit', 'None beyond the list itself (100,000 articles)'],
            ['Bundle size limit', '1,000 articles per bundle'],
            ['Bundle reuse', 'Asking twice for the same version returns the same bundle'],
            ['Expiry', '7 days, then deleted; make a new one any time'],
            ['Who can download', 'Only the owner of the list, signed in'],
          ]}
        />
      </Section>

      <NextPage
        to="/developers"
        title="Developers"
        text="The JSON API behind the app, with a quickstart."
      />
    </article>
  )
}
