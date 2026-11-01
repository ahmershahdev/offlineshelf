import { useEffect, useRef, useState } from 'react'

import { api, type Article, type ListVersion, type ShelfList } from '../api/client'
import { POLL_MS, articleUrl, isActive, reportLines } from '../lib/shelf'
import { BundleExport } from './BundleExport'

type Status = ListVersion['status']

function when(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function Articles({ list, version }: { list: ShelfList; version: ListVersion }) {
  const [items, setItems] = useState<Article[]>([])
  const [cursor, setCursor] = useState<number | null>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    api
      .articles(list.id, version.id)
      .then((page) => {
        if (!live) return
        setItems(page.items)
        setCursor(page.next_cursor)
      })
      .catch(() => {
        if (live) setError(true)
      })
    return () => {
      live = false
    }
  }, [list.id, version.id])

  function more(): void {
    if (cursor === null) return
    setBusy(true)
    api
      .articles(list.id, version.id, cursor)
      .then((page) => {
        setItems((prev) => [...prev, ...page.items])
        setCursor(page.next_cursor)
      })
      .catch(() => {
        setError(true)
      })
      .finally(() => {
        setBusy(false)
      })
  }

  if (error) return <p className="text-sm text-signal">The articles could not be loaded.</p>
  if (version.article_count === 0) return <p className="text-sm text-dim">No articles.</p>

  return (
    <div>
      <ol
        className="max-h-96 overflow-y-auto font-mono text-sm"
        aria-label="Articles"
        tabIndex={0} // NOSONAR: a scrolling region needs focus so keyboard users can scroll it
      >
        {items.map((a) => (
          <li key={a.page_id} className="border-b hairline py-1.5">
            <a
              href={articleUrl(list.wiki, a.title)}
              target="_blank"
              rel="noopener noreferrer"
              className="link-draw hover:text-paper"
            >
              {a.title}
            </a>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex items-center gap-5 text-xs text-dim">
        Showing {items.length.toLocaleString()} of {version.article_count.toLocaleString()}
        {cursor !== null ? (
          <button type="button" className="label link-draw py-2" disabled={busy} onClick={more}>
            {busy ? 'Loading' : 'Show more'}
          </button>
        ) : null}
      </p>
    </div>
  )
}

type ChangeKind = 'added' | 'removed'

function Changes({ list, version }: { list: ShelfList; version: ListVersion }) {
  const [kind, setKind] = useState<ChangeKind | null>(null)
  const [items, setItems] = useState<Article[]>([])
  const [cursor, setCursor] = useState<number | null>(null)
  const [error, setError] = useState(false)
  const counts: Record<ChangeKind, number> = {
    added: version.added_count ?? 0,
    removed: version.removed_count ?? 0,
  }

  function load(next: ChangeKind, from?: number): void {
    setError(false)
    api
      .changes(list.id, version.id, next, from)
      .then((page) => {
        setItems((prev) => (from === undefined ? page.items : [...prev, ...page.items]))
        setCursor(page.next_cursor)
      })
      .catch(() => {
        setError(true)
      })
  }

  return (
    <div className="mb-6">
      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-1"
        role="group"
        aria-label="Changes"
      >
        <span className="label">Since the previous version</span>
        {(['added', 'removed'] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            disabled={counts[k] === 0}
            className={`label link-draw py-2 disabled:opacity-40 ${kind === k ? 'text-paper' : 'hover:text-paper'}`}
            onClick={() => {
              if (kind === k) {
                setKind(null)
                return
              }
              setKind(k)
              setItems([])
              load(k)
            }}
          >
            {k} {counts[k].toLocaleString()}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-signal">The changes could not be loaded.</p> : null}
      {kind && !error ? (
        <ul
          className="mt-2 max-h-60 overflow-y-auto font-mono text-sm"
          aria-label={`Articles ${kind}`}
          tabIndex={0} // NOSONAR: a scrolling region needs focus so keyboard users can scroll it
        >
          {items.map((a) => (
            <li key={a.page_id} className="border-b hairline py-1.5">
              <span className={kind === 'added' ? 'text-signal' : 'text-dim'} aria-hidden="true">
                {kind === 'added' ? '+ ' : '- '}
              </span>
              <a
                href={articleUrl(list.wiki, a.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="link-draw hover:text-paper"
              >
                {a.title}
              </a>
            </li>
          ))}
          {cursor !== null ? (
            <li>
              <button
                type="button"
                className="label link-draw py-2"
                onClick={() => {
                  load(kind, cursor)
                }}
              >
                Show more
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}

export function ListDetail({
  list,
  onStatus,
}: {
  list: ShelfList
  onStatus: (status: Status | null) => void
}) {
  const [versions, setVersions] = useState<ListVersion[] | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [error, setError] = useState(false)
  const notify = useRef(onStatus)
  useEffect(() => {
    notify.current = onStatus
  })

  useEffect(() => {
    let live = true
    let timer: ReturnType<typeof setTimeout> | undefined

    function load(): void {
      api
        .versions(list.id)
        .then((page) => {
          if (!live) return
          setVersions(page.items)
          setError(false)
          const latest = page.items[0]?.status ?? null
          notify.current(latest)
          if (isActive(latest)) timer = setTimeout(load, POLL_MS)
        })
        .catch(() => {
          if (live) setError(true)
        })
    }

    load()
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [list.id, list.latest_status])

  if (error) return <p className="text-sm text-signal">The build history could not be loaded.</p>
  if (versions === null) return <p className="label">Loading</p>
  if (versions.length === 0) return <p className="text-sm text-dim">Not built yet.</p>

  const shown =
    versions.find((v) => v.id === selected) ?? versions.find((v) => v.status === 'ready') ?? null

  return (
    <div className="grid gap-8">
      <table className="w-full text-left text-sm">
        <caption className="label mb-3 text-left">Builds</caption>
        <thead className="text-xs text-dim">
          <tr>
            <th scope="col" className="py-1 font-normal">
              Status
            </th>
            <th scope="col" className="py-1 font-normal">
              Finished
            </th>
            <th scope="col" className="py-1 text-right font-normal">
              Articles
            </th>
            <th scope="col" className="hidden py-1 text-right font-normal sm:table-cell">
              Changes
            </th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr key={v.id} className="border-t hairline align-top">
              <td className="py-2">
                {v.status === 'ready' ? (
                  <button
                    type="button"
                    className={`link-draw ${shown?.id === v.id ? 'text-paper' : 'text-dim'}`}
                    aria-pressed={shown?.id === v.id}
                    onClick={() => {
                      setSelected(v.id)
                    }}
                  >
                    ready
                  </button>
                ) : (
                  <span className={v.status === 'failed' ? 'text-signal' : 'text-ember'}>
                    {v.status}
                  </span>
                )}
                {v.error ? <p className="mt-1 text-xs text-dim">{v.error}</p> : null}
              </td>
              <td className="py-2 text-dim">{when(v.finished_at)}</td>
              <td className="py-2 text-right font-mono">
                {v.status === 'ready' ? v.article_count.toLocaleString() : ''}
              </td>
              <td className="hidden py-2 text-right font-mono text-xs text-dim sm:table-cell">
                {v.added_count !== null && v.removed_count !== null ? (
                  <span
                    aria-label={`${v.added_count.toLocaleString()} added, ${v.removed_count.toLocaleString()} removed`}
                  >
                    +{v.added_count.toLocaleString()} / -{v.removed_count.toLocaleString()}
                  </span>
                ) : v.status === 'ready' ? (
                  'first'
                ) : (
                  ''
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {shown ? (
        <div>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-4">
            <p className="label">Articles from {when(shown.finished_at)}</p>
            <a
              href={`/api/v1/lists/${list.id}/versions/${shown.id}/export.tsv`}
              download
              className="label link-draw py-2 hover:text-paper"
            >
              Download TSV
            </a>
          </div>
          {reportLines(shown.report).length ? (
            <ul className="mb-4 text-xs text-dim">
              {reportLines(shown.report).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          <div className="mb-4 space-y-1">
            <BundleExport key={shown.id} list={list} version={shown} />
            <BundleExport key={`zim-${shown.id}`} list={list} version={shown} format="zim" />
          </div>
          {shown.previous_version_id !== null ? (
            <Changes key={`changes-${shown.id}`} list={list} version={shown} />
          ) : null}
          <Articles key={shown.id} list={list} version={shown} />
        </div>
      ) : null}
    </div>
  )
}
