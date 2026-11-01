import { useEffect, useState } from 'react'

import { ApiError, api, type Export, type ListVersion, type ShelfList } from '../api/client'
import { POLL_MS, formatBytes } from '../lib/shelf'

function day(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : ''
}

export function BundleExport({ list, version }: { list: ShelfList; version: ListVersion }) {
  const [latest, setLatest] = useState<Export | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const active = latest?.status === 'queued' || latest?.status === 'building'

  useEffect(() => {
    let live = true
    function load(): void {
      api
        .exports(list.id, version.id)
        .then((page) => {
          if (live) setLatest(page.items[0] ?? null)
        })
        .catch(() => {
          if (live) setLatest((prev) => prev ?? null)
        })
    }
    load()
    const timer = active ? setInterval(load, POLL_MS) : undefined
    return () => {
      live = false
      clearInterval(timer)
    }
  }, [list.id, version.id, active])

  function start(): void {
    setBusy(true)
    setError(null)
    api
      .createExport(list.id, version.id)
      .then(setLatest)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'The bundle could not be started.')
      })
      .finally(() => {
        setBusy(false)
      })
  }

  if (latest === undefined) return null

  const expired = latest?.expires_at ? new Date(latest.expires_at) < new Date() : false

  return (
    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 text-xs text-dim">
      {latest?.status === 'ready' && !expired ? (
        <>
          <a
            href={`/api/v1/lists/${list.id}/exports/${latest.id}/download`}
            download
            className="label link-draw hover:text-paper"
          >
            Download HTML bundle
          </a>
          <span>
            {formatBytes(latest.size_bytes ?? 0)}, available until {day(latest.expires_at)}
            {latest.missing?.length ? `, ${latest.missing.length} pages no longer exist` : ''}
          </span>
        </>
      ) : active ? (
        <span aria-live="polite">
          Making HTML bundle: {latest.progress.toLocaleString()} of {latest.total.toLocaleString()}{' '}
          articles
        </span>
      ) : (
        <>
          <button
            type="button"
            className="label link-draw hover:text-paper"
            disabled={busy}
            onClick={start}
          >
            {busy ? 'Starting' : 'Make HTML bundle'}
          </button>
          {latest?.status === 'failed' ? (
            <span className="text-signal">The last bundle failed: {latest.error}</span>
          ) : null}
        </>
      )}
      {error ? (
        <span role="alert" className="text-signal">
          {error}
        </span>
      ) : null}
    </div>
  )
}
