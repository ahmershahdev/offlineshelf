import type { ListVersion } from '../api/client'

export const POLL_MS = 4000

export function isActive(status: ListVersion['status'] | null | undefined): boolean {
  return status === 'queued' || status === 'building'
}

export function articleUrl(wiki: string, title: string): string {
  const path = encodeURIComponent(title.replaceAll(' ', '_'))
    .replaceAll('%2F', '/')
    .replaceAll('%3A', ':')
  return `https://${wiki}/wiki/${path}`
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : JSON.stringify(value)
}

export function reportLines(report: ListVersion['report']): string[] {
  if (!report) return []
  return Object.entries(report).map(([key, value]) => {
    const name = key.replaceAll('_', ' ')
    if (!Array.isArray(value)) return `${name}: ${text(value)}`
    if (value.length === 0) return `${name}: 0`
    if (value.every((v) => typeof v === 'number')) return `${name}: ${value.join(', ')}`
    const shown = value.slice(0, 5).map(text).join(', ')
    return `${name}: ${value.length} (${shown}${value.length > 5 ? ', ...' : ''})`
  })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`
}
