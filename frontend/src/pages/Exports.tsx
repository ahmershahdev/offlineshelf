import { Callout, Code, Facts, NextPage, PageHeader, Section } from '../components/Page'

export function Exports() {
  return (
    <article>
      <PageHeader
        eyebrow="Exports"
        title="From a list to a device in a classroom."
        intro={
          <>
            A list is only useful once it leaves the browser. OfflineShelf exports the titles for
            your own tools, the articles as a static site, and later a ZIM file that Kiwix opens
            anywhere.
          </>
        }
        aside={<p className="label leading-relaxed">Status: exports arrive with milestone M4.</p>}
      />

      <Section index="01" title="TSV">
        <div className="prose-shelf">
          <p>
            One row per article: title, page ID and revision ID. It opens in any spreadsheet and
            feeds straight into scripts, including Kiwix's own tooling (mwoffliner takes a list of
            titles).
          </p>
          <p>
            The revision ID pins the exact version of each article, so a list exported today can be
            rebuilt from the same text next year.
          </p>
        </div>
        <Code label="vaccines-v4.tsv">{`title\tpage_id\trevision_id
Vaccine\t32616\t1248551023
Polio vaccine\t2361497\t1247012388
Smallpox vaccine\t1209427\t1246780455`}</Code>
      </Section>

      <Section index="02" title="HTML bundle">
        <div className="prose-shelf">
          <p>
            Every article as a static HTML page, fetched from the Wikimedia REST API (Parsoid HTML)
            at the pinned revision. Links between articles on the list are rewritten to point at the
            local files; links to articles not on the list point back to Wikipedia.
          </p>
          <p>
            Unzip it on a USB stick, a school server or a Raspberry Pi and open{' '}
            <code>index.html</code>. No server, no internet, no install.
          </p>
        </div>
        <Code label="Bundle layout">{`vaccines-v4/
  index.html            list of every article
  ATTRIBUTION.html      authors, licence, revision links
  articles/
    Vaccine.html
    Polio_vaccine.html
  assets/style.css`}</Code>
      </Section>

      <Section index="03" title="ZIM for Kiwix">
        <div className="prose-shelf">
          <p>
            ZIM is the single-file format Kiwix reads on Android, iOS, desktops and the Kiwix
            hotspot. A ZIM export packs the articles, a main page and the metadata Kiwix shows in
            its library.
          </p>
          <p>
            It is a stretch goal for small lists first, built with <code>python-libzim</code>. For
            large collections, the TSV feeds Kiwix's own mwoffliner today.
          </p>
        </div>
      </Section>

      <Section index="04" title="Attribution">
        <div className="prose-shelf">
          <p>
            Wikipedia text is licensed under{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="noopener license">
              CC BY-SA 4.0
            </a>
            . Sharing it offline is allowed as long as the authors are credited and the licence
            travels with the text. Every export does both:
          </p>
          <ul>
            <li>an attribution page listing each article with a link to its history,</li>
            <li>the licence text and a short notice in every page footer,</li>
            <li>the exact revision each article was taken from.</li>
          </ul>
        </div>
        <Callout title="What OfflineShelf keeps">
          Only titles and IDs live in the database. Article text is fetched while an export is
          written and is never stored by OfflineShelf.
        </Callout>
      </Section>

      <Section index="05" title="Downloads">
        <Facts
          items={[
            ['Delivery', 'Streamed, so large files never sit in memory'],
            ['Expiry', '7 days, then rebuilt on request'],
            ['Formats', 'TSV (M4), HTML bundle (M4), ZIM (stretch)'],
          ]}
        />
      </Section>

      <NextPage
        to="/developers"
        title="Developers"
        text="The JSON API behind the app, with examples."
      />
    </article>
  )
}
