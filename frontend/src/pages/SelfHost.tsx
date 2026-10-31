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

export function SelfHost() {
  return (
    <article>
      <PageHeader
        eyebrow="Self-hosting"
        title="Your own shelf, on your own server."
        intro={
          <>
            OfflineShelf is MIT licensed and ships as one Docker Compose file: the web server, the
            API, a build worker, MariaDB and Redis. A small virtual server or a spare machine in a
            library is enough.
          </>
        }
      />

      <Section index="01" title="Requirements">
        <Facts
          items={[
            ['Docker', 'Docker Engine 24+ with Compose v2'],
            ['Memory', '2 GB is comfortable; 1 GB works for small lists'],
            ['Disk', '5 GB plus room for exports'],
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
            Only list settings, versions and titles live in the database, so backups stay small.
            Exports can always be rebuilt.
          </p>
        </div>
      </Section>

      <Section index="05" title="Being a good Wikimedia neighbour">
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
