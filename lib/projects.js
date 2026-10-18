// Builds the list of projects from GitHub and keeps it for config.freshSeconds.
//
// A public repository is a laggish project when any of these is true:
//   1. its live site is on laggi.sh: the Website field points there, or
//      https://<repo-name>.laggi.sh exists, or the README links there
//   2. it carries the Laggish design guide as DESIGN.md
//   3. it has the topic "laggish"
// The topic "laggish-hidden" keeps a repository off the list. Forks are never listed.
import { config } from "./config.js"
import { checkSite, fetchCommits, fetchReadme, listRepos, probeSubdomain, usesDesignGuide } from "./github.js"
import { readSummary, renderReadme } from "./readme.js"

const hostOf = (url) => {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

const isOnDomain = (url) => {
  const host = hostOf(url)
  return host !== null && (host === config.domain || host.endsWith(`.${config.domain}`))
}

// This site itself: never list it
const isApex = (url) => {
  const host = hostOf(url)
  return host === config.domain || host === `www.${config.domain}`
}

const normalizeUrl = (value) => {
  if (!value || !value.trim()) return null
  const url = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`
  try {
    return new URL(url).toString()
  } catch {
    return null
  }
}

const NOT_LIVE = /^(localhost|127\.|0\.0\.0\.0|dev\.|staging\.|preview\.|test\.)/i
// Link text that names a running copy of the project ("Live site", "Demo",
// "Live production map"). Not "deployment": that is usually a framework's guide.
const LIVE_WORDS = /^(?:(?:see|try|open|view) )?(?:the |a )?(?:live|production|demo)\b|^try it\b/i

/** The live site a README points at: a laggi.sh link first, then a link called "live", "demo", … */
export const findLiveLink = (markdown) => {
  if (!markdown) return null
  const links = []
  for (const m of markdown.matchAll(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g)) links.push({ text: m[1], url: m[2] })
  for (const m of markdown.matchAll(/(?<![(\w/])(https?:\/\/[^\s)<>\]"'`]+)/g)) links.push({ text: "", url: m[1] })
  const usable = links.filter(({ url }) => {
    const host = hostOf(url)
    return host && !NOT_LIVE.test(host) && !/github\.com|githubusercontent|shields\.io/.test(host)
  })
  const onDomain = usable.find(({ url }) => isOnDomain(url) && !isApex(url))
  if (onDomain) return normalizeUrl(onDomain.url)
  const named = usable.find(({ text }) => LIVE_WORDS.test(text))
  return named ? normalizeUrl(named.url) : null
}

// Run fn over items, at most `limit` at a time
const mapLimit = async (items, limit, fn) => {
  const results = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

const buildProject = async (repo, { wildcard }) => {
  const owner = repo.owner.login
  const branch = repo.default_branch || "HEAD"
  const topics = repo.topics ?? []
  let [readme, guide, subdomain] = await Promise.all([
    fetchReadme(owner, repo.name, branch),
    usesDesignGuide(owner, repo.name, branch),
    probeSubdomain(repo.name),
  ])

  // Under a wildcard DNS record every name resolves, so the subdomain only
  // counts when a site actually answers there
  let subdomainCheck = null
  if (subdomain && wildcard) {
    subdomainCheck = await checkSite(subdomain)
    if (subdomainCheck.state !== "up") subdomain = null
  }

  const homepage = normalizeUrl(repo.homepage)
  const readmeLink = findLiveLink(readme?.text)
  let live = null
  let liveSource = null
  if (homepage && isOnDomain(homepage)) [live, liveSource] = [homepage, "The repository's Website field"]
  else if (subdomain) [live, liveSource] = [subdomain, `The subdomain ${new URL(subdomain).host} exists`]
  else if (homepage) [live, liveSource] = [homepage, "The repository's Website field"]
  else if (readmeLink) [live, liveSource] = [readmeLink, "A link in the README"]

  const reasons = []
  if (live && isOnDomain(live)) reasons.push(`Live on ${config.domain}`)
  if (guide) reasons.push("Uses the Laggish design guide")
  if (topics.includes(config.includeTopic)) reasons.push(`Topic “${config.includeTopic}”`)

  const health = !live ? null : live === subdomain && subdomainCheck ? subdomainCheck : await checkSite(live)
  const summary = readSummary(readme?.text, { repoName: repo.name, description: repo.description })
  const description = repo.description?.trim() || null

  return {
    name: repo.name,
    displayName: summary.title ?? repo.name,
    owner,
    url: repo.html_url,
    description,
    summary: summary.summary,
    siteDescription: health?.description ?? null,
    readmeTemplate: summary.template,
    readme: readme ? { path: readme.path, text: readme.text, bytes: Buffer.byteLength(readme.text) } : null,
    live,
    liveSource,
    health,
    usesGuide: guide,
    hidden: topics.includes(config.hideTopic),
    laggish: reasons.length > 0 && !topics.includes(config.hideTopic),
    reasons,
    self: Boolean(live && isApex(live)),
    language: repo.language,
    topics: topics.filter((t) => t !== config.includeTopic && t !== config.hideTopic),
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    license: repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION" ? repo.license.spdx_id : null,
    archived: repo.archived,
    branch,
    createdAt: repo.created_at,
    pushedAt: repo.pushed_at,
    sizeKb: repo.size,
  }
}

const byPushed = (a, b) => new Date(b.pushedAt) - new Date(a.pushedAt)

const build = async () => {
  const { repos, rateLimit } = await listRepos(config.owner)
  const candidates = repos.filter((r) => !r.fork && !r.private && r.visibility !== "private")
  const wildcard = (await probeSubdomain(`no-such-project-${Date.now().toString(36)}`)) !== null
  const all = (await mapLimit(candidates, 12, (repo) => buildProject(repo, { wildcard }))).filter((p) => !p.self)
  return {
    owner: config.owner,
    domain: config.domain,
    fetchedAt: new Date().toISOString(),
    rateLimit,
    projects: all.filter((p) => p.laggish).sort(byPushed),
    others: all.filter((p) => !p.laggish).sort(byPushed),
    error: null,
  }
}

let cache = null
let inflight = null
// After GitHub fails, wait this long before asking again
const RETRY_MS = 60 * 1000
let failed = null

/**
 * The current data. Fresh for config.freshSeconds; after that the next call
 * fetches again. If GitHub fails, the last good data comes back with `error` set.
 */
export const getData = async ({ force = false } = {}) => {
  const fresh = cache && Date.now() - new Date(cache.fetchedAt).getTime() < config.freshSeconds * 1000
  if (fresh && !force) return cache
  if (failed && Date.now() - failed.at < RETRY_MS && !force) {
    if (!cache) throw failed.error
    return { ...cache, error: failed.error.message, rateLimit: failed.error.rateLimit ?? cache.rateLimit }
  }
  if (!inflight) {
    inflight = build()
      .then((data) => {
        cache = data
        failed = null
        readmeHtml.clear()
        return data
      })
      .catch((error) => {
        failed = { error, at: Date.now() }
        if (!cache) throw error
        return { ...cache, error: error.message, rateLimit: error.rateLimit ?? cache.rateLimit }
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

export const findProject = (data, name) => {
  const key = name.toLowerCase()
  return [...data.projects, ...data.others].find((p) => p.name.toLowerCase() === key) ?? null
}

const readmeHtml = new Map()

export const readmeHtmlFor = (project) => {
  if (!project.readme) return null
  if (!readmeHtml.has(project.name)) {
    readmeHtml.set(
      project.name,
      renderReadme(project.readme.text, { owner: project.owner, repo: project.name, branch: project.branch }),
    )
  }
  return readmeHtml.get(project.name)
}

const commitCache = new Map()

export const commitsFor = async (project) => {
  const hit = commitCache.get(project.name)
  if (hit && hit.pushedAt === project.pushedAt && Date.now() - hit.at < config.freshSeconds * 1000) return hit.commits
  const commits = await fetchCommits(project.owner, project.name, project.branch)
  commitCache.set(project.name, { commits, pushedAt: project.pushedAt, at: Date.now() })
  return commits
}
