import { Link } from 'react-router'

import { Callout, Facts, NextPage, PageHeader, Section } from '../components/Page'
import { Pipeline, Steps, VersionHistory } from '../components/Visuals'

const LIMITS: [string, string][] = [
  ['Category depth', '0 to 5 levels'],
  ['Pasted titles', '20,000 per list'],
  ['SPARQL query', '10,000 characters, 60 s on the query service'],
  ['Top by pageviews', '1,000 articles'],
  ['Articles per list', '100,000'],
  ['Combination sources', '2 to 10 lists'],
  ['HTML bundle', '1,000 articles; use TSV for bigger lists'],
  ['Lists per account', '100'],
  ['Builds', '20 per hour per account'],
]

export function HowItWorks() {
  return (
    <article>
      <PageHeader
        eyebrow="How it works"
        title="From a question to a shelf of articles."
        intro={
          <>
            OfflineShelf decides which articles go offline and keeps that decision reproducible. You
            describe a list once; it is built in the background, kept as versions, rebuilt on a
            schedule and exported when you need it. Article text stays with Wikipedia until the
            moment you export.
          </>
        }
        aside={
          <p className="label leading-relaxed">
            Reading time: 6 minutes. New here? Start with the walkthrough in section 02.
          </p>
        }
      />

      <Section index="01" title="The pipeline">
        <div className="prose-shelf">
          <p>
            Every list, whatever builder made it, moves through the same five steps. The web app
            never talks to Wikipedia directly: it asks the API to queue work, and a background
            worker does the fetching. That keeps pages fast, keeps one slow category tree from
            blocking anyone else, and means a closed browser tab never loses a build.
          </p>
        </div>
        <Pipeline />
      </Section>

      <Section index="02" title="A walkthrough">
        <div className="prose-shelf">
          <p>
            Say a district health office wants every Wikipedia article about vaccines on the tablets
            of rural clinics, kept up to date once a month.
          </p>
        </div>
        <Steps
          steps={[
            {
              title: 'Create the list',
              body: (
                <p>
                  In <Link to="/app">the app</Link>, choose <em>New list</em>, name it
                  &ldquo;Vaccines&rdquo;, keep <code>en.wikipedia.org</code>, pick the{' '}
                  <Link to="/builders">Category builder</Link> with <code>Vaccines</code> at depth
                  2, and tick <em>Rebuild every month</em>. Nothing is fetched yet; the settings are
                  checked against the limits and saved.
                </p>
              ),
            },
            {
              title: 'Build it',
              body: (
                <p>
                  Press <em>Build</em>. A version appears as <code>queued</code>, turns{' '}
                  <code>building</code> while the worker walks the category tree, and ends{' '}
                  <code>ready</code> with an article count and a short report: categories visited,
                  loops skipped. Open <em>Details</em> to see every title, linked to the wiki.
                </p>
              ),
            },
            {
              title: 'Check the result',
              body: (
                <p>
                  Read the list before you ship it. If depth 2 pulled in vaccine manufacturers you
                  do not want, make a second list of those and combine the two with a{' '}
                  <em>difference</em>: Vaccines minus Companies. The combination rebuilds by itself
                  whenever either list gets a new version.
                </p>
              ),
            },
            {
              title: 'Export',
              body: (
                <p>
                  Download a TSV for your own tools, or make an{' '}
                  <Link to="/exports">HTML bundle</Link>: a zip of offline pages with an index and
                  an attribution page. Copy it to a USB stick or the clinic server and open{' '}
                  <code>index.html</code>.
                </p>
              ),
            },
            {
              title: 'Let it run',
              body: (
                <p>
                  On the first of every month the list rebuilds. Each build is a new version next to
                  the old ones, and you can open or export any of them.
                </p>
              ),
            },
          ]}
        />
      </Section>

      <Section index="03" title="Versions">
        <div className="prose-shelf">
          <p>
            A build never edits a list in place. It writes a new version, in one database
            transaction, and only a version that finished is ever shown as current. Readers never
            see half a list, and an export always comes from one consistent version.
          </p>
          <p>
            Each article is stored with its page ID and the revision ID it had at build time. The
            revision pins the exact text: an export made next year from this version shows the
            articles as they were today.
          </p>
        </div>
        <VersionHistory />
      </Section>

      <Section index="04" title="Schedules">
        <div className="prose-shelf">
          <p>
            Lists marked <em>monthly</em> are rebuilt once per calendar month (UTC). A scheduler
            checks every hour and queues any monthly list that has not been built since the first of
            the month, so a server that was down on the first catches up within the hour instead of
            waiting another month. Running the check twice never builds a list twice.
          </p>
          <p>
            Combinations do not need a schedule. When any source list gets a new ready version,
            every combination that uses it is queued, and chains of combinations update in turn.
          </p>
        </div>
      </Section>

      <Section index="05" title="When something fails">
        <div className="prose-shelf">
          <ul>
            <li>
              <strong>Wikimedia is busy or the network drops.</strong> Requests are retried with
              backoff inside the build; if that is not enough, the whole build is retried after 1, 5
              and 15 minutes.
            </li>
            <li>
              <strong>The question has no answer.</strong> A missing category, a SPARQL query that
              times out, more than 100,000 articles: the build fails at once with a reason you can
              read in the history.
            </li>
            <li>
              <strong>You are told.</strong> The owner gets an email with the reason, at most one
              per list per day, so a broken monthly list does not flood an inbox.
            </li>
          </ul>
        </div>
        <Callout title="The rule that matters">
          A failed build never replaces the last good version. Links, exports and combinations keep
          using the version that worked until a new one succeeds.
        </Callout>
      </Section>

      <Section index="06" title="Limits">
        <div className="prose-shelf">
          <p>
            Every input has a ceiling, checked before anything is queued. They keep one list from
            using up a shared server or Wikimedia&rsquo;s patience, and every one can be changed on
            a <Link to="/self-host">self-hosted install</Link>.
          </p>
        </div>
        <Facts items={LIMITS} />
      </Section>

      <NextPage
        to="/builders"
        title="Builders"
        text="Five ways to turn a question into a list, and how to choose."
      />
    </article>
  )
}
