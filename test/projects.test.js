import assert from "node:assert/strict"
import { test } from "node:test"
import { formatEventTime, plural } from "../lib/format.js"
import { html } from "../lib/html.js"
import { findLiveLink, pickListed } from "../lib/projects.js"
import { wordFor } from "../lib/status.js"

test("finds a laggi.sh link in a README before anything else", () => {
  const md = "[Docs](https://hexdocs.pm/x)\n\n[Live production map](https://transitmaps.laggi.sh)"
  assert.equal(findLiveLink(md), "https://transitmaps.laggi.sh/")
})

test("ignores dev hosts, framework guides, and GitHub links", () => {
  assert.equal(findLiveLink("The dev deployment at `dev.show.laggi.sh` and https://dev.show.laggi.sh"), null)
  assert.equal(findLiveLink("Please [check our deployment guides](https://hexdocs.pm/phoenix/deployment.html)."), null)
  assert.equal(findLiveLink("[Live demo](https://github.com/x/y)"), null)
})

test("takes a link named live or demo on another host", () => {
  assert.equal(findLiveLink("Try the [live demo](https://thing.vercel.app)."), "https://thing.vercel.app/")
})

test("escapes interpolated values", () => {
  const name = '<img src=x onerror="1">'
  assert.equal(String(html`<p title="${name}">${name}</p>`), '<p title="&lt;img src=x onerror=&quot;1&quot;&gt;">&lt;img src=x onerror=&quot;1&quot;&gt;</p>')
})

test("state words follow the precedence", () => {
  assert.equal(wordFor({ health: { state: "up" } }), "Up")
  assert.equal(wordFor({ health: { state: "down" } }), "Down")
  assert.equal(wordFor({ health: null }), "No site")
  assert.equal(wordFor({ archived: true, health: { state: "down" } }), "Archived · Down")
})

test("formats counts and event times", () => {
  assert.equal(plural(1, "project"), "1 project")
  assert.equal(plural(3, "other repository", "other repositories"), "3 other repositories")
  const now = new Date("2026-10-18T12:00:00Z")
  assert.equal(formatEventTime("2026-10-18T09:02:15Z", now), "09:02:15")
  assert.equal(formatEventTime("2026-10-13T09:02:15Z", now), "10-13 09:02:15")
  assert.equal(formatEventTime("2025-12-30T09:02:15Z", now), "2025-12-30 09:02:15")
})

test("lists projects and other repositories by the rules when no names are set", () => {
  const all = [
    { name: "a", laggish: true, pushedAt: "2026-01-01" },
    { name: "b", laggish: false, pushedAt: "2026-02-01" },
    { name: "c", laggish: true, pushedAt: "2026-03-01" },
  ]
  const { projects, others } = pickListed(all)
  assert.deepEqual(projects.map((p) => p.name), ["c", "a"])
  assert.deepEqual(others.map((p) => p.name), ["b"])
})

test("lists only the named repositories, in any case, when names are set", () => {
  const all = [
    { name: "Transitmaps", laggish: true, pushedAt: "2026-01-01" },
    { name: "showish", laggish: false, pushedAt: "2026-02-01" },
    { name: "aptscore", laggish: true, pushedAt: "2026-03-01" },
  ]
  const { projects, others } = pickListed(all, ["transitmaps", "Showish"])
  assert.deepEqual(projects.map((p) => p.name), ["showish", "Transitmaps"])
  assert.ok(projects.every((p) => p.laggish))
  assert.deepEqual(others, [])
})
