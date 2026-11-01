import { PageHeader, Section } from '../components/Page'
import { SITE } from '../seo/site'

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'The service',
    body: [
      'OfflineShelf helps you build lists of Wikipedia articles and export them. It is provided free of charge, as is, without warranty of any kind, and may change or pause while it is being developed.',
    ],
  },
  {
    title: 'Your account',
    body: [
      'Keep your password to yourself; you are responsible for what is done with your account. One person per account. You can ask for your account and lists to be deleted at any time.',
    ],
  },
  {
    title: 'Fair use',
    body: [
      'Builds call Wikimedia APIs on your behalf. Do not use OfflineShelf to overload Wikimedia or this service, to get around rate limits, or to access anything you are not allowed to.',
      'Accounts that abuse the service may be suspended.',
    ],
  },
  {
    title: 'Content and licences',
    body: [
      'Wikipedia content in exports belongs to its authors and is licensed under CC BY-SA 4.0. When you share an export, keep the attribution page and licence that come with it.',
      'Your list settings are yours. The OfflineShelf code is licensed under MIT.',
    ],
  },
  {
    title: 'Exports and emails',
    body: [
      'Download links for HTML bundles work for 7 days, then the file is deleted; you can make a new one from the same version. Bundles hold up to 1,000 articles.',
      'If a build of your list fails, you may get an email about it, at most once per list per day. These are service notices, not marketing.',
    ],
  },
  {
    title: 'Liability',
    body: [
      'To the extent the law allows, OfflineShelf and its maintainer are not liable for losses arising from using the service, including inaccurate or incomplete article content, which comes from Wikipedia.',
    ],
  },
  {
    title: 'Changes',
    body: [
      'These terms may change as the service grows. Material changes are announced on this page with a new date. Questions: write to the address below.',
    ],
  },
]

export function Terms() {
  return (
    <article>
      <PageHeader
        eyebrow="Terms"
        title="Plain terms for a free tool."
        intro={<>Last updated 1 November 2026. Short, because the service is small and free.</>}
      />
      {SECTIONS.map((s, i) => (
        <Section key={s.title} index={String(i + 1).padStart(2, '0')} title={s.title}>
          <div className="prose-shelf">
            {s.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {i === SECTIONS.length - 1 ? (
              <p>
                <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
              </p>
            ) : null}
          </div>
        </Section>
      ))}
    </article>
  )
}
