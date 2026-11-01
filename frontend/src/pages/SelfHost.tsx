import {
  Callout,
  Code,
  ExternalLink,
  Facts,
  NextPage,
  PageHeader,
  Section,
} from '../components/Page'
import { SITE } from '../seo/site'
import { StackDiagram } from '../components/Visuals'

export function SelfHost() {
  return (
    <article>
      <PageHeader
        eyebrow="Self-hosting"
        title="Your own shelf, on your own server."
        intro={
          <>
            OfflineShelf is MIT licensed and ships as one Docker Compose file: the web server, the
            API, a build worker, a scheduler, MariaDB and Redis. A small virtual server or a spare
            machine in a library is enough, and the whole install takes about ten minutes.
          </>
        }
      />

      <Section index="00" title="What runs">
        <StackDiagram />
      </Section>

      <Section index="01" title="Requirements">
        <Facts
          items={[
            ['Docker', 'Docker Engine 24+ with Compose v2'],
            ['Memory', '2 GB is comfortable; 1 GB works for small lists'],
            ['Disk', '5 GB, plus room for HTML bundles (kept 7 days)'],
            ['Network', 'Outbound HTTPS to *.wikipedia.org, wikidata.org, wikimedia.org'],
            ['Ports', '8080 for the site; put TLS in front (Caddy, nginx, a load balancer)'],
          ]}
        />
      </Section>

      <Section index="02" title="Install">
        <Code label="Five commands">{`git clone ${SITE.repo}.git
cd offlineshelf
cp .env.example .env
# set OFFLINESHELF_SECRET_KEY and the two MariaDB passwords in .env:
python -c "import secrets; print(secrets.token_urlsafe(48))"
docker compose up -d --build`}</Code>
        <div className="prose-shelf">
          <p>
            Open <code>http://localhost:8080</code>. Database migrations run when the API starts.
          </p>
        </div>
      </Section>

      <Section index="03" title="Configuration">
        <div className="prose-shelf">
          <p>
            Settings come from environment variables with the <code>OFFLINESHELF_</code> prefix. The
            ones you are most likely to change:
          </p>
        </div>
        <Facts
          items={[
            ['OFFLINESHELF_SECRET_KEY', 'Signs session cookies. 32+ random characters. Required.'],
            ['OFFLINESHELF_SITE_URL', 'Public URL, used for CSRF origin checks'],
            [
              'OFFLINESHELF_TRUSTED_PROXIES',
              'Reverse proxies in front of the API (default 1 in Compose)',
            ],
            ['OFFLINESHELF_MAX_CATEGORY_DEPTH', 'Default 5'],
            ['OFFLINESHELF_MAX_PASTED_TITLES', 'Default 20000'],
            ['OFFLINESHELF_MAX_ARTICLES_PER_LIST', 'Default 100000'],
            ['OFFLINESHELF_RATE_LIMIT_BUILD', 'Default "20 per hour"'],
            ['OFFLINESHELF_MAX_BUNDLE_ARTICLES', 'Default 1000'],
            ['OFFLINESHELF_EXPORT_DAYS', 'Days a bundle is kept. Default 7'],
          ]}
        />
        <div className="prose-shelf">
          <h3>Failure emails</h3>
          <p>
            When a build fails, the list owner gets one email a day at most. Email is off until you
            set an SMTP host; any provider works (Resend, Postmark, Amazon SES, your own server).
            Send-only credentials are enough.
          </p>
        </div>
        <Facts
          items={[
            ['OFFLINESHELF_SMTP_HOST', 'For example smtp.resend.com. Empty turns email off'],
            [
              'OFFLINESHELF_SMTP_PORT',
              '587 (STARTTLS, default), 465 or 2465 (TLS); always encrypted',
            ],
            ['OFFLINESHELF_SMTP_USERNAME', 'For Resend: resend'],
            ['OFFLINESHELF_SMTP_PASSWORD', 'An API key or password; keep it in .env only'],
            ['OFFLINESHELF_MAIL_FROM', 'A sender on a domain verified with your provider'],
          ]}
        />
        <Callout title="Behind a TLS proxy">
          Set <code>OFFLINESHELF_ENV=prod</code> once the site is served over HTTPS: session cookies
          become Secure with the <code>__Host-</code> prefix and HSTS is sent. Count your proxies
          correctly in <code>OFFLINESHELF_TRUSTED_PROXIES</code>; trusting more hops than exist lets
          clients choose the IP the rate limiter sees.
        </Callout>
      </Section>

      <Section index="04" title="Backups and updates">
        <Code label="Back up the database">{`docker compose exec mariadb sh -c \\
  'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" offlineshelf' > offlineshelf.sql`}</Code>
        <Code label="Update">{`git pull
docker compose up -d --build   # migrations run on start`}</Code>
        <div className="prose-shelf">
          <p>
            Only list settings, versions and titles live in the database, so backups stay small. The{' '}
            <code>exports-data</code> volume does not need a backup: bundles expire after a week and
            can be made again from any version.
          </p>
        </div>
      </Section>

      <Section index="05" title="Troubleshooting">
        <div className="prose-shelf">
          <ul>
            <li>
              <strong>Builds stay queued.</strong> The worker is not running or cannot reach Redis:{' '}
              <code>docker compose logs worker</code>.
            </li>
            <li>
              <strong>Monthly lists never rebuild.</strong> Check the scheduler:{' '}
              <code>docker compose logs scheduler</code> should show the hourly check.
            </li>
            <li>
              <strong>No failure emails.</strong> <code>OFFLINESHELF_SMTP_HOST</code> is empty, or
              the provider rejected the sender; the worker log says which.
            </li>
            <li>
              <strong>Sign-in fails with a CSRF error behind a proxy.</strong>{' '}
              <code>OFFLINESHELF_SITE_URL</code> must match the public address exactly, scheme
              included.
            </li>
            <li>
              <strong>Everyone shares one rate limit.</strong> The proxy count is wrong; set{' '}
              <code>OFFLINESHELF_TRUSTED_PROXIES</code> to the number of proxies in front of the
              API.
            </li>
          </ul>
        </div>
        <Code label="Health check">{`curl -s http://localhost:8080/api/v1/health
# {"status": "ok", "checks": {"database": "ok", "redis": "ok"}}`}</Code>
      </Section>

      <Section index="06" title="Being a good Wikimedia neighbour">
        <div className="prose-shelf">
          <p>
            Your install talks to Wikimedia's public APIs. The client already follows the{' '}
            <ExternalLink href="https://meta.wikimedia.org/wiki/User-Agent_policy">
              User-Agent policy
            </ExternalLink>{' '}
            and the{' '}
            <ExternalLink href="https://www.mediawiki.org/wiki/Manual:Maxlag_parameter">
              maxlag convention
            </ExternalLink>
            , backs off when servers are busy, and builds one list at a time per worker. If you run
            a large public instance, change the contact address in the User-Agent to your own.
          </p>
        </div>
      </Section>

      <NextPage
        to="/security"
        title="Security"
        text="How OfflineShelf protects accounts and data."
      />
    </article>
  )
}
