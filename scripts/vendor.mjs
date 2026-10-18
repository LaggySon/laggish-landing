// Bundles sanitize-html into one CommonJS file, lib/vendor/sanitize-html.cjs.
// Why: sanitize-html require()s htmlparser2, which is ESM-only from v10.
// Node allows that, but Vercel's function loader does not, so the site 500s.
// Run `npm run vendor` after updating sanitize-html, and commit the result.
import { build } from "esbuild"
import { readFileSync } from "node:fs"

const { version } = JSON.parse(readFileSync("node_modules/sanitize-html/package.json", "utf8"))

await build({
  entryPoints: ["node_modules/sanitize-html/index.js"],
  outfile: "lib/vendor/sanitize-html.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  legalComments: "inline",
  banner: { js: `// sanitize-html ${version} and its dependencies, bundled by scripts/vendor.mjs. Do not edit.` },
  logLevel: "info",
})
