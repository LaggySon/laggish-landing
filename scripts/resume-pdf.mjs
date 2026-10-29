// Prints public/resume.pdf from the same data as the /resume page (lib/resume.js).
// The PDF is output for another audience (DESIGN.md 0.1), so it has its own print
// design and does not load the site's CSS.
//   CHROME_PATH=/path/to/chrome npm run resume-pdf
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { formatMonthName, plural } from "../lib/format.js"
import { html, raw } from "../lib/html.js"
import {
  allCredits,
  positionsOf,
  creditsOf,
  grandFinals,
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
} from "../lib/resume.js"

const chrome = process.env.CHROME_PATH
if (!chrome) {
  console.error("Set CHROME_PATH to a Chrome, Chromium, or chrome-headless-shell binary.")
  process.exit(2)
}

// Geist is embedded from the geist package, so the PDF never falls back to a
// system font when Google Fonts is slow or the machine has no Arial
const geist = (weight, file) => {
  const data = readFileSync(new URL(`../node_modules/geist/dist/fonts/geist-sans/${file}`, import.meta.url)).toString("base64")
  return `@font-face { font-family: "Geist"; font-weight: ${weight}; src: url(data:font/woff2;base64,${data}) format("woff2"); }`
}
const fonts = [geist(400, "Geist-Regular.woff2"), geist(600, "Geist-SemiBold.woff2"), geist(700, "Geist-Bold.woff2")].join("\n")

const all = allCredits()
const span = spanOf(all)
const range = ({ from, to }) => (from === to ? formatMonthName(from) : `${formatMonthName(from)} – ${formatMonthName(to)}`)
const host = (href) => href.replace(/^https?:\/\//, "")

const css = `
@page { size: Letter; margin: 0.55in 0.6in 0.6in; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: "Geist", Arial, Helvetica, sans-serif; font-size: 9.6pt; line-height: 1.42; color: #1a1a1a; }
a { color: inherit; text-decoration: none; }
.num { font-variant-numeric: tabular-nums; }
header { display: flex; justify-content: space-between; align-items: flex-end; gap: 24pt; padding-bottom: 9pt; border-bottom: 1.5pt solid #1a1a1a; }
h1 { font-size: 23pt; line-height: 1.05; font-weight: 700; letter-spacing: -0.02em; }
.headline { margin-top: 4pt; font-size: 11pt; color: #3d3d3d; }
.contact { text-align: right; font-size: 8.6pt; line-height: 1.6; color: #3d3d3d; }
.contact a { color: #1f3d73; }
.summary { margin-top: 10pt; font-size: 9.8pt; }
.figures { display: flex; gap: 0; margin-top: 10pt; border-top: 0.6pt solid #cfcfcf; border-bottom: 0.6pt solid #cfcfcf; }
.figure { flex: 1; padding: 5pt 0 5pt 9pt; border-left: 0.6pt solid #cfcfcf; }
.figure:first-child { border-left: 0; padding-left: 0; }
.figure b { display: block; font-size: 14pt; font-weight: 700; letter-spacing: -0.01em; }
.figure span { font-size: 7.4pt; text-transform: uppercase; letter-spacing: 0.06em; color: #5a5a5a; }
h2 { margin-top: 13pt; padding-bottom: 3pt; font-size: 8.2pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #1f3d73; border-bottom: 0.6pt solid #cfcfcf; }
.job { margin-top: 7pt; break-inside: avoid; }
.job-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12pt; }
.job-org { font-size: 10.6pt; font-weight: 700; }
.job-dates { font-size: 8.8pt; color: #3d3d3d; white-space: nowrap; }
.job-role { font-weight: 600; color: #1f3d73; }
.job-about { font-size: 8.6pt; color: #5a5a5a; }
.position { margin-top: 4pt; }
ul { margin-top: 3pt; padding-left: 11pt; }
li { margin-top: 1.6pt; }
li::marker { color: #8a8a8a; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18pt; }
.rows { margin-top: 5pt; }
.row { display: grid; grid-template-columns: 52pt 1fr; gap: 8pt; padding: 2.2pt 0; border-bottom: 0.4pt solid #e2e2e2; break-inside: avoid; }
.row:last-child { border-bottom: 0; }
.row .k { font-size: 8.2pt; color: #5a5a5a; }
.row .v b { font-weight: 600; }
.row .sub { color: #5a5a5a; }
.skill { grid-template-columns: 58pt 1fr; }
.credits-intro { margin-top: 5pt; font-size: 8.6pt; color: #3d3d3d; }
.org-title { display: flex; justify-content: space-between; align-items: baseline; margin-top: 9pt; font-size: 10pt; font-weight: 700; break-after: avoid; }
.org-title span { font-size: 8.4pt; font-weight: 400; color: #5a5a5a; }
table { width: 100%; margin-top: 3pt; border-collapse: collapse; font-size: 8.2pt; }
th { padding: 2pt 4pt; font-size: 6.8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; text-align: left; color: #5a5a5a; border-bottom: 0.8pt solid #1a1a1a; }
td { padding: 1.8pt 4pt; vertical-align: top; border-bottom: 0.4pt solid #e6e6e6; }
td.m { width: 64pt; white-space: nowrap; color: #3d3d3d; }
td.o { width: 92pt; white-space: nowrap; color: #3d3d3d; }
th.n, td.n { width: 54pt; text-align: right; }
table.selected { font-size: 8.8pt; }
table.selected td { padding: 2.6pt 4pt; }
td.r { width: 92pt; white-space: nowrap; }
td a { color: #1f3d73; }
tr { break-inside: avoid; }
tr.group td { padding-top: 5pt; font-weight: 700; font-size: 7.6pt; text-transform: uppercase; letter-spacing: 0.06em; color: #1a1a1a; background: #f2f2f2; border-bottom: 0.6pt solid #cfcfcf; }
tr.group td span { font-weight: 400; letter-spacing: 0.02em; text-transform: none; color: #5a5a5a; }
.foot { margin-top: 4pt; font-size: 7.6pt; color: #6a6a6a; }
`

const doc = html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${profile.name} · Resume</title>
<meta name="author" content="${profile.name}">
<meta name="description" content="${summary()}">
<style>${raw(fonts)}${raw(css)}</style>
</head>
<body>
<header>
  <div>
    <h1>${profile.name}</h1>
    <div class="headline">${profile.headline} · ${profile.handle}</div>
  </div>
  <div class="contact">${profile.links.map((l) => html`<div><a href="${l.href}">${l.label}</a></div>`)}</div>
</header>

<p class="summary">${summary()}</p>

<div class="figures">
  <div class="figure"><b class="num">${all.length}</b><span>Broadcasts</span></div>
  <div class="figure"><b class="num">${produced(all)}</b><span>Produced</span></div>
  <div class="figure"><b class="num">${observed(all)}</b><span>Observed</span></div>
  <div class="figure"><b class="num">${grandFinals(all)}</b><span>Grand finals</span></div>
  <div class="figure"><b class="num">${span.from.slice(0, 4)}–${span.to.slice(0, 4)}</b><span>Active</span></div>
</div>

<h2>Experience</h2>
${orgs.map((org) => {
  const credits = creditsOf(org)
  const positions = positionsOf(org)
  const from = positions.map((x) => x.from).sort()[0]
  const to = positions.map((x) => x.to).sort().at(-1)
  return html`
<div class="job">
  <div class="job-head"><a class="job-org" href="${org.url}">${org.name}</a><span class="job-dates">${range({ from, to })}</span></div>
  <div class="job-about">${org.about}.</div>
  ${positions.map(
    (x) => html`
  <div class="position">
    <div class="job-head"><span class="job-role">${x.title}</span><span class="job-dates">${range(x)}${x.credited ? ` · ${plural(credits.length, "credited broadcast")}` : ""}</span></div>
    <ul>${x.points.map((b) => html`<li>${b}</li>`)}</ul>
  </div>`,
  )}
</div>`
})}

<h2>Selected broadcasts</h2>
<table class="selected">
  <thead><tr><th>Month</th><th>Broadcast</th><th>Organization</th><th>Role</th></tr></thead>
  <tbody>${selected.map(
    (c) => html`<tr><td class="m num">${formatMonthName(c.month, c.approx)}</td><td><a href="${vodUrl(c.vod)}">${c.text}</a></td><td class="o">${c.org}</td><td class="r">${c.role}</td></tr>`,
  )}</tbody>
</table>
<p class="foot">Titles link to the videos. All ${all.length} credits, each with its video: laggi.sh/resume</p>

<div class="two">
  <div>
    <h2>Skills</h2>
    <div class="rows">${skills.map((s) => html`<div class="row skill"><span class="k">${s.label}</span><span class="v">${s.value}</span></div>`)}</div>
  </div>
  <div>
    <h2>Built for broadcasts and events</h2>
    <div class="rows">${tools.map(
      (t) => html`<div class="row skill"><span class="k"><a href="${t.href}">${t.name}</a></span><span class="v">${t.what}. <span class="sub">${t.stack} · ${host(t.href)}</span></span></div>`,
    )}</div>
  </div>
</div>

<h2>Credits by season</h2>
<table>
  <thead><tr><th>Season or event</th><th>Months</th><th class="n">Broadcasts</th><th class="n">Produced</th><th class="n">Observed</th></tr></thead>
  <tbody>
  ${orgs.map(
    (org) => html`
    <tr class="group"><td colspan="5">${org.name} <span>· ${plural(creditsOf(org).length, "broadcast")}</span></td></tr>
    ${org.groups.map(
      (g) => html`<tr><td>${g.title}</td><td class="m num">${range(spanOf(g.credits))}</td><td class="n num">${g.credits.length}</td><td class="n num">${produced(g.credits)}</td><td class="n num">${observed(g.credits)}</td></tr>`,
    )}`,
  )}
  </tbody>
</table>
<p class="foot">Every credit was checked on screen in the broadcast: the starting-soon crew bar, the end credits, or the in-game overlay. Videos: Tranquility Gaming and EGF YouTube channels.</p>
</body>
</html>`

const dir = mkdtempSync(join(tmpdir(), "resume-"))
const page = join(dir, "resume.html")
writeFileSync(page, String(doc))
const out = new URL("../public/resume.pdf", import.meta.url).pathname
execFileSync(
  chrome,
  [
    "--headless",
    "--disable-gpu",
    ...(process.env.NO_SANDBOX === "1" ? ["--no-sandbox"] : []),
    "--no-pdf-header-footer",
    "--virtual-time-budget=10000",
    `--print-to-pdf=${out}`,
    `file://${page}`,
  ],
  { stdio: ["ignore", "ignore", "inherit"] },
)
if (process.env.KEEP_HTML === "1") console.log(page)
else rmSync(dir, { recursive: true, force: true })
console.log(`wrote ${out}`)
