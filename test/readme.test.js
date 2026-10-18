import assert from "node:assert/strict"
import { test } from "node:test"
import { readSummary, renderReadme, resolveImage, resolveLink } from "../lib/readme.js"

const ref = { owner: "LaggySon", repo: "demo", branch: "main" }

test("takes the README's name and first prose paragraphs", () => {
  const md = "# Transitmaps\n\nA transit map built with Phoenix LiveView and MapLibre GL.\n\n## Running\n\nmix setup\n"
  const s = readSummary(md, { repoName: "transitmaps" })
  assert.equal(s.title, "Transitmaps")
  assert.equal(s.template, null)
  assert.equal(s.summary, "A transit map built with Phoenix LiveView and MapLibre GL.")
})

test("keeps the name before a tagline", () => {
  const s = readSummary("# bbagent — autonomous ESPN Fantasy Baseball manager\n\nA competitive agent that owns one team.\n", {
    repoName: "bbagent",
  })
  assert.equal(s.title, "bbagent")
})

test("recognizes generator templates", () => {
  assert.equal(readSummary("# Create T3 App\n\nThis is a T3 Stack project.\n", { repoName: "scoreboardish" }).template, "Create T3 App")
  assert.equal(readSummary("# Create T3 App\n\nThis is a T3 Stack project.\n", { repoName: "scoreboardish" }).title, null)
  const phoenix = readSummary("# Wheelflats\n\nTo start your Phoenix server:\n\n* Run `mix setup`\n", { repoName: "wheelflats" })
  assert.equal(phoenix.template, "Phoenix")
  assert.equal(phoenix.title, "Wheelflats")
  assert.equal(phoenix.summary, null)
  const next = readSummary("This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](x).\n", {
    repoName: "moist-meter",
  })
  assert.equal(next.template, "create-next-app")
})

test("skips badges, link rows, and setup steps", () => {
  const md = [
    "# Demo",
    "[![CI](https://github.com/x/y/actions/workflows/ci.yml/badge.svg)](https://github.com/x/y/actions)",
    "[Docs](https://a.example) · [Site](https://b.example)",
    "To run our application, you'll need to install our dependencies first.",
    "Demo turns a spreadsheet into a live scoreboard.",
  ].join("\n\n")
  assert.equal(readSummary(md, { repoName: "demo" }).summary, "Demo turns a spreadsheet into a live scoreboard.")
})

test("does not repeat the GitHub description", () => {
  const md = "# Staffer\n\nStaffer helps you staff events.\n\n## Technologies\n"
  assert.equal(readSummary(md, { repoName: "Staffer", description: "Staffer helps you staff events." }).summary, null)
})

test("resolves relative links and images against the repository", () => {
  assert.equal(resolveLink("docs/a.md", ref), "https://github.com/LaggySon/demo/blob/main/docs/a.md")
  assert.equal(resolveLink("#quick-start", ref), "#quick-start")
  assert.equal(resolveLink("https://x.example/", ref), "https://x.example/")
  assert.equal(resolveImage("./img/shot.png", ref), "https://raw.githubusercontent.com/LaggySon/demo/main/img/shot.png")
})

test("renders safely: no scripts, no handlers, no badges, headings moved down", () => {
  const md = [
    "# Demo",
    "## Quick start",
    '<script>alert(1)</script><img src="x.png" onerror="alert(1)">',
    "[![build](https://img.shields.io/badge/build-passing-green)](https://ci.example)",
    "[link](javascript:alert(1))",
  ].join("\n\n")
  const out = renderReadme(md, ref)
  assert.doesNotMatch(out, /<script|onerror|javascript:|shields\.io/)
  assert.doesNotMatch(out, /<h1|Demo<\/h2>/)
  assert.match(out, /<h3 id="quick-start">Quick start <a class="lg-anchor" href="#quick-start"/)
  assert.match(out, /src="https:\/\/raw\.githubusercontent\.com\/LaggySon\/demo\/main\/x\.png"/)
})
