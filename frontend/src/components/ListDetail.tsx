import { useEffect, useRef, useState } from 'react'

import { api, type Article, type ListVersion, type ShelfList } from '../api/client'
import { POLL_MS, articleUrl, isActive, reportLines } from '../lib/shelf'

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
      <ol className="max-h-96 overflow-y-auto font-mono text-sm" aria-label="Articles">
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
          <button type="button" className="label link-draw" disabled={busy} onClick={more}>
            {busy ? 'Loading' : 'Show more'}
          </button>
        ) : null}
      </p>
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
            </tr>
          ))}
        </tbody>
      </table>

      {shown ? (
        <div>
          <p className="label mb-3">Articles from {when(shown.finished_at)}</p>
          {reportLines(shown.report).length ? (
            <ul className="mb-4 text-xs text-dim">
              {reportLines(shown.report).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          <Articles key={shown.id} list={list} version={shown} />
        </div>
      ) : null}
    </div>
  )
}
