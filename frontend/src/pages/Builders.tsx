import { Link } from 'react-router'

import { Callout, Code, Facts, NextPage, PageHeader, Section } from '../components/Page'
import { SetOperations } from '../components/Visuals'

const CHOOSE: [string, string, string][] = [
  ['A topic Wikipedia already groups', 'Category', 'Fast to set up; check the depth'],
  [
    'Things with a property: rivers, laureates, drugs',
    'Wikidata',
    'Precise; needs a little SPARQL',
  ],
  [
    'A syllabus or reading list you have',
    'Pasted titles',
    'Exactly what you paste, redirects followed',
  ],
  ['What people actually read', 'Pageviews', 'A month of the most-read articles'],
  ['Two lists, joined or subtracted', 'Combination', 'Union, intersection or difference'],
]

export function Builders() {
  return (
    <article>
      <PageHeader
        eyebrow="Builders"
        title="Five ways to ask Wikipedia for a list."
        intro={
          <>
            A builder turns a question into article titles. Each one reads from a different
            Wikimedia API, and each one tells you what it could not find instead of quietly dropping
            it.
          </>
        }
        aside={
          <p className="label leading-relaxed">
            Status: all five builders work end to end, checked against the live Wikimedia APIs.
            Public launch: February 2027.
          </p>
        }
      />

      <Section index="00" title="Which builder?">
        <div className="prose-shelf">
          <p>
            Start from what you already know about the list. Most collections end up as two or three
            simple lists combined, rather than one clever query.
          </p>
        </div>
        <div className="my-8 overflow-hidden rounded-2xl border hairline">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-2 text-xs text-dim">
              <tr>
                <th scope="col" className="px-4 py-3 font-normal">
                  You have
                </th>
                <th scope="col" className="px-4 py-3 font-normal">
                  Use
                </th>
                <th scope="col" className="hidden px-4 py-3 font-normal sm:table-cell">
                  Why
                </th>
              </tr>
            </thead>
            <tbody>
              {CHOOSE.map(([have, use, why]) => (
                <tr key={use} className="border-t hairline align-top">
                  <td className="px-4 py-3 text-paper/80">{have}</td>
                  <td className="px-4 py-3 font-serif text-lg text-paper">{use}</td>
                  <td className="hidden px-4 py-3 text-paper/55 sm:table-cell">{why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

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
              Type the category name with or without <code>Category:</code>; on other languages
              leave out the local prefix (<code>Impfstoff</code>, not{' '}
              <code>Kategorie:Impfstoff</code>).
            </li>
            <li>
              Every article is pinned to the revision it had at build time, so exports made later
              show the same text.
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
            <li>
              Each result row becomes one item: the <code>?item</code> variable if your query
              selects it, otherwise the first variable that holds a Wikidata item.
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

      <Section index="05" title="Combination">
        <div className="prose-shelf">
          <p>
            Join or subtract lists you already have. A combination takes 2 to 10 of your lists on
            the same wiki and an operation, and is built from the latest ready version of each. It
            rebuilds by itself whenever one of its sources gets a new version, so a chain like
            <em> (Physics or Chemistry) minus Biographies</em> stays current without a schedule.
          </p>
        </div>
        <SetOperations />
        <div className="prose-shelf">
          <ul>
            <li>
              Sources are read already sorted by page ID and merged in one pass, so combining lists
              of 100,000 articles uses no more memory than combining ten.
            </li>
            <li>
              A source that has never built successfully fails the combination with its name in the
              reason, instead of producing a partial result.
            </li>
            <li>
              A list that a combination uses cannot be deleted until the combination is deleted.
            </li>
          </ul>
        </div>
        <Code label="Parameters">{`{
  "kind": "combination",
  "operation": "difference",
  "sources": [12, 31]
}`}</Code>
      </Section>

      <Section index="06" title="Reading the report">
        <div className="prose-shelf">
          <p>
            Every successful build stores a small report next to its articles, shown in the{' '}
            <Link to="/app">app</Link> under <em>Details</em>. It is how you find the gaps: titles
            that do not exist, Wikidata items with no article in your language, ranking entries that
            were not articles. Lists in the report show their first few entries and a count.
          </p>
        </div>
        <Code label="A pasted list, built">{`input: 412
found: 398
redirected: 37
missing: 9 (Gauss law, Maxwells equations, ...)
invalid: 1 (Talk:)
not articles: 4 (Portal:Physics, ...)`}</Code>
      </Section>

      <Section index="07" title="Limits">
        <Facts
          items={[
            ['Category depth', '0 to 5'],
            ['Pasted titles', '20,000 per list'],
            ['SPARQL query', '10,000 characters, 60 s'],
            ['Top by pageviews', '1,000 articles'],
            ['Articles per list', '100,000'],
            ['Lists per account', '100'],
            ['Combination sources', '2 to 10 lists, same wiki'],
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
        text="Take a list offline: TSV, a static HTML bundle, and ZIM for Kiwix next."
      />
    </article>
  )
}
