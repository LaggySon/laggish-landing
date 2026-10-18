import { test } from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"

// Vercel's function loader cannot require() an ES module, even on Node 24.
// Loading the entry point with that turned off catches a dependency that needs it.
test("the function loads without require() of ES modules", () => {
  const out = execFileSync(
    process.execPath,
    ["--no-experimental-require-module", "-e", 'import("./api/index.js").then(() => console.log("ok"))'],
    { encoding: "utf8" },
  )
  assert.equal(out.trim(), "ok")
})
