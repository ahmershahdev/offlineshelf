import { Outlet, Route, Routes } from 'react-router'

import { Cursor } from './components/Cursor'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { SmoothScroll } from './components/SmoothScroll'
import { AppPage } from './pages/AppPage'
import { Home } from './pages/Home'
import { HowItWorks } from './pages/HowItWorks'
import { NotFound } from './pages/NotFound'
import { Privacy } from './pages/Privacy'
import { useHead } from './seo/useHead'

function Layout() {
  useHead()
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[80] focus:rounded-full focus:bg-paper focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <SmoothScroll />
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
      <Cursor />
      <div className="grain" aria-hidden="true" />
    </>
  )
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="app" element={<AppPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
