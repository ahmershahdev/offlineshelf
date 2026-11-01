import { Callout, Code, ExternalLink, NextPage, PageHeader, Section } from '../components/Page'
import { SITE } from '../seo/site'
import { Steps } from '../components/Visuals'

const ENDPOINTS: [string, string, string][] = [
  ['GET', '/api/v1/health', 'Database and Redis status'],
  ['GET', '/api/v1/auth/csrf', 'CSRF token for this session'],
  ['POST', '/api/v1/auth/register', 'Create an account and sign in'],
  ['POST', '/api/v1/auth/login', 'Sign in'],
  ['POST', '/api/v1/auth/logout', 'Sign out'],
  ['POST', '/api/v1/auth/logout-everywhere', 'End every session of the account'],
  ['GET', '/api/v1/auth/me', 'The signed-in user'],
  ['GET', '/api/v1/lists', 'Your lists, newest first'],
  ['POST', '/api/v1/lists', 'Create a list'],
  ['GET', '/api/v1/lists/{id}', 'One list'],
  ['DELETE', '/api/v1/lists/{id}', 'Delete a list and its versions'],
  ['POST', '/api/v1/lists/{id}/build', 'Queue a build'],
  ['GET', '/api/v1/lists/{id}/versions', 'Build history'],
  ['GET', '/api/v1/lists/{id}/versions/{v}', 'One version and its report'],
  ['GET', '/api/v1/lists/{id}/versions/{v}/articles', 'Articles in a version'],
  ['GET', '/api/v1/lists/{id}/versions/{v}/export.tsv', 'Stream a version as TSV'],
  ['POST', '/api/v1/lists/{id}/versions/{v}/exports', 'Queue an HTML bundle'],
  ['GET', '/api/v1/lists/{id}/versions/{v}/exports', 'Recent bundles and their progress'],
  ['GET', '/api/v1/lists/{id}/exports/{e}/download', 'Download a ready bundle'],
]

export function Developers() {
  return (
    <article>
      <PageHeader
        eyebrow="Developers"
        title="A small JSON API, documented."
        intro={
          <>
            Everything the app does goes through the same API under <code>/api/v1</code>. The
            contract is an OpenAPI 3.1 file in the repository; the frontend types are generated from
            it, and a test fails if the server and the file disagree.
          </>
        }
        aside={
          <p className="label leading-relaxed">
            <ExternalLink href={`${SITE.repo}/blob/main/docs/openapi.yaml`}>
              docs/openapi.yaml
            </ExternalLink>
          </p>
        }
      />

      <Section index="01" title="Endpoints">
        <ul className="border-t hairline font-mono text-sm">
          {ENDPOINTS.map(([method, path, what]) => (
            <li
              key={`${method} ${path}`}
              className="grid grid-cols-[4.5rem_1fr] gap-x-4 gap-y-1 border-b hairline py-4 md:grid-cols-[5rem_minmax(0,1fr)_minmax(0,0.8fr)]"
            >
              <span className="text-signal">{method}</span>
              <span className="break-all text-paper">{path}</span>
              <span className="col-start-2 font-sans text-paper/55 md:col-start-3">{what}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section index="02" title="Sessions and CSRF">
        <div className="prose-shelf">
          <p>
            The API uses a session cookie (HttpOnly, SameSite=Lax, and in production Secure with the{' '}
            <code>__Host-</code> prefix). Every POST, PUT, PATCH and DELETE must also send the
            session's CSRF token in the <code>X-CSRF-Token</code> header. Sign-in and sign-out
            return a fresh token.
          </p>
        </div>
        <Code label="Sign in, create a list, build it">{`# 1. token for this session
curl -c jar -b jar https://offlineshelf.ahmershah.dev/api/v1/auth/csrf
# {"token": "k3Jx..."}

# 2. sign in (returns a new token)
curl -c jar -b jar -H 'X-CSRF-Token: k3Jx...' -H 'Content-Type: application/json' \\
  -d '{"email": "you@example.org", "password": "a long passphrase"}' \\
  https://offlineshelf.ahmershah.dev/api/v1/auth/login

# 3. create a list
curl -c jar -b jar -H 'X-CSRF-Token: <new token>' -H 'Content-Type: application/json' \\
  -d '{"name": "Vaccines", "wiki": "en.wikipedia.org",
       "params": {"kind": "category", "category": "Vaccines", "depth": 2}}' \\
  https://offlineshelf.ahmershah.dev/api/v1/lists

# 4. build it; poll the version until "ready" or "failed"
curl -X POST ... /api/v1/lists/42/build`}</Code>
      </Section>

      <Section index="03" title="Quickstart">
        <Steps
          steps={[
            {
              title: 'Get a token and sign in',
              body: (
                <p>
                  Keep a cookie jar between calls. <code>GET /auth/csrf</code> returns a token; send
                  it in <code>X-CSRF-Token</code> on every unsafe request. Sign-in answers with a
                  new one.
                </p>
              ),
            },
            {
              title: 'Create a list',
              body: (
                <p>
                  <code>POST /lists</code> with a name, a wiki and the builder parameters. The
                  answer is <code>201</code> with the list and a <code>Location</code> header.
                </p>
              ),
            },
            {
              title: 'Build and poll',
              body: (
                <p>
                  <code>POST /lists/{'{id}'}/build</code> answers <code>202</code>. Poll{' '}
                  <code>GET /lists/{'{id}'}/versions?limit=1</code> every few seconds until the
                  status is <code>ready</code> or <code>failed</code>.
                </p>
              ),
            },
            {
              title: 'Read or export',
              body: (
                <p>
                  Page through <code>/articles</code>, stream <code>/export.tsv</code>, or queue a
                  bundle with <code>POST /exports</code> and poll it until it is ready to download.
                </p>
              ),
            },
          ]}
        />
        <Code label="Export a ready version">{`# TSV, streamed
curl -b jar -o vaccines.tsv   https://offlineshelf.ahmershah.dev/api/v1/lists/42/versions/7/export.tsv

# HTML bundle: queue, poll, download
curl -b jar -c jar -H 'X-CSRF-Token: <token>' -H 'Content-Type: application/json'   -d '{"format": "html"}' https://offlineshelf.ahmershah.dev/api/v1/lists/42/versions/7/exports
# {"id": 3, "status": "queued", "progress": 0, "total": 312, ...}
curl -b jar https://offlineshelf.ahmershah.dev/api/v1/lists/42/versions/7/exports
# {"items": [{"id": 3, "status": "ready", "size_bytes": 4182233, "expires_at": "2026-12-08T10:02:11Z", ...}]}
curl -b jar -OJ https://offlineshelf.ahmershah.dev/api/v1/lists/42/exports/3/download`}</Code>
        <Code label="A combination">{`{
  "name": "Physics minus biographies",
  "wiki": "en.wikipedia.org",
  "params": { "kind": "combination", "operation": "difference", "sources": [12, 31] }
}`}</Code>
      </Section>

      <Section index="04" title="Errors">
        <div className="prose-shelf">
          <p>
            Every error is an RFC 9457 problem document with the content type{' '}
            <code>application/problem+json</code>. Validation errors list the field and the reason,
            never the value you sent.
          </p>
        </div>
        <Code label="422 Validation failed">{`{
  "type": "about:blank",
  "title": "Validation failed",
  "status": 422,
  "errors": [
    { "loc": ["params", "category", "depth"],
      "msg": "Value error, depth must be at most 5",
      "type": "value_error" }
  ]
}`}</Code>
      </Section>

      <Section index="05" title="Builds and versions">
        <div className="prose-shelf">
          <p>
            <code>POST /lists/{'{id}'}/build</code> answers <code>202</code> with a version in{' '}
            <code>queued</code>. A worker moves it to <code>building</code>, then <code>ready</code>{' '}
            or <code>failed</code>. Only one build per list runs at a time; a second request gets{' '}
            <code>409</code>.
          </p>
          <p>
            A failed build never replaces the last good version. Network trouble with Wikimedia is
            retried after 1, 5 and 15 minutes; anything else fails at once with a readable reason.
          </p>
        </div>
      </Section>

      <Section index="06" title="Exports">
        <div className="prose-shelf">
          <p>
            <code>export.tsv</code> streams a ready version directly. HTML bundles are jobs:{' '}
            <code>POST /exports</code> answers <code>202</code> with an export in{' '}
            <code>queued</code>, and <code>progress</code> counts articles fetched out of{' '}
            <code>total</code>. Asking again for the same version returns the bundle that is already
            queued, running or ready.
          </p>
          <ul>
            <li>
              <code>409</code> if the version is not ready, <code>422</code> if it has more than
              1,000 articles.
            </li>
            <li>
              Downloads answer <code>404</code> until the bundle is ready and <code>410</code> once
              it has expired (after 7 days).
            </li>
            <li>
              All timestamps are UTC with a <code>Z</code> suffix.
            </li>
          </ul>
        </div>
      </Section>

      <Section index="07" title="Rate limits">
        <div className="prose-shelf">
          <ul>
            <li>300 requests a minute per IP across the API.</li>
            <li>Sign-in and sign-up: 10 a minute per IP and per email address.</li>
            <li>Creating and deleting lists: 30 a minute. Builds: 20 an hour.</li>
          </ul>
          <p>
            Limited responses are <code>429</code> with <code>Retry-After</code> and{' '}
            <code>X-RateLimit-*</code> headers.
          </p>
        </div>
        <Callout title="Pagination">
          List endpoints are cursor based: pass <code>next_cursor</code> from one page as{' '}
          <code>cursor</code> to get the next. Cursors stay correct while lists are added or
          removed, unlike page numbers.
        </Callout>
      </Section>

      <NextPage
        to="/self-host"
        title="Self-hosting"
        text="Run your own OfflineShelf with Docker Compose."
      />
    </article>
  )
}
