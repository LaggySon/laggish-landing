// One handler for every page: Request in, Response out.
import { config } from "./config.js"
import { commitsFor, findProject, getData, readmeHtmlFor } from "./projects.js"
import { resumePage } from "./resume-view.js"
import { errorPage, indexPage, notFoundPage, projectPage } from "./views.js"

const DAY = 86400

// The CDN serves a page for config.freshSeconds, then keeps serving it while it
// fetches a new one in the background, so no visitor waits for GitHub.
const cacheFor = (seconds) => `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${DAY}`

const page = (body, { status = 200, cache = cacheFor(config.freshSeconds) } = {}) =>
  new Response(String(body), {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": cache,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  })

const json = (value, { status = 200, cache = cacheFor(config.freshSeconds) } = {}) =>
  new Response(JSON.stringify(value, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache,
      "Access-Control-Allow-Origin": "*",
    },
  })

// The public shape of a project: everything but the README text
const publicProject = ({ readme, self, ...p }) => ({
  ...p,
  readme: readme ? { path: readme.path, bytes: readme.bytes } : null,
})

const pathOf = (url) => {
  // On Vercel every page is rewritten to /api?path=…; locally it arrives as is
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return url.searchParams.get("path") || "/"
  return url.pathname
}

export const handle = async (request) => {
  const url = new URL(request.url)
  let path
  try {
    path = decodeURIComponent(pathOf(url)).replace(/\/+$/, "") || "/"
  } catch {
    path = pathOf(url) // a malformed escape: shown as typed on the not-found page
  }

  // The resume does not come from GitHub, so it stays up when GitHub is down
  if (path === "/resume") return page(resumePage(), { cache: cacheFor(DAY) })

  let data
  try {
    data = await getData()
  } catch (error) {
    if (path === "/projects.json") return json({ error: error.message }, { status: 503, cache: "no-store" })
    return page(errorPage(error.message, error.rateLimit), { status: 503, cache: "no-store" })
  }
  // While GitHub fails, keep the last good list, but ask again soon
  const cache = data.error ? cacheFor(60) : undefined

  if (path === "/") {
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100)
    return page(indexPage(data, { q }), { cache })
  }

  if (path === "/projects.json") {
    return json(
      {
        owner: data.owner,
        domain: data.domain,
        fetchedAt: data.fetchedAt,
        error: data.error,
        projects: data.projects.map(publicProject),
        others: data.others.map(publicProject),
      },
      { cache },
    )
  }

  const name = path.slice(1)
  if (/^[A-Za-z0-9._-]{1,100}$/.test(name)) {
    const project = findProject(data, name)
    if (project) {
      // Old links in another case land on the repository's own spelling
      if (project.name !== name) return Response.redirect(new URL(`/${project.name}`, url.origin), 301)
      const commits = await commitsFor(project)
      return page(projectPage(data, project, { readmeHtml: readmeHtmlFor(project), commits }), { cache })
    }
  }

  return page(notFoundPage(data, name), { status: 404, cache: cacheFor(60) })
}
