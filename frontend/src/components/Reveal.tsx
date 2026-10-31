import type { ElementType, ReactNode } from 'react'

import { useReveal } from '../lib/motion'

type RevealProps = {
  as?: ElementType
  className?: string
  children: ReactNode
}

export function Reveal({ as: Tag = 'div', className, children }: RevealProps) {
  const ref = useReveal<HTMLElement>()
  return (
    <Tag ref={ref} data-reveal="" className={className}>
      {children}
    </Tag>
  )
}

type SplitProps = {
  as?: ElementType
  text: string
  id?: string
  className?: string
}

/** Headline whose words rise into place when scrolled into view. */
export function Split({ as: Tag = 'h2', text, id, className }: SplitProps) {
  const ref = useReveal<HTMLElement>(0.35)
  const words = text.split(' ')
  return (
    <Tag ref={ref} id={id} className={`split ${className ?? ''}`} aria-label={text}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} aria-hidden="true">
          <span>{word}</span>
          {i < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </Tag>
  )
}
