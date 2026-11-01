import { Split } from '../components/Reveal'

const SECTIONS = [
  {
    h: 'What is stored',
    p: [
      'Your email address, a hash of your password (Argon2id; the password itself is never stored), and the settings of the lists you create: their names, wikis, builder parameters and schedules.',
      'For each build: the titles, page IDs and revision IDs of the articles in the list. No article text.',
    ],
  },
  {
    h: 'Cookies',
    p: [
      'One cookie, set when you sign in, that keeps you signed in. It is HttpOnly (scripts cannot read it), sent only to this site, and expires after 14 days. There are no analytics, advertising or third-party cookies.',
    ],
  },
  {
    h: 'What is never collected',
    p: [
      'No tracking scripts, no fingerprinting, no third-party fonts or CDNs. Fonts and code are served from this domain.',
      'Server logs keep the request path, status and a request ID for debugging, and are rotated.',
    ],
  },
  {
    h: 'Wikimedia',
    p: [
      'Builds and exports call Wikimedia APIs from the server, not from your browser. Wikimedia sees the OfflineShelf server, not you.',
    ],
  },
  {
    h: 'Deleting your data',
    p: [
      'Deleting a list removes it and all its versions. To delete your account, email support@ahmershah.dev from the address you signed up with.',
    ],
  },
]

export function Privacy() {
  return (
    <article className="gutter pt-40 pb-32">
      <header className="mb-20 grid grid-cols-1 gap-8 md:grid-cols-12">
        <p className="label md:col-span-3">Privacy</p>
        <div className="md:col-span-9">
          <Split as="h1" text="Small on purpose." className="text-headline font-serif" />
          <p className="mt-6 text-dim">Last updated 31 October 2026</p>
        </div>
      </header>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        <div className="md:col-span-7 md:col-start-4">
          {SECTIONS.map((s) => (
            <section key={s.h} className="border-t hairline py-10">
              <h2 className="mb-4 font-serif text-3xl">{s.h}</h2>
              {s.p.map((para) => (
                <p key={para} className="mb-4 max-w-2xl text-lg text-paper/75">
                  {para}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </article>
  )
}
