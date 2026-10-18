// Laggish design guide: run contrast-audit.js headless on every mode and width the checklist names.
//   npm install --no-save puppeteer      (or puppeteer-core, and set CHROME_PATH)
//   node audit.mjs http://localhost:4000/ http://localhost:4000/settings
// Environment:
//   CHROME_PATH   a Chrome or Chromium to use instead of puppeteer's own
//   COOKIE        "name=value" sent with every page, to audit signed-in pages
//   DENSITY       "comfortable" applies the section 5.1 example override first
//   NO_SANDBOX    "1" in a container that cannot run Chrome's sandbox
// Prints one line per page, mode, and width, and exits 1 if anything fails.
import { readFileSync } from "node:fs"

const urls = process.argv.slice(2)
if (urls.length === 0) {
  console.error("usage: node audit.mjs <url> [<url> ...]")
  process.exit(2)
}

const audit = readFileSync(new URL("./contrast-audit.js", import.meta.url), "utf8")
let puppeteer
try {
  puppeteer = (await import("puppeteer")).default
} catch {
  puppeteer = (await import("puppeteer-core")).default
}

const comfortable = ":root {\n--text-xs: 0.75rem;\n--text-sm: 0.875rem;\n--text-md: 1rem;\n--text-lg: clamp(1.15rem, 2.4vw, 1.4rem);\n--control-h: 2.25rem;\n--control-h-compact: 2rem;\n--control-h-sm: 1.75rem;\n--row-h: 2.5rem;\n--topbar-height: 3rem;\n--page-pad-x: clamp(0.75rem, 2vw, 1.5rem);\n--page-pad-y: 1rem;\n}"
const modes = [
  { name: "light", scheme: "light" },
  { name: "dark", scheme: "dark" },
  { name: "data-theme dark, light OS", scheme: "light", theme: "dark" },
  { name: "data-theme light, dark OS", scheme: "dark", theme: "light" },
]
const widths = [1440, 375]

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  headless: true,
  args: process.env.NO_SANDBOX === "1" ? ["--no-sandbox"] : [],
})

let failed = 0
for (const url of urls) {
  for (const width of widths) {
    for (const mode of modes) {
      const page = await browser.newPage()
      await page.setViewport({ width, height: 900 })
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: mode.scheme }])
      if (process.env.COOKIE) {
        const [name, ...value] = process.env.COOKIE.split("=")
        await page.setCookie({ name, value: value.join("="), url })
      }
      await page.goto(url, { waitUntil: "networkidle2" })
      await page.evaluate(
        async (theme, css) => {
          if (theme) document.documentElement.setAttribute("data-theme", theme)
          if (css) {
            const style = document.createElement("style")
            style.textContent = css
            document.head.append(style)
          }
          await document.fonts.ready
        },
        mode.theme ?? null,
        process.env.DENSITY === "comfortable" ? comfortable : null,
      )
      // Let the 120ms color fades settle before reading colors.
      await new Promise((resolve) => setTimeout(resolve, 300))

      const failures = await page.evaluate(audit)
      const overflow = width === 375
        ? await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
        : 0
      const label = `${url} · ${width}px · ${mode.name}`

      if (failures.length > 0 || overflow > 0) {
        failed += 1
        console.log(`FAIL ${label}`)
        for (const f of failures) console.log(`  ${f.ratio}:1, needs ${f.needed}: "${f.text}" (${f.className})`)
        if (overflow > 0) console.log(`  scrolls ${overflow}px sideways`)
      } else {
        console.log(`ok   ${label}`)
      }
      await page.close()
    }
  }
}

await browser.close()
process.exit(failed > 0 ? 1 : 0)
