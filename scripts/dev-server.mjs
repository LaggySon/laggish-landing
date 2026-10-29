// Local server: serves public/ and sends every other path to the same handler
// Vercel runs. node scripts/dev-server.mjs [port]
import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { extname, join, normalize } from "node:path"
import { handle } from "../lib/router.js"

const port = Number(process.argv[2] ?? process.env.PORT ?? 4100)
const root = new URL("../public/", import.meta.url).pathname
const types = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".pdf": "application/pdf",
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`)
  const file = normalize(join(root, url.pathname))
  if (file.startsWith(root) && extname(file) in types) {
    try {
      const body = await readFile(file)
      res.writeHead(200, { "Content-Type": types[extname(file)], "Cache-Control": "no-cache" })
      return res.end(body)
    } catch {}
  }
  const started = performance.now()
  const response = await handle(new Request(url, { method: req.method, headers: req.headers }))
  res.writeHead(response.status, Object.fromEntries(response.headers))
  res.end(Buffer.from(await response.arrayBuffer()))
  console.log(response.status, url.pathname + url.search, `${Math.round(performance.now() - started)}ms`)
}).listen(port, () => console.log(`http://localhost:${port}`))
