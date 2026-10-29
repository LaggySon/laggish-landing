// The /resume page. Built from the components in DESIGN.md 7, like every other page.
import { formatMonth, plural } from "./format.js"
import { html } from "./html.js"
import {
  allCredits,
  games,
  positionsOf,
  creditsOf,
  selected,
  observed,
  orgs,
  produced,
  profile,
  skills,
  spanOf,
  summary,
  tools,
  vodUrl,
} from "./resume.js"
import { layout } from "./views.js"

const ext = html`<span aria-hidden="true">↗</span>`

const month = (m, approx = false) =>
  html`<span class="ui-mono" ${approx ? html`title="Month of the YouTube upload; the broadcast may be a few weeks earlier"` : ""}>${formatMonth(m, approx)}</span>`

const stat = (value, label) =>
  html`<div class="ui-stat"><span class="ui-stat-value">${value}</span><span class="ui-stat-label">${label}</span></div>`

const statRow = () => {
  const all = allCredits()
  const { from, to } = spanOf(all)
  return html`
    <div class="ui-stats lg-resume-stats" role="group" aria-label="Summary">
      ${stat(all.length, "Broadcasts")}
      ${stat(produced(all), "Produced")}
      ${stat(observed(all), "Observed")}
      <span class="ui-stat-divider" aria-hidden="true"></span>
      ${stat(`${from.slice(0, 4)}–${to.slice(0, 4)}`, "Years")}
      ${stat(games.length, "Games")}
    </div>`
}

const experience = (org) => {
  const credits = creditsOf(org)
  const positions = positionsOf(org)
  const from = positions.map((p) => p.from).sort()[0]
  const to = positions.map((p) => p.to).sort().at(-1)
  return html`
        <section class="ui-panel lg-job" aria-labelledby="job-${org.id}">
          <h3 class="ui-panel-title" id="job-${org.id}"><a class="ui-quiet-link" href="${org.url}">${org.name}</a> <span class="ui-panel-title-aside ui-mono">${from} – ${to}</span></h3>
          <p class="lg-job-about">${org.about}.</p>
          ${positions.map(
            (p) => html`
          <div class="lg-position">
            <p class="lg-job-role">${p.title} <span class="ui-mono ui-muted lg-position-dates">${p.from} – ${p.to}</span></p>
            <ul class="lg-job-points">${p.points.map((b) => html`<li>${b}</li>`)}</ul>
          </div>`,
          )}
          <a class="ui-quiet-link lg-job-more" href="#credits-${org.id}">${plural(credits.length, "credited broadcast")} ↓</a>
        </section>`
}

const watch = (id, label) =>
  html`<a class="ui-button ui-button--small ui-button--ghost" href="${vodUrl(id)}" aria-label="Watch ${label} on YouTube">Watch ${ext}</a>`

const selectedPanel = () => html`
    <section class="ui-panel lg-selected" aria-labelledby="selected">
      <h2 class="ui-panel-title" id="selected">Selected broadcasts <span class="ui-panel-title-aside">${selected.length} of ${allCredits().length}</span></h2>
      <div class="ui-table-wrap lg-table-wrap">
        <table class="ui-table">
          <thead><tr><th scope="col">Month</th><th scope="col">Broadcast</th><th scope="col">Organization</th><th scope="col">Role</th><th scope="col"><span class="ui-sr-only">Video</span></th></tr></thead>
          <tbody>${selected.map(
            (s) => html`
            <tr><td class="ui-cell-mono">${month(s.month, s.approx)}</td><td class="ui-row-name">${s.text}</td><td>${s.org}</td><td>${s.role}</td><td><div class="lg-vods">${watch(s.vod, s.text)}</div></td></tr>`,
          )}
          </tbody>
        </table>
      </div>
    </section>`

const skillsPanel = () => html`
        <section class="ui-panel" aria-labelledby="skills">
          <h2 class="ui-panel-title" id="skills">Skills</h2>
          <dl class="ui-kv lg-resume-kv">${skills.map((s) => html`<dt>${s.label}</dt><dd>${s.value}</dd>`)}</dl>
        </section>`

const toolsPanel = () => html`
        <section class="ui-panel" aria-labelledby="tools">
          <h2 class="ui-panel-title" id="tools">Built for broadcasts</h2>
          <ul class="lg-tools" role="list">${tools.map(
            (t) => html`
            <li class="lg-tool">
              <span class="lg-tool-name"><a class="ui-link" href="${t.href}">${t.name}</a> <span class="ui-muted ui-mono">${t.stack}</span></span>
              <span class="lg-tool-what">${t.what}. <a class="ui-quiet-link" href="${t.source}">Source ${ext}</a></span>
            </li>`,
          )}
          </ul>
        </section>`

const linksPanel = () => html`
        <section class="ui-panel" aria-labelledby="links">
          <h2 class="ui-panel-title" id="links">Links</h2>
          <dl class="ui-kv lg-resume-kv">
            <dt>Handle</dt><dd class="ui-mono">${profile.handle}</dd>
            <dt>GitHub</dt><dd><a class="ui-link" href="https://github.com/${profile.handle}">github.com/${profile.handle}</a></dd>
            ${orgs.map((o) => html`<dt>${o.id === "egf" ? "EGF VODs" : "Tranquility VODs"}</dt><dd><a class="ui-link" href="${o.channel}">YouTube ${ext}</a></dd>`)}
          </dl>
        </section>`

const creditRow = (c) => html`
                <tr>
                  <td class="ui-cell-mono">${month(c.month, c.approx)}</td>
                  <td class="ui-cell-wrap">${c.title}</td>
                  <td>${c.role}</td>
                  <td><div class="lg-vods">${c.vods.map(
                    (id, i) =>
                      html`<a class="ui-button ui-button--small ui-button--ghost" href="${vodUrl(id)}" aria-label="Watch ${c.title}${c.vods.length > 1 ? ` (video ${i + 1})` : ""} on YouTube">${c.vods.length > 1 ? `Watch ${i + 1}` : "Watch"} ${ext}</a>`,
                  )}</div></td>
                </tr>`

const creditsTable = (org) => html`
      <section class="lg-credits" id="credits-${org.id}" aria-labelledby="credits-${org.id}-title">
        <h3 class="lg-credits-title" id="credits-${org.id}-title">${org.name} <span class="ui-muted ui-mono">${plural(creditsOf(org).length, "broadcast")}</span></h3>
        <div class="ui-table-wrap lg-table-wrap">
          <table class="ui-table">
            <thead>
              <tr>
                <th scope="col" aria-sort="descending">Month <span aria-hidden="true">▼</span></th>
                <th scope="col">Broadcast</th>
                <th scope="col">Role</th>
                <th scope="col"><span class="ui-sr-only">Video</span></th>
              </tr>
            </thead>
            ${org.groups.map(
              (g) => html`
            <tbody>
              <tr class="ui-group-row"><td colspan="4">${g.title} <span class="ui-sep" aria-hidden="true">·</span> <span class="ui-mono">${plural(g.credits.length, "broadcast")}</span></td></tr>${g.credits.map(creditRow)}
            </tbody>`,
            )}
          </table>
        </div>
      </section>`

export const resumePage = () => {
  const body = html`
    <div class="ui-page-header lg-resume-header">
      <div class="lg-resume-who">
        <h1 class="ui-title">${profile.name}</h1>
        <span class="ui-title-aside"><span class="ui-mono">${profile.handle}</span><span class="ui-sep" aria-hidden="true">·</span>${profile.headline}</span>
      </div>
      <div class="ui-button-group">
        <a class="ui-button ui-button--primary" href="/resume.pdf" download="Michael Richards - Resume.pdf">Download PDF</a>
        <a class="ui-button" href="https://github.com/${profile.handle}">GitHub ${ext}</a>
      </div>
    </div>
    <p class="lg-detail-lead">${summary()}</p>
${statRow()}
${selectedPanel()}

    <div class="lg-resume">
      <div class="lg-resume-main">
        <h2 class="lg-section-title">Experience</h2>
${orgs.map(experience)}
      </div>
      <div class="lg-resume-side">
${skillsPanel()}
${toolsPanel()}
${linksPanel()}
      </div>
    </div>

    <h2 class="lg-section-title lg-credits-heading" id="credits">Broadcast credits</h2>
    <nav class="ui-subnav" aria-label="Credits by organization">
      ${orgs.map((o) => html`<a class="ui-chip" href="#credits-${o.id}">${o.name}</a>`)}
    </nav>
    <p class="lg-credits-note ui-muted">Every broadcast below credits ${profile.handle} on screen: in the starting-soon crew bar, the end credits, or the in-game overlay. Months come from the broadcast graphics; a <span class="ui-mono">~</span> marks a month taken from the YouTube upload date.</p>
${orgs.map(creditsTable)}`

  return layout({
    title: `${profile.name} · Resume · laggi.sh`,
    description: summary(),
    body,
    canonical: "/resume",
    current: "resume",
  })
}
