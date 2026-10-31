import { NextPage, PageHeader } from '../components/Page'
import { Reveal } from '../components/Reveal'
import { FAQ_ALL, type Faq as FaqItem } from '../seo/faq'

const TOPICS: FaqItem['topic'][] = ['Basics', 'Lists', 'Exports', 'Project']

export function Faq() {
  return (
    <article>
      <PageHeader
        eyebrow="Questions"
        title="Everything people ask, answered."
        intro={
          <>
            Short answers first. If yours is not here, write to us; the good questions end up on
            this page.
          </>
        }
      />
      {TOPICS.map((topic, i) => (
        <section
          key={topic}
          className="gutter border-t hairline py-20 md:py-24"
          aria-labelledby={`faq-${topic}`}
        >
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-3">
              <span className="mb-4 block font-mono text-xs text-signal">0{i + 1}</span>
              <h2 id={`faq-${topic}`} className="text-title font-serif md:sticky md:top-28">
                {topic}
              </h2>
            </div>
            <Reveal className="md:col-span-8 md:col-start-5">
              {FAQ_ALL.filter((f) => f.topic === topic).map((f) => (
                <details key={f.q} className="group border-b hairline py-6 first:border-t">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-xl leading-snug md:text-2xl [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span
                      aria-hidden="true"
                      className="mt-1 text-signal transition-transform duration-500 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-4 max-w-2xl text-lg text-paper/70">{f.a}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>
      ))}
      <NextPage to="/contact" title="Still curious?" text="Write to us. A real person answers." />
    </article>
  )
}
