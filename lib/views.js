// The pages. Server-rendered HTML built from the components in DESIGN.md 7.
import { config } from "./config.js"
import { displayUrl, formatBytes, formatDate, formatDateTime, formatEventTime, formatMs, plural } from "./format.js"
import { html, raw } from "./html.js"
import { STATES, outcomeOf, stateOf, wordFor } from "./status.js"

const ASSET_VERSION = "1"
const ext = html`<span aria-hidden="true">↗</span>`

// ---------- Shell ----------

const layout = ({ title, description, body, current = null, notice = null, canonical = "/" }) => html`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)">
  <meta name="color-scheme" content="light dark">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="https://${config.domain}${canonical}">
  <link rel="canonical" href="https://${config.domain}${canonical}">
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700;800&family=Geist+Mono:wght@400;600;700&display=swap">
  <link rel="stylesheet" href="/tokens.css?v=${ASSET_VERSION}">
  <link rel="stylesheet" href="/components.css?v=${ASSET_VERSION}">
  <link rel="stylesheet" href="/ui-local.css?v=${ASSET_VERSION}">
  <script>try{var v=localStorage.getItem("laggish:view");if(v==="list"||v==="cards")document.documentElement.dataset.view=v}catch(e){}</script>
  <script src="/app.js?v=${ASSET_VERSION}" defer></script>
</head>
<body>
<a class="ui-skip-link" href="#main">Skip to content</a>
<div class="ui-shell">
  <header class="ui-topbar">
    <a class="ui-brand" href="/"><span class="ui-brand-mark" aria-hidden="true"></span>${config.domain}</a>
    <nav class="ui-sitenav" aria-label="Site">
      <a href="/" ${current === "projects" ? raw('aria-current="page"') : ""}>Projects</a>
    </nav>
    <div class="ui-topbar-aside">
      <a class="ui-quiet-link ui-mono lg-topbar-link" href="https://github.com/${config.owner}">github.com/${config.owner} ${ext}</a>
    </div>
  </header>
  ${notice}
  <main class="ui-main" id="main">
${body}
  </main>
</div>
</body>
</html>`

const staleNotice = (data) =>
  data.error
    ? html`<div class="ui-notice ui-notice--banner" data-status="warning" role="status">${data.error} Showing the list from <time class="ui-mono" datetime="${data.fetchedAt}" data-format="datetime">${formatDateTime(data.fetchedAt)}</time>.</div>`
    : null

const age = (data) =>
  html`<span class="ui-age" aria-live="off" data-since="${data.fetchedAt}" data-stale-after="${config.freshSeconds * 6}" title="When this list was read from GitHub">checked <time datetime="${data.fetchedAt}">${formatDateTime(data.fetchedAt)}</time></span>`

// ---------- Pieces ----------

const badge = (project) => {
  const key = stateOf(project)
  const outcome = outcomeOf(project)
  const title = project.health?.error ?? STATES[key].means
  return html`<span class="ui-badge" data-status="${STATES[key].role}" ${outcome ? raw(`data-outcome="${outcome}"`) : ""} title="${title}">${wordFor(project)}</span>`
}

const responseText = (health) => {
  if (!health) return "—"
  if (health.state === "up") return formatMs(health.ms)
  return health.status ? `HTTP ${health.status}` : health.error
}

const responseTitle = (health) => {
  if (!health) return "No live site to check"
  const status = health.status ? `HTTP ${health.status}` : health.error
  const time = health.ms !== null ? ` in ${formatMs(health.ms)}` : ""
  return `${status}${time}, checked ${formatDateTime(health.checkedAt)} UTC`
}

// What a project is, in one line, from the best source there is
const lead = (p) => p.description ?? p.summary ?? p.siteDescription ?? null

// Extra words from the README when the lead came from somewhere else
const more = (p) => (p.description && p.summary ? p.summary : null)

const searchText = (p) =>
  [p.name, p.displayName, p.description, p.summary, p.siteDescription, p.language, p.live, ...(p.topics ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

const matches = (p, q) => !q || q.toLowerCase().split(/\s+/).every((word) => searchText(p).includes(word))

const card = (p, q) => {
  const description = lead(p)
  const extra = more(p)
  const down = p.health?.state === "down"
  return html`
      <li class="ui-card" aria-label="${p.displayName}, ${wordFor(p)}" data-search="${searchText(p)}" ${matches(p, q) ? "" : raw("hidden")}>
        <div class="ui-card-header">
          ${badge(p)}
          <span class="ui-card-id">${p.language ?? "—"}</span>
        </div>
        <div class="ui-card-body">
          <a class="ui-card-title ui-truncate" href="/${p.name}" title="${p.displayName}">${p.displayName}</a>
          ${
            p.live
              ? html`<a class="ui-card-meta ui-mono ui-quiet-link ui-truncate" href="${p.live}" title="${p.live}">${displayUrl(p.live)} ${ext}</a>`
              : html`<span class="ui-card-meta">No live site</span>`
          }
          ${description ? html`<p class="lg-lead ui-clamp" style="--clamp-lines: 4" data-expand>${description}</p>` : html`<p class="lg-lead ui-muted">No description yet.</p>`}
          ${extra ? html`<p class="lg-more ui-clamp" style="--clamp-lines: 3" data-expand>${extra}</p>` : ""}
          <dl class="ui-spec">
            <div><dt>Updated</dt><dd><time datetime="${p.pushedAt}" data-format="date">${formatDate(p.pushedAt)}</time></dd></div>
            <div><dt>Started</dt><dd><time datetime="${p.createdAt}" data-format="date">${formatDate(p.createdAt)}</time></dd></div>
            <div><dt>Response</dt><dd ${down ? raw('class="lg-failure-text"') : ""} title="${responseTitle(p.health)}">${responseText(p.health)}</dd></div>
          </dl>
        </div>
        <div class="ui-card-footer" role="group" aria-label="${p.displayName} links">
          <a class="ui-button ui-button--small ui-button--ghost" href="${p.url}">Source ${ext}</a>
          <a class="ui-button ui-button--small" href="/${p.name}">Details</a>
          ${
            p.live
              ? html`<a class="ui-button ui-button--small ui-button--primary" href="${p.live}">Open ${ext}</a>`
              : ""
          }
        </div>
      </li>`
}

const projectRow = (p, q) => html`
          <tr data-search="${searchText(p)}" ${matches(p, q) ? "" : raw("hidden")}>
            <td><a class="ui-row-name ui-quiet-link" href="/${p.name}">${p.displayName}</a></td>
            <td>${badge(p)}</td>
            <td class="ui-cell-mono">${p.live ? html`<a class="ui-quiet-link" href="${p.live}">${displayUrl(p.live)} ${ext}</a>` : "—"}</td>
            <td class="ui-cell-wrap lg-cell-desc">${lead(p) ?? "—"}</td>
            <td>${p.language ?? "—"}</td>
            <td class="ui-cell-mono"><time datetime="${p.pushedAt}" data-format="date">${formatDate(p.pushedAt)}</time></td>
            <td class="ui-cell-mono ui-cell-num" title="${responseTitle(p.health)}">${responseText(p.health)}</td>
            <td><a class="ui-button ui-button--small ui-button--ghost" href="${p.url}" aria-label="Source of ${p.displayName} on GitHub">Source ${ext}</a></td>
          </tr>`

const otherRow = (p, q) => html`
            <tr data-search="${searchText(p)}" ${matches(p, q) ? "" : raw("hidden")}>
              <td><a class="ui-row-name ui-quiet-link" href="/${p.name}">${p.displayName}</a></td>
              <td class="ui-cell-wrap lg-cell-desc">${lead(p) ?? "—"}</td>
              <td class="ui-cell-mono">${p.live ? html`<a class="ui-quiet-link" href="${p.live}">${displayUrl(p.live)} ${ext}</a>` : "—"}</td>
              <td>${p.live ? badge(p) : p.archived ? badge(p) : "—"}</td>
              <td>${p.language ?? "—"}</td>
              <td class="ui-cell-mono"><time datetime="${p.pushedAt}" data-format="date">${formatDate(p.pushedAt)}</time></td>
            </tr>`

const stats = (data) => {
  const up = data.projects.filter((p) => p.health?.state === "up").length
  const down = data.projects.filter((p) => p.health?.state === "down").length
  return html`
    <div class="ui-stats lg-stats" role="group" aria-label="Summary">
      <div class="ui-stat"><span class="ui-stat-value">${data.projects.length}</span><span class="ui-stat-label">Projects</span></div>
      <div class="ui-stat" ${up > 0 ? raw('data-status="success"') : ""}><span class="ui-stat-value">${up}</span><span class="ui-stat-label">Up</span></div>
      <div class="ui-stat" ${down > 0 ? raw('data-status="failure"') : ""}><span class="ui-stat-value">${down}</span><span class="ui-stat-label">Down</span></div>
      ${data.others.length ? html`<span class="ui-stat-divider" aria-hidden="true"></span>
      <div class="ui-stat"><span class="ui-stat-value">${data.others.length}</span><span class="ui-stat-label">Other repos</span></div>` : ""}
    </div>`
}

const rulesText = () => config.only.length ? "" : html`
      <details class="ui-disclosure lg-rules">
        <summary>How this list is made</summary>
        <div class="lg-rules-body">
          <p>Every page here is read from <a class="ui-link" href="https://github.com/${config.owner}">github.com/${config.owner}</a> and is at most ${Math.round(config.freshSeconds / 60)} minutes old. A public repository that is not a fork is a project when one of these is true:</p>
          <ul>
            <li>Its live site is on <span class="ui-mono">${config.domain}</span>: the repository's Website field points there, <span class="ui-mono">https://&lt;repository&gt;.${config.domain}</span> exists, or its README links there.</li>
            <li>It carries the Laggish design guide as <span class="ui-mono">DESIGN.md</span>.</li>
            <li>It has the topic <span class="ui-mono">${config.includeTopic}</span>.</li>
          </ul>
          <p>The topic <span class="ui-mono">${config.hideTopic}</span> keeps a repository off the list. The description comes from the repository's About field, the extra lines from its README, and the live site from its Website field, its <span class="ui-mono">${config.domain}</span> subdomain, or a README link. Up and Down come from loading the live site once per refresh.</p>
        </div>
      </details>`

// ---------- Pages ----------

export const indexPage = (data, { q = "" } = {}) => {
  const shown = data.projects.filter((p) => matches(p, q)).length
  const otherShown = data.others.filter((p) => matches(p, q)).length
  const body = html`
    <div class="ui-page-header">
      <h1 class="ui-title">Projects</h1>
      <div class="ui-title-aside">
        <span>from <a class="ui-quiet-link ui-mono" href="https://github.com/${config.owner}?tab=repositories">${config.owner}</a></span><span class="ui-sep" aria-hidden="true">·</span>${age(data)}
      </div>
    </div>

    <form class="ui-toolbar ui-toolbar--sticky" role="search" action="/" method="get" data-filter-form>
      <label class="ui-field ui-field--inline">
        <span class="ui-field-label">Filter</span>
        <input class="ui-input ui-input--compact lg-filter" type="search" name="q" value="${q}" placeholder="elixir" autocomplete="off" spellcheck="false" aria-keyshortcuts="/" data-filter>
      </label>
      <div class="ui-segmented" role="radiogroup" aria-label="View" data-view-switch>
        <button type="button" class="ui-chip" role="radio" aria-checked="true" tabindex="0" data-view-choice="cards">Cards</button>
        <button type="button" class="ui-chip" role="radio" aria-checked="false" tabindex="-1" data-view-choice="list">List</button>
      </div>
      <span class="ui-toolbar-end ui-mono ui-muted" role="status" aria-live="polite" data-filter-count>${plural(shown, "project")}${q && data.others.length ? html` · ${plural(otherShown, "other repository", "other repositories")}` : ""}</span>
    </form>

    ${stats(data)}

    ${
      data.projects.length === 0
        ? html`<div class="ui-empty">No projects yet. A public repository shows up here when its live site is on ${config.domain}, it carries DESIGN.md, or it has the topic “${config.includeTopic}”.</div>`
        : html`
    <div class="ui-empty" data-filter-empty ${shown === 0 && q ? "" : raw("hidden")}>
      <span>No projects match “<span data-filter-echo>${q}</span>”. Clear the filter to see all ${plural(data.projects.length, "project")}.</span>
      <a class="ui-button ui-button--small" href="/" data-filter-clear>Clear filter</a>
    </div>

    <section aria-label="Projects" class="lg-view-cards">
      <ul class="ui-cards lg-cards" role="list">${data.projects.map((p) => card(p, q))}
      </ul>
    </section>

    <section aria-label="Projects" class="lg-view-list">
      <div class="ui-table-wrap lg-table-wrap">
        <table class="ui-table">
          <thead>
            <tr>
              <th scope="col">Project</th>
              <th scope="col">Status</th>
              <th scope="col">Site</th>
              <th scope="col">Description</th>
              <th scope="col">Language</th>
              <th scope="col" aria-sort="descending">Updated <span aria-hidden="true">▼</span></th>
              <th scope="col" class="ui-cell-num" title="Time to load the live site, or the error it gave">Response</th>
              <th scope="col"><span class="ui-sr-only">Source</span></th>
            </tr>
          </thead>
          <tbody>${data.projects.map((p) => projectRow(p, q))}
          </tbody>
        </table>
      </div>
    </section>`
    }

    ${
      data.others.length
        ? html`
    <details class="ui-panel ui-panel--collapsible lg-others" ${q && otherShown > 0 ? raw("open") : ""} data-others>
      <summary class="ui-panel-title">Other repositories <span class="ui-panel-title-aside" data-others-count>${plural(q ? otherShown : data.others.length, "public repository", "public repositories")} not on ${config.domain}</span></summary>
      <div class="ui-table-wrap lg-table-wrap">
        <table class="ui-table">
          <thead>
            <tr>
              <th scope="col">Repository</th>
              <th scope="col">Description</th>
              <th scope="col">Site</th>
              <th scope="col">Status</th>
              <th scope="col">Language</th>
              <th scope="col" aria-sort="descending">Updated <span aria-hidden="true">▼</span></th>
            </tr>
          </thead>
          <tbody>${data.others.map((p) => otherRow(p, q))}
          </tbody>
        </table>
      </div>
    </details>`
        : ""
    }

    ${rulesText()}`

  return layout({
    title: `${config.domain} · Projects`,
    description: `${plural(data.projects.length, "project")} by ${config.owner}, each with its live site, read from GitHub.`,
    body,
    current: "projects",
    notice: staleNotice(data),
  })
}

const factsPanel = (p) => html`
      <section class="ui-panel lg-facts" aria-labelledby="facts">
        <h2 class="ui-panel-title" id="facts">Facts</h2>
        <dl class="ui-kv">
          <dt>Live site</dt>
          <dd>${p.live ? html`<a class="ui-link" href="${p.live}">${displayUrl(p.live)}</a>` : "—"}</dd>
          <dt>Status</dt>
          <dd class="lg-status-cell">${badge(p)} <span class="ui-muted" title="${p.health ? `Checked ${formatDateTime(p.health.checkedAt)} UTC` : ""}">${p.health ? responseTitle(p.health).replace(/, checked.*$/, "") : "Nothing to check"}</span></dd>
          ${p.live ? html`<dt>Found by</dt><dd class="lg-reasons">${p.liveSource}</dd>` : ""}
          <dt>Repository</dt>
          <dd><a class="ui-link" href="${p.url}">${p.owner}/${p.name}</a></dd>
          <dt>Language</dt>
          <dd>${p.language ?? "—"}</dd>
          ${p.topics.length ? html`<dt>Topics</dt><dd class="lg-topics">${p.topics.map((t) => html`<a class="ui-badge ui-badge--data" href="/?q=${encodeURIComponent(t)}">${t}</a>`)}</dd>` : ""}
          <dt>Started</dt>
          <dd><time datetime="${p.createdAt}" data-format="date">${formatDate(p.createdAt)}</time></dd>
          <dt>Last push</dt>
          <dd><time datetime="${p.pushedAt}" data-format="datetime">${formatDateTime(p.pushedAt)}</time></dd>
          <dt>Branch</dt>
          <dd>${p.branch}</dd>
          <dt>License</dt>
          <dd>${p.license ?? "—"}</dd>
          <dt>Stars</dt>
          <dd>${p.stars}</dd>
          <dt>Open issues</dt>
          <dd>${p.openIssues}</dd>
          <dt>Listed as</dt>
          <dd class="lg-reasons">${p.laggish ? ["Project", ...p.reasons].join(" · ") 
            : p.hidden ? `Other repository · kept off the list by the topic ${config.hideTopic}` : `Other repository · nothing ties it to ${config.domain}`}</dd>
        </dl>
      </section>`

const commitsPanel = (p, commits) => html`
      <section class="ui-panel lg-commits" aria-labelledby="commits">
        <h2 class="ui-panel-title" id="commits">Recent commits <span class="ui-panel-title-aside"><a class="ui-quiet-link ui-mono" href="${p.url}/commits/${p.branch}">${p.branch} ${ext}</a></span></h2>
        ${
          commits === null
            ? html`<p class="ui-muted lg-panel-note">GitHub did not send the commit feed. <a class="ui-link" href="${p.url}/commits/${p.branch}">See the commits on GitHub</a>.</p>`
            : commits.length === 0
              ? html`<p class="ui-muted lg-panel-note">No commits on ${p.branch}.</p>`
              : html`<ol class="lg-commit-list" role="list">${commits.map(
                  (c) => html`
          <li class="lg-commit">
            <a class="ui-quiet-link lg-commit-message ui-truncate" href="${c.url}" title="${c.message}">${c.message}</a>
            <span class="lg-commit-meta ui-mono"><time datetime="${c.date}" data-format="event">${formatEventTime(c.date)}</time><span class="ui-sep" aria-hidden="true">·</span><a class="ui-id-link" href="${c.url}" aria-label="Commit ${c.sha.slice(0, 7)}">${c.sha.slice(0, 7)}</a></span>
          </li>`,
                )}
        </ol>`
        }
      </section>`

const readmePanel = (p, readmeHtml) => {
  if (!p.readme) {
    return html`
      <section class="ui-panel lg-readme" aria-labelledby="readme">
        <h2 class="ui-panel-title" id="readme">README</h2>
        <div class="ui-empty">No README in this repository. <a class="ui-link" href="${p.url}">See the files on GitHub</a>.</div>
      </section>`
  }
  const prose = html`<div class="lg-prose">${raw(readmeHtml)}</div>`
  return html`
      <section class="ui-panel lg-readme" aria-labelledby="readme">
        <h2 class="ui-panel-title" id="readme">README <span class="ui-panel-title-aside"><a class="ui-quiet-link ui-mono" href="${p.url}/blob/${p.branch}/${p.readme.path}">${p.readme.path} · ${formatBytes(p.readme.bytes)} ${ext}</a></span></h2>
        ${
          p.readmeTemplate
            ? html`
        <div class="ui-notice" data-status="progress" role="status">This README is the unedited ${p.readmeTemplate} template. It says how the framework works, not what ${p.displayName} does.</div>
        <details class="ui-disclosure lg-template">
          <summary>Template README</summary>
          ${prose}
        </details>`
            : prose
        }
      </section>`
}

export const projectPage = (data, p, { readmeHtml, commits }) => {
  // The README below starts with its own summary: do not say it twice
  const readmeSaysIt = p.readme && !p.readmeTemplate && p.summary
  const description = p.description ?? (readmeSaysIt ? null : lead(p))
  const extra = readmeSaysIt ? null : p.description ? (p.summary ?? p.siteDescription) : null
  const body = html`
    <nav class="lg-back" aria-label="Breadcrumb"><a class="ui-quiet-link" href="/">‹ All projects</a></nav>
    <div class="ui-page-header lg-detail-header">
      <div class="lg-detail-title">
        <h1 class="ui-title">${p.displayName}</h1>
        ${badge(p)}
        <span class="ui-mono ui-muted lg-detail-id">${p.owner}/${p.name}</span>
      </div>
      <div class="ui-button-group">
        <a class="ui-button" href="${p.url}">Source ${ext}</a>
        ${p.live ? html`<a class="ui-button ui-button--primary" href="${p.live}">Open site ${ext}</a>` : ""}
      </div>
    </div>
    ${description ? html`<p class="lg-detail-lead">${description}</p>` : ""}
    ${extra ? html`<p class="lg-detail-more">${extra}</p>` : ""}

    <div class="lg-detail">
${readmePanel(p, readmeHtml)}
${factsPanel(p)}
${commitsPanel(p, commits)}
    </div>
    <p class="lg-footnote ui-muted">Read from GitHub, ${age(data)}.</p>`

  return layout({
    title: `${p.displayName} · ${config.domain}`,
    description: description ?? `${p.displayName}, a project by ${config.owner}.`,
    body,
    current: null,
    notice: staleNotice(data),
    canonical: `/${p.name}`,
  })
}

export const notFoundPage = (data, name) =>
  layout({
    title: `Not found · ${config.domain}`,
    description: `No project called ${name}.`,
    notice: data ? staleNotice(data) : null,
    canonical: `/${name}`,
    body: html`
    <div class="ui-page-state" data-status="failure" role="alert">
      <h1 class="ui-page-state-title">Project ${name} not found</h1>
      <p>${config.owner} has no public repository called “${name}” that is not a fork. It may be private, renamed, or deleted.</p>
      <a class="ui-button" href="/">All projects</a>
    </div>`,
  })

export const errorPage = (message, rateLimit) =>
  layout({
    title: `GitHub unreachable · ${config.domain}`,
    description: "The project list could not be read from GitHub.",
    current: "projects",
    body: html`
    <div class="ui-page-state" data-status="failure" role="alert">
      <h1 class="ui-page-state-title">GitHub unreachable</h1>
      <p>${message} The project list is read from GitHub on every refresh${
        rateLimit?.remaining === 0 && rateLimit.reset
          ? html`, and the limit resets at <time class="ui-mono" datetime="${rateLimit.reset}" data-format="datetime">${formatDateTime(rateLimit.reset)}</time>`
          : ""
      }. Try again in a few minutes.</p>
      <a class="ui-button" href="">Retry</a>
    </div>`,
  })
