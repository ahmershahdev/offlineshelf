import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'

import { App } from './App'
import { renderHead } from './seo/head'
import { NOT_FOUND, ROUTES, routeFor, type RouteMeta } from './seo/routes'

export { NOT_FOUND, ROUTES }
export type { RouteMeta }

export function render(url: string): { html: string; head: string } {
  const html = renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
  )
  return { html, head: renderHead(routeFor(url)) }
}
