import './styles/index.css'

import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import { App } from './App'
import { prefersReducedMotion } from './lib/motion'

if (!prefersReducedMotion()) document.documentElement.dataset.motion = 'on'

const root = document.getElementById('root')
if (!root) throw new Error('#root missing from index.html')

const tree = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)

// Prerendered pages hydrate; the dev server serves an empty #root and renders from scratch.
if (root.firstElementChild) hydrateRoot(root, tree)
else createRoot(root).render(tree)
