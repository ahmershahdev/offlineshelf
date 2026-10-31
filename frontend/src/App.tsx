import { Outlet, Route, Routes } from 'react-router'

import { Cursor } from './components/Cursor'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { SmoothScroll } from './components/SmoothScroll'
import { About } from './pages/About'
import { AppPage } from './pages/AppPage'
import { Builders } from './pages/Builders'
import { Contact } from './pages/Contact'
import { Developers } from './pages/Developers'
import { Exports } from './pages/Exports'
import { Faq } from './pages/Faq'
import { Home } from './pages/Home'
import { HowItWorks } from './pages/HowItWorks'
import { NotFound } from './pages/NotFound'
import { Privacy } from './pages/Privacy'
import { Roadmap } from './pages/Roadmap'
import { Security } from './pages/Security'
import { SelfHost } from './pages/SelfHost'
import { Terms } from './pages/Terms'
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
        <Route path="builders" element={<Builders />} />
        <Route path="exports" element={<Exports />} />
        <Route path="developers" element={<Developers />} />
        <Route path="self-host" element={<SelfHost />} />
        <Route path="roadmap" element={<Roadmap />} />
        <Route path="faq" element={<Faq />} />
        <Route path="about" element={<About />} />
        <Route path="security" element={<Security />} />
        <Route path="contact" element={<Contact />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="app" element={<AppPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
