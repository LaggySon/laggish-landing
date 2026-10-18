// Dates and numbers, formatted in one place (DESIGN.md 11). The server renders
// UTC; public/app.js rewrites every <time data-format> into the visitor's zone.
const pad = (n) => String(n).padStart(2, "0")

const parts = (date) => ({
  y: date.getUTCFullYear(),
  mo: pad(date.getUTCMonth() + 1),
  d: pad(date.getUTCDate()),
  h: pad(date.getUTCHours()),
  mi: pad(date.getUTCMinutes()),
  s: pad(date.getUTCSeconds()),
})

export const formatDate = (iso) => {
  if (!iso) return "—"
  const p = parts(new Date(iso))
  return `${p.y}-${p.mo}-${p.d}`
}

export const formatDateTime = (iso) => {
  if (!iso) return "—"
  const p = parts(new Date(iso))
  return `${p.y}-${p.mo}-${p.d} ${p.h}:${p.mi}:${p.s}`
}

// A time in a list of events: "09:02:15" today, "10-13 09:02:15" this year,
// "2025-12-30 09:02:15" before
export const formatEventTime = (iso, now = new Date()) => {
  if (!iso) return "—"
  const date = new Date(iso)
  const p = parts(date)
  const n = parts(now)
  if (p.y === n.y && p.mo === n.mo && p.d === n.d) return `${p.h}:${p.mi}:${p.s}`
  if (p.y === n.y) return `${p.mo}-${p.d} ${p.h}:${p.mi}:${p.s}`
  return `${p.y}-${p.mo}-${p.d} ${p.h}:${p.mi}:${p.s}`
}

// "updated 3s ago", "4m", "2h", "3d": the age of the data, never of an event
export const formatAge = (iso, now = Date.now()) => {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const numberFormat = new Intl.NumberFormat("en-US")

// Group thousands from 10,000 up (DESIGN.md 11)
export const formatCount = (n) => (Math.abs(n) >= 10000 ? numberFormat.format(n) : String(n))

// Real plurals, never "project(s)"
export const plural = (n, one, many = `${one}s`) => `${formatCount(n)} ${n === 1 ? one : many}`

export const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export const formatMs = (ms) => (ms >= 10000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`)

// "https://transitmaps.laggi.sh/" -> "transitmaps.laggi.sh"
export const displayUrl = (url) => {
  try {
    const u = new URL(url)
    const path = u.pathname === "/" ? "" : u.pathname.replace(/\/$/, "")
    return `${u.host}${path}`
  } catch {
    return url
  }
}
