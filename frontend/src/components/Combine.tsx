import { useState } from 'react'

const OPS = {
  union: { label: 'Union', symbol: '∪', text: 'Every article in either list.' },
  intersection: { label: 'Intersection', symbol: '∩', text: 'Only articles in both lists.' },
  difference: {
    label: 'Difference',
    symbol: '∖',
    text: 'Articles in the first list but not the second.',
  },
} as const

type Op = keyof typeof OPS

export function Combine() {
  const [op, setOp] = useState<Op>('difference')

  return (
    <div className="grid items-center gap-12 md:grid-cols-12">
      <div className="md:col-span-5">
        <div role="radiogroup" aria-label="Set operation" className="mb-10 flex flex-wrap gap-2">
          {(Object.keys(OPS) as Op[]).map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={op === key}
              onClick={() => {
                setOp(key)
              }}
              className={`rounded-full px-4 py-2 text-sm transition-colors duration-500 ${
                op === key ? 'bg-paper text-ink' : 'text-paper/70 ring-1 ring-line hover:text-paper'
              }`}
            >
              {OPS[key].label}
            </button>
          ))}
        </div>
        <p className="font-serif text-5xl leading-none md:text-6xl" aria-live="polite">
          Physics <span className="text-signal">{OPS[op].symbol}</span> Biographies
        </p>
        <p className="mt-5 max-w-sm text-paper/70">
          {OPS[op].text} Up to ten lists, any mix, and the result rebuilds when a source list
          changes.
        </p>
      </div>

      <div className="md:col-span-6 md:col-start-7">
        <svg
          viewBox="0 0 400 260"
          className="w-full"
          role="img"
          aria-label={`Venn diagram: ${OPS[op].label}`}
        >
          <defs>
            <clipPath id="clip-a">
              <circle cx="160" cy="130" r="100" />
            </clipPath>
            <mask id="not-b">
              <rect width="400" height="260" fill="white" />
              <circle cx="240" cy="130" r="100" fill="black" />
            </mask>
          </defs>
          <g className="transition-opacity duration-700" opacity={op === 'union' ? 1 : 0}>
            <circle cx="160" cy="130" r="100" fill="#ff5a1f" />
            <circle cx="240" cy="130" r="100" fill="#ff5a1f" />
          </g>
          <g className="transition-opacity duration-700" opacity={op === 'intersection' ? 1 : 0}>
            <circle cx="240" cy="130" r="100" fill="#ff5a1f" clipPath="url(#clip-a)" />
          </g>
          <g className="transition-opacity duration-700" opacity={op === 'difference' ? 1 : 0}>
            <circle cx="160" cy="130" r="100" fill="#ff5a1f" mask="url(#not-b)" />
          </g>
          <circle cx="160" cy="130" r="100" fill="none" stroke="#ece6da" strokeOpacity="0.5" />
          <circle cx="240" cy="130" r="100" fill="none" stroke="#ece6da" strokeOpacity="0.5" />
          <text
            x="95"
            y="135"
            fill="#ece6da"
            fontFamily="JetBrains Mono Variable, monospace"
            fontSize="11"
          >
            A
          </text>
          <text
            x="300"
            y="135"
            fill="#ece6da"
            fontFamily="JetBrains Mono Variable, monospace"
            fontSize="11"
          >
            B
          </text>
        </svg>
      </div>
    </div>
  )
}
