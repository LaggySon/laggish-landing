// Reads from GitHub. Only the repository list uses the rate-limited REST API
// (one request per refresh). READMEs, DESIGN.md, and commit feeds come from
// raw.githubusercontent.com and github.com, which that limit does not cover.
import { lookup } from "node:dns/promises"
import { config } from "./config.js"

const UA = `${config.domain} project index (+https://${config.domain})`

export class GitHubError extends Error {
  constructor(message, { status, rateLimit } = {}) {
    super(message)
    this.status = status
    this.rateLimit = rateLimit
  }
}

const rateLimitOf = (res) => {
  const remaining = res.headers.get("x-ratelimit-remaining")
  if (remaining === null) return null
  return {
    remaining: Number(remaining),
    limit: Number(res.headers.get("x-ratelimit-limit")),
    reset: new Date(Number(res.headers.get("x-ratelimit-reset")) * 1000).toISOString(),
  }
}

const api = async (path) => {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": UA,
  }
  if (config.token) headers.Authorization = `Bearer ${config.token}`
  let res
  try {
    res = await fetch(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(10000) })
  } catch (error) {
    throw new GitHubError(`GitHub API unreachable (${error.name === "TimeoutError" ? "no answer in 10s" : error.message}).`)
  }
  const rateLimit = rateLimitOf(res)
  if (!res.ok) {
    const limited = (res.status === 403 || res.status === 429) && rateLimit?.remaining === 0
    const message = limited
      ? `GitHub API rate limit reached (HTTP ${res.status}).`
      : `GitHub API request failed (HTTP ${res.status}).`
    throw new GitHubError(message, { status: res.status, rateLimit })
  }
  return { body: await res.json(), rateLimit, link: res.headers.get("link") }
}

/** Every public repository the owner owns, newest push first. */
export const listRepos = async (owner) => {
  const repos = []
  let rateLimit = null
  for (let page = 1; page <= 10; page++) {
    let result
    try {
      result = await api(`/users/${encodeURIComponent(owner)}/repos?type=owner&sort=pushed&per_page=100&page=${page}`)
    } catch (error) {
      if (error.status === 404) throw new GitHubError(`GitHub account ${owner} not found (HTTP 404).`, error)
      throw error
    }
    rateLimit = result.rateLimit
    repos.push(...result.body)
    if (!result.link || !result.link.includes('rel="next"')) break
  }
  return { repos, rateLimit }
}

const rawUrl = (owner, repo, branch, path) =>
  `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${path}`

const fetchText = async (url, { headers = {}, timeout = 8000 } = {}) => {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, ...headers }, signal: AbortSignal.timeout(timeout) })
    if (!res.ok && res.status !== 206) return null
    return await res.text()
  } catch {
    return null
  }
}

const README_NAMES = ["README.md", "readme.md", "Readme.md", "README.MD", "README.markdown", "README"]

/** The README at the root of the default branch, or null. */
export const fetchReadme = async (owner, repo, branch) => {
  for (const path of README_NAMES) {
    const text = await fetchText(rawUrl(owner, repo, branch, path))
    if (text !== null) return { path, text }
  }
  return null
}

/** True when the repository carries the Laggish design guide as DESIGN.md. */
export const usesDesignGuide = async (owner, repo, branch) => {
  const head = await fetchText(rawUrl(owner, repo, branch, "DESIGN.md"), { headers: { Range: "bytes=0-300" } })
  return head !== null && /laggish design guide/i.test(head)
}

/** "https://name.laggi.sh" if that host exists in DNS, else null. */
export const probeSubdomain = async (name) => {
  const label = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "")
  if (!label || label.length > 63) return null
  const host = `${label}.${config.domain}`
  try {
    await lookup(host)
    return `https://${host}`
  } catch {
    return null
  }
}

const decodeEntities = (text) =>
  text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")

/** The latest commits on a branch, from GitHub's public Atom feed. */
export const fetchCommits = async (owner, repo, branch, limit = 10) => {
  const xml = await fetchText(`https://github.com/${owner}/${repo}/commits/${encodeURIComponent(branch)}.atom`)
  if (!xml) return null
  const entries = []
  for (const match of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const entry = match[1]
    const pick = (re) => entry.match(re)?.[1]?.trim() ?? null
    const sha = pick(/Commit\/([0-9a-f]{7,40})<\/id>/)
    const title = pick(/<title>([\s\S]*?)<\/title>/)
    if (!sha || !title) continue
    entries.push({
      sha,
      url: pick(/<link[^>]+href="([^"]+)"/),
      message: decodeEntities(title).replace(/\s+/g, " "),
      date: pick(/<updated>([^<]+)<\/updated>/),
      author: decodeEntities(pick(/<name>([\s\S]*?)<\/name>/) ?? ""),
    })
    if (entries.length >= limit) break
  }
  return entries
}

// ---------- Live site check ----------

const readHead = async (res, limit = 96 * 1024) => {
  if (!res.body) return ""
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ""
  while (text.length < limit) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
    if (/<\/head>/i.test(text)) break
  }
  reader.cancel().catch(() => {})
  return text
}

const metaContent = (headHtml, name) => {
  const tags = headHtml.match(/<meta\b[^>]*>/gi) ?? []
  for (const tag of tags) {
    const key = tag.match(/\b(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1]
    if (key?.toLowerCase() !== name) continue
    const content = tag.match(/\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i)
    if (content) return decodeEntities(content[1] ?? content[2]).trim() || null
  }
  return null
}

const describeError = (error) => {
  if (error.name === "TimeoutError") return "No answer in 6s"
  const code = error.cause?.code
  if (code === "ENOTFOUND") return "Domain does not resolve"
  if (code === "ECONNREFUSED") return "Connection refused"
  if (code?.startsWith("ERR_TLS") || code?.includes("CERT")) return "TLS certificate error"
  return error.cause?.message ?? error.message
}

/** Load a live site once and report whether it is up, and its <title>. */
export const checkSite = async (url) => {
  const started = performance.now()
  const checkedAt = new Date().toISOString()
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": `${UA} status check`, Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(6000),
    })
    const ms = Math.round(performance.now() - started)
    const isHtml = (res.headers.get("content-type") ?? "").includes("html")
    const head = isHtml ? await readHead(res) : (res.body?.cancel().catch(() => {}), "")
    const title = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    // 401 and 403 mean a sign-in wall in front of a working app
    const up = res.status < 400 || res.status === 401 || res.status === 403
    return {
      state: up ? "up" : "down",
      status: res.status,
      ms,
      checkedAt,
      finalUrl: res.url,
      title: title ? decodeEntities(title).replace(/\s+/g, " ").trim() : null,
      description: metaContent(head, "description") ?? metaContent(head, "og:description"),
      error: up ? null : `HTTP ${res.status}`,
    }
  } catch (error) {
    return { state: "down", status: null, ms: null, checkedAt, finalUrl: null, title: null, description: null, error: describeError(error) }
  }
}
