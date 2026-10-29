import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { test } from "node:test"
import { handle } from "../lib/router.js"
import { allCredits, grandFinals, observed, orgs, produced, selected } from "../lib/resume.js"

test("every credit has a month, a title, a role, and a video", () => {
  for (const c of allCredits()) {
    assert.match(c.month, /^20\d\d-\d\d$/)
    assert.ok(c.title && c.role, JSON.stringify(c))
    assert.ok(c.vods.length > 0, c.title)
  }
})

test("the counts come from the credits", () => {
  const all = allCredits()
  assert.equal(all.length, 103)
  assert.equal(produced(all), 94)
  assert.equal(observed(all), 15)
  assert.equal(grandFinals(all), 10)
  assert.deepEqual(orgs.map((o) => o.groups.flatMap((g) => g.credits).length), [92, 11])
})

test("each selected broadcast is one of the credits", () => {
  const vods = new Set(allCredits().flatMap((c) => c.vods))
  for (const s of selected) assert.ok(vods.has(s.vod), s.text)
})

test("/resume renders without reading GitHub", async () => {
  const realFetch = globalThis.fetch
  globalThis.fetch = () => Promise.reject(new Error("no network in this test"))
  try {
    const response = await handle(new Request("http://localhost/resume"))
    assert.equal(response.status, 200)
    const body = await response.text()
    assert.match(body, /Michael Richards/)
    assert.match(body, /href="\/resume\.pdf"/)
    assert.match(body, /aria-current="page">Resume/)
  } finally {
    globalThis.fetch = realFetch
  }
})

test("the PDF is in the repository", () => {
  assert.ok(existsSync(new URL("../public/resume.pdf", import.meta.url)))
})
