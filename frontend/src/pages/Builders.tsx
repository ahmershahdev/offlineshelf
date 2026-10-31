import { Callout, Code, Facts, NextPage, PageHeader, Section } from '../components/Page'

export function Builders() {
  return (
    <article>
      <PageHeader
        eyebrow="Builders"
        title="Four ways to ask Wikipedia for a list."
        intro={
          <>
            A builder turns a question into article titles. Each one reads from a different
            Wikimedia API, and each one tells you what it could not find instead of quietly dropping
            it.
          </>
        }
        aside={
          <p className="label leading-relaxed">
            Status: the Wikimedia client and build queue are done. The four builders land with
            milestone M2.
          </p>
        }
      />

      <Section index="01" title="Category">
        <div className="prose-shelf">
          <p>
            Start from a Wikipedia category and walk down its subcategories to a depth you choose.
            Every article (namespace 0) found on the way goes on the list, once.
          </p>
          <ul>
            <li>
              <strong>Depth 0</strong> takes only the articles directly in the category; each extra
              level goes one subcategory further, up to 5.
            </li>
            <li>
              Category trees have loops (A sits in B, and B in A). Visited categories are tracked,
              so a loop is walked once and reported.
            </li>
            <li>
              Members come from the MediaWiki <code>categorymembers</code> API, 500 per request,
              with continuation until the category is exhausted.
            </li>
          </ul>
        </div>
        <Code label="Parameters">{`{
  "kind": "category",
  "category": "Vaccines",
  "depth": 3
}`}</Code>
        <Callout title="Choosing a depth">
          Deep trees drift. <em>Vaccines</em> at depth 1 is about vaccines; at depth 5 it reaches
          biographies of researchers and the companies that made them. Start at 1 or 2, look at the
          result, then go deeper if it is missing things.
        </Callout>
      </Section>

      <Section index="02" title="Wikidata">
        <div className="prose-shelf">
          <p>
            Write a SPARQL query against Wikidata and get the matching items as articles on the wiki
            you picked. This is the most precise builder: "every river in Pakistan longer than 100
            km" is one query.
          </p>
          <ul>
            <li>The query runs on the Wikidata Query Service with a 60 second limit.</li>
            <li>
              Items are matched to articles through Wikidata sitelinks for your wiki. Items without
              an article in that language are counted in the build report, so you can see the gaps.
            </li>
            <li>Queries are capped at 10,000 characters.</li>
          </ul>
        </div>
        <Code label="Rivers of Pakistan">{`SELECT ?item WHERE {
  ?item wdt:P31 wd:Q4022 ;   # instance of: river
        wdt:P17 wd:Q843 .    # country: Pakistan
}`}</Code>
      </Section>

      <Section index="03" title="Pasted titles">
        <div className="prose-shelf">
          <p>
            Paste a list you already have, one title per line: a syllabus, a reading list from a
            teacher, an export from another tool.
          </p>
          <ul>
            <li>
              Titles are normalised the way MediaWiki does it (underscores, spacing, first-letter
              case), so <code>albert_einstein</code> and <code>Albert Einstein</code> are one entry.
            </li>
            <li>
              Redirects are followed: <code>UK</code> becomes <em>United Kingdom</em>.
            </li>
            <li>Missing and invalid titles are listed in the report, not silently dropped.</li>
            <li>Up to 20,000 titles per list, looked up 50 at a time.</li>
          </ul>
        </div>
      </Section>

      <Section index="04" title="Pageviews">
        <div className="prose-shelf">
          <p>
            The most-read articles of a month, from the Wikimedia pageviews API. Useful as a
            starting point: what people on that wiki actually read.
          </p>
          <ul>
            <li>Up to the top 1,000 for any month since 2016.</li>
            <li>
              The raw ranking includes pages that are not articles: the main page, the search page,
              project pages. Those are removed and listed in the report.
            </li>
          </ul>
        </div>
        <Code label="Parameters">{`{ "kind": "pageviews", "year": 2026, "month": 8, "limit": 1000 }`}</Code>
      </Section>

      <Section index="05" title="Limits">
        <Facts
          items={[
            ['Category depth', '0 to 5'],
            ['Pasted titles', '20,000 per list'],
            ['SPARQL query', '10,000 characters, 60 s'],
            ['Top by pageviews', '1,000 articles'],
            ['Articles per list', '100,000'],
            ['Lists per account', '100'],
            ['Builds', '20 per hour per account'],
          ]}
        />
        <p className="prose-shelf">
          Limits are checked before anything is queued, and every one is configurable on a
          self-hosted install.
        </p>
      </Section>

      <NextPage
        to="/exports"
        title="Exports"
        text="TSV, a static HTML bundle, and ZIM for Kiwix."
      />
    </article>
  )
}
