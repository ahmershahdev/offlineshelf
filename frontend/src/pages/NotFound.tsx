import { Link } from 'react-router'

export function NotFound() {
  return (
    <section className="gutter flex min-h-[100svh] flex-col justify-end pt-40 pb-24">
      <p className="label mb-6">404</p>
      <h1 className="text-display mb-12 font-serif">
        Not on <em className="text-signal">this</em> shelf.
      </h1>
      <div className="flex flex-wrap gap-3">
        <Link to="/" className="btn btn-solid">
          Back to the start
        </Link>
        <Link to="/how-it-works" className="btn btn-ghost">
          How it works
        </Link>
      </div>
    </section>
  )
}
