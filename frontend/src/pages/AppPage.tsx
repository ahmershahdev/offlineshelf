import { useEffect, useState, type SyntheticEvent } from 'react'

import { ApiError, api, type ListCreate, type ShelfList, type User } from '../api/client'

type Kind = ListCreate['params']['kind']

const KIND_LABEL: Record<Kind, string> = {
  category: 'Category',
  wikidata: 'Wikidata query',
  pasted: 'Pasted titles',
  pageviews: 'Top by pageviews',
}

function field(form: FormData, name: string): string {
  const value = form.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function errorText(err: unknown): string {
  if (err instanceof ApiError) return err.status === 422 ? err.fieldMessage : err.message
  return 'Something went wrong. Try again.'
}

function AuthForm({ onUser }: { onUser: (u: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: SyntheticEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const email = field(form, 'email')
    const password = field(form, 'password')
    setBusy(true)
    setError(null)
    try {
      const res =
        mode === 'login' ? await api.login(email, password) : await api.register(email, password)
      onUser(res.user)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div role="tablist" aria-label="Account" className="mb-12 flex gap-6">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m)
              setError(null)
            }}
            className={`font-serif text-4xl transition-colors ${mode === m ? 'text-paper' : 'text-faint hover:text-dim'}`}
          >
            {m === 'login' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-6" noValidate={false}>
        <label className="block">
          <span className="label">Email</span>
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            className="field"
          />
        </label>
        <label className="block">
          <span className="label">
            Password {mode === 'register' ? '(12 characters or more)' : ''}
          </span>
          <input
            name="password"
            type="password"
            required
            minLength={12}
            maxLength={256}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="field"
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-signal">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="btn btn-solid mt-4 w-fit disabled:opacity-50"
        >
          {busy ? 'One moment' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </div>
  )
}

function paramsFrom(kind: Kind, form: FormData): ListCreate['params'] {
  const s = (k: string): string => field(form, k)
  switch (kind) {
    case 'category':
      return { kind, category: s('category'), depth: Number(s('depth') || 0) }
    case 'wikidata':
      return { kind, sparql: s('sparql') }
    case 'pasted':
      return {
        kind,
        titles: s('titles')
          .split('\n')
          .map((t) => t.trim())
          .filter(Boolean),
      }
    case 'pageviews':
      return { kind, year: Number(s('year')), month: Number(s('month')), limit: Number(s('limit')) }
  }
}

function NewList({ onCreated }: { onCreated: (l: ShelfList) => void }) {
  const [kind, setKind] = useState<Kind>('category')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: SyntheticEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    const el = e.currentTarget
    const form = new FormData(el)
    setBusy(true)
    setError(null)
    try {
      const created = await api.createList({
        name: field(form, 'name'),
        wiki: field(form, 'wiki'),
        params: paramsFrom(kind, form),
        schedule: form.get('monthly') ? 'monthly' : 'none',
      })
      el.reset()
      onCreated(created)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="grid gap-6 border-t hairline pt-8 md:grid-cols-2"
    >
      <label className="block">
        <span className="label">Name</span>
        <input
          name="name"
          required
          maxLength={120}
          placeholder="Physics minus Biographies"
          className="field"
        />
      </label>
      <label className="block">
        <span className="label">Wiki</span>
        <input
          name="wiki"
          required
          maxLength={64}
          defaultValue="en.wikipedia.org"
          className="field"
        />
      </label>
      <label className="block md:col-span-2">
        <span className="label">Builder</span>
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as Kind)
          }}
          className="field bg-ink"
        >
          {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </label>

      {kind === 'category' ? (
        <>
          <label className="block">
            <span className="label">Category</span>
            <input
              name="category"
              required
              maxLength={255}
              placeholder="Vaccines"
              className="field"
            />
          </label>
          <label className="block">
            <span className="label">Depth (0 to 5)</span>
            <input name="depth" type="number" min={0} max={5} defaultValue={0} className="field" />
          </label>
        </>
      ) : null}
      {kind === 'wikidata' ? (
        <label className="block md:col-span-2">
          <span className="label">SPARQL</span>
          <textarea
            name="sparql"
            required
            maxLength={10000}
            rows={5}
            className="field font-mono text-sm"
          />
        </label>
      ) : null}
      {kind === 'pasted' ? (
        <label className="block md:col-span-2">
          <span className="label">Titles, one per line</span>
          <textarea name="titles" required rows={6} className="field font-mono text-sm" />
        </label>
      ) : null}
      {kind === 'pageviews' ? (
        <div className="grid grid-cols-3 gap-6 md:col-span-2">
          <label className="block">
            <span className="label">Year</span>
            <input
              name="year"
              type="number"
              min={2016}
              required
              defaultValue={2026}
              className="field"
            />
          </label>
          <label className="block">
            <span className="label">Month</span>
            <input
              name="month"
              type="number"
              min={1}
              max={12}
              required
              defaultValue={9}
              className="field"
            />
          </label>
          <label className="block">
            <span className="label">Top</span>
            <input
              name="limit"
              type="number"
              min={1}
              max={1000}
              required
              defaultValue={1000}
              className="field"
            />
          </label>
        </div>
      ) : null}

      <label className="flex items-center gap-3 md:col-span-2">
        <input name="monthly" type="checkbox" className="size-4 accent-[var(--color-signal)]" />
        <span className="text-sm text-paper/80">Rebuild every month</span>
      </label>
      {error ? (
        <p role="alert" className="text-sm text-signal md:col-span-2">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="btn btn-solid w-fit disabled:opacity-50">
        {busy ? 'Saving' : 'Save list'}
      </button>
    </form>
  )
}

export function AppPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [lists, setLists] = useState<ShelfList[]>([])

  useEffect(() => {
    api
      .me()
      .then((r) => {
        setUser(r.user)
      })
      .catch(() => {
        setUser(null)
      })
  }, [])

  useEffect(() => {
    if (!user) return
    let live = true
    api
      .lists()
      .then((page) => {
        if (live) setLists(page.items)
      })
      .catch(() => {
        if (live) setLists([])
      })
    return () => {
      live = false
    }
  }, [user])

  if (user === undefined) {
    return (
      <section className="gutter min-h-[100svh] pt-40" aria-busy="true">
        <p className="label">Loading your shelf</p>
      </section>
    )
  }

  if (user === null) {
    return (
      <section className="gutter flex min-h-[100svh] items-center pt-32 pb-24">
        <AuthForm onUser={setUser} />
      </section>
    )
  }

  return (
    <section className="gutter min-h-[100svh] pt-36 pb-32">
      <header className="mb-16 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="label mb-4">{user.email}</p>
          <h1 className="text-headline font-serif">Your shelf</h1>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            void api.logout().then(() => {
              setUser(null)
              setLists([])
            })
          }}
        >
          Sign out
        </button>
      </header>

      <div className="grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="label mb-4">
            {lists.length} {lists.length === 1 ? 'list' : 'lists'}
          </p>
          {lists.length === 0 ? (
            <p className="border-t hairline pt-8 text-paper/60">
              No lists yet. Make the first one.
            </p>
          ) : (
            <ul className="border-t hairline">
              {lists.map((l) => (
                <li
                  key={l.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-4 border-b hairline py-5"
                >
                  <div>
                    <p className="text-lg">{l.name}</p>
                    <p className="font-mono text-xs text-dim">
                      {l.wiki} / {KIND_LABEL[l.builder]} / {l.latest_status ?? 'not built yet'}
                      {l.schedule === 'monthly' ? ' / monthly' : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="label link-draw hover:text-signal"
                    aria-label={`Delete ${l.name}`}
                    onClick={() => {
                      void api.deleteList(l.id).then(() => {
                        setLists((prev) => prev.filter((x) => x.id !== l.id))
                      })
                    }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="lg:col-span-5">
          <p className="label mb-4">New list</p>
          <NewList
            onCreated={(l) => {
              setLists((prev) => [l, ...prev])
            }}
          />
          <p className="mt-8 text-sm text-dim">
            Builds start once the builders land (milestone M2). Saved lists keep their settings.
          </p>
        </div>
      </div>
    </section>
  )
}
