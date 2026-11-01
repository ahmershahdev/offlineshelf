import { Callout, ExternalLink, NextPage, PageHeader, Section } from '../components/Page'
import { SITE } from '../seo/site'
import { DefenceLayers } from '../components/Visuals'

const MEASURES: [string, string][] = [
  [
    'Passwords',
    'Hashed with Argon2id (RFC 9106 parameters) and re-hashed when the parameters change. 12 to 256 characters. Wrong email and wrong password get the same answer in the same time.',
  ],
  [
    'Sessions',
    'HttpOnly, SameSite=Lax cookies; in production Secure with the __Host- prefix. A new session on every sign-in. "Sign out everywhere" ends every session at once.',
  ],
  [
    'CSRF',
    'Every state-changing request needs a per-session token in a header, and the browser must say it is same-origin. A form on another site cannot do either.',
  ],
  [
    'Content Security Policy',
    'A new nonce for every page, strict-dynamic, no inline styles, no third-party scripts, fonts or images. The API answers with default-src none.',
  ],
  [
    'Injection',
    'All database access goes through bound parameters. Input is validated against strict schemas with upper limits on every field.',
  ],
  [
    'Rate limits',
    'At the edge (per IP and per connection) and in the app (per IP, per email for sign-in, per account for builds).',
  ],
  [
    'Access',
    "Lists are only ever queried with the owner. Someone else's list is a 404, so IDs cannot be probed.",
  ],
  [
    'Outbound requests',
    'Only Wikimedia hosts on an allow list are ever contacted, so a list cannot be pointed at an internal address.',
  ],
  [
    'Containers',
    'Non-root users, read-only file systems, all Linux capabilities dropped, database and Redis bound to localhost.',
  ],
]

export function Security() {
  return (
    <article>
      <PageHeader
        eyebrow="Security"
        title="Built small, so there is less to attack."
        intro={
          <>
            OfflineShelf stores an email address, a password hash and list settings. Nothing else
            about you. What it does store is protected by default, and the code is open for anyone
            to check.
          </>
        }
      />

      <Section index="01" title="Reporting a problem">
        <div className="prose-shelf">
          <p>Please report vulnerabilities privately, not in a public issue:</p>
          <ul>
            <li>
              <ExternalLink href={`${SITE.repo}/security/advisories/new`}>
                GitHub private advisory
              </ExternalLink>{' '}
              (preferred)
            </li>
            <li>
              Email <a href={`mailto:${SITE.email}?subject=Security`}>{SITE.email}</a> with
              "Security" in the subject
            </li>
          </ul>
          <p>
            Include the affected page or endpoint, steps to reproduce and the impact. You will get a
            first answer within 7 days. Machine-readable details are in{' '}
            <a href="/.well-known/security.txt">security.txt</a>.
          </p>
        </div>
      </Section>

      <Section index="02" title="What is in place">
        <DefenceLayers />
        <dl className="border-t hairline">
          {MEASURES.map(([title, text]) => (
            <div
              key={title}
              className="grid grid-cols-1 gap-3 border-b hairline py-6 md:grid-cols-[13rem_1fr] md:gap-10"
            >
              <dt className="font-serif text-2xl">{title}</dt>
              <dd className="text-paper/70">{text}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section index="03" title="Checked on every change">
        <div className="prose-shelf">
          <p>
            A pull request cannot merge into <code>main</code> until these pass: backend tests
            against real MariaDB and Redis, strict type checks on both sides, linters, and GitHub
            CodeQL analysis for Python and TypeScript. Dependabot watches every dependency and base
            image.
          </p>
        </div>
        <Callout title="Scope">
          In scope: this site, its API and the code in the repository. Out of scope: Wikipedia and
          other Wikimedia sites (report those to the Wikimedia Foundation), denial-of-service
          testing, and social engineering.
        </Callout>
      </Section>

      <NextPage to="/about" title="About" text="Why OfflineShelf exists and who makes it." />
    </article>
  )
}
