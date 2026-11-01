import { useEffect, useState } from 'react'

import { ApiError, api, type Export, type ListVersion, type ShelfList } from '../api/client'
import { POLL_MS, formatBytes } from '../lib/shelf'

function day(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : ''
}

const LABEL = { html: 'HTML bundle', zim: 'ZIM file for Kiwix' } as const

export function BundleExport({
  list,
  version,
  format = 'html',
}: {
  list: ShelfList
  version: ListVersion
  format?: 'html' | 'zim'
}) {
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
          if (live) setLatest(page.items.find((e) => e.format === format) ?? null)
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
  }, [list.id, version.id, active, format])

  function start(): void {
    setBusy(true)
    setError(null)
    api
      .createExport(list.id, version.id, format)
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
            className="label link-draw py-2 hover:text-paper"
          >
            Download {LABEL[format]}
          </a>
          <span>
            {formatBytes(latest.size_bytes ?? 0)}, available until {day(latest.expires_at)}
            {latest.missing?.length ? `, ${latest.missing.length} pages no longer exist` : ''}
          </span>
        </>
      ) : active ? (
        <span aria-live="polite">
          Making {LABEL[format]}: {latest.progress.toLocaleString()} of{' '}
          {latest.total.toLocaleString()} articles
        </span>
      ) : (
        <>
          <button
            type="button"
            className="label link-draw py-2 hover:text-paper"
            disabled={busy}
            onClick={start}
          >
            {busy ? 'Starting' : `Make ${LABEL[format]}`}
          </button>
          {latest?.status === 'failed' ? (
            <span className="text-signal">The last export failed: {latest.error}</span>
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
