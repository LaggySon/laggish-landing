// Reading a README: the project's own name, a short summary for the list, the
// framework template it may still be, and the full text as safe HTML.
import { Marked, Lexer } from "marked"
import sanitizeHtml from "sanitize-html"

// Unedited READMEs from project generators. They say nothing about the project.
const TEMPLATES = [
  { name: "Create T3 App", test: /create t3 app|create-t3-app/i },
  { name: "create-next-app", test: /bootstrapped with \[?`?create-next-app/i },
  { name: "Create React App", test: /bootstrapped with \[?create react app|getting started with create react app/i },
  { name: "Phoenix", test: /to start your phoenix server/i },
  { name: "create-svelte", test: /^create-svelte$|everything you need to build a svelte project/i },
  { name: "Vite", test: /this template provides a minimal setup to get .+ working in vite/i },
  { name: "Vue and Vite", test: /this template should help get you started developing with vue/i },
  { name: "Astro", test: /astro starter kit/i },
  { name: "Remix", test: /welcome to remix/i },
]

const templateOf = (text) => TEMPLATES.find((t) => t.test.test(text))?.name ?? null

// Plain text of inline tokens: links keep their words, images and HTML drop out
const plain = (tokens = []) =>
  tokens
    .map((t) => {
      if (t.type === "image" || t.type === "html") return ""
      if (t.type === "br") return " "
      if (t.tokens) return plain(t.tokens)
      if (t.type === "codespan" || t.type === "text" || t.type === "escape") return decode(t.text)
      return ""
    })
    .join("")

const decode = (text) =>
  text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")

const squash = (text) => text.replace(/\s+/g, " ").trim()
const normalize = (text) => (text ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")

// A paragraph that is only badges, images, or a row of links is not prose
const isProse = (token) => {
  if (token.type !== "paragraph") return false
  const text = squash(plain(token.tokens))
  if (text.length < 20) return false
  const linkText = squash(plain((token.tokens ?? []).filter((t) => t.type === "link")))
  if (linkText.length > text.length * 0.8) return false
  // Setup steps say how to run it, not what it is
  if (/^(to (run|install|start|use|build|get started)|install|run |first,|clone|requires? |you('ll| will) need)/i.test(text)) return false
  return /[a-z]/i.test(text)
}

// Turn three periods into the ellipsis character (DESIGN.md 10.3)
const tidy = (text) => text.replace(/\.\.\.(?!\.)/g, "…")

/**
 * Read the parts of a README the list needs.
 * Returns { title, template, summary }.
 */
export const readSummary = (markdown, { repoName, description } = {}) => {
  if (!markdown) return { title: null, template: null, summary: null }
  const tokens = new Lexer().lex(markdown)
  let title = null
  let template = null
  const paragraphs = []
  let sawProse = false

  for (const token of tokens) {
    if (token.type === "heading") {
      const text = squash(plain(token.tokens))
      if (!sawProse && templateOf(text)) template = templateOf(text)
      if (token.depth === 1 && title === null) title = text
      // Stop at the first section heading once some prose is in
      if (token.depth >= 2 && paragraphs.length > 0) break
      continue
    }
    if (token.type === "html" && !sawProse) {
      // <h1>Name</h1> or <p>…</p> in an HTML README
      const h1 = token.text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
      if (h1 && title === null) title = squash(h1[1].replace(/<[^>]+>/g, ""))
      continue
    }
    if (token.type === "paragraph" && !sawProse && templateOf(plain(token.tokens))) {
      template = templateOf(plain(token.tokens))
      break
    }
    if (!isProse(token)) {
      if (paragraphs.length > 0 && token.type !== "space") break
      continue
    }
    const text = squash(plain(token.tokens))
    if (!sawProse && templateOf(text)) template = templateOf(text)
    sawProse = true
    if (template) break
    paragraphs.push(tidy(text))
    if (paragraphs.join(" ").length > 240) break
  }

  // The README's own spelling of the project's name ("Transitmaps", "aptscore"),
  // but not a template's heading ("Create T3 App") or a tagline
  if (title) title = title.split(/\s+[—–-]\s+|:\s+/)[0].trim()
  const a = normalize(title)
  const b = normalize(repoName)
  if (!a || !(a === b || (a.length >= 4 && b.includes(a)) || (b.length >= 4 && a.includes(b) && a.length <= b.length + 4))) {
    title = null
  }

  let summary = template ? null : paragraphs.join(" ") || null
  // Do not repeat the GitHub description
  if (summary && description && normalize(summary).startsWith(normalize(description))) {
    const rest = paragraphs.slice(1).join(" ")
    summary = rest || null
  }
  if (summary && summary.length > 420) summary = `${summary.slice(0, 417).replace(/\s+\S*$/, "")}…`
  return { title, template, summary }
}

// ---------- Full README as HTML ----------

const RESERVED_IDS = new Set(["main", "readme", "facts", "commits", "top"])

const slugger = () => {
  const seen = new Map()
  return (text) => {
    let slug = text
      .toLowerCase()
      .trim()
      .replace(/<[^>]+>/g, "")
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s/g, "-")
    if (!slug) slug = "section"
    const base = slug
    let n = seen.get(base) ?? 0
    while (RESERVED_IDS.has(slug) || (n > 0 && seen.has(slug))) {
      n += 1
      slug = `${base}-${n}`
    }
    seen.set(base, n)
    seen.set(slug, 0)
    return slug
  }
}

// Status badges are decoration in the README's own colors; they carry no content here
const isBadge = (src = "") =>
  /shields\.io|badge\.svg|badgen\.net|\/badge\/|travis-ci|circleci\.com\/.+\.svg|codecov\.io\/.+\.svg|vercel\.com\/button|deploy-button/i.test(
    src,
  )

const isAbsolute = (url) => /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//")

export const resolveLink = (url, { owner, repo, branch }) => {
  if (!url || isAbsolute(url) || url.startsWith("#") || url.startsWith("mailto:")) return url
  const path = url.replace(/^\.\//, "").replace(/^\//, "")
  return `https://github.com/${owner}/${repo}/blob/${branch}/${path}`
}

export const resolveImage = (url, { owner, repo, branch }) => {
  if (!url || isAbsolute(url) || url.startsWith("data:")) return url
  const path = url.replace(/^\.\//, "").replace(/^\//, "")
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
}

/**
 * Render a README to sanitized HTML for a page that already has an <h1>.
 * Headings move down one level and get anchors; the first <h1> is dropped.
 */
export const renderReadme = (markdown, repoRef) => {
  const slug = slugger()
  let droppedTitle = false
  const marked = new Marked({ gfm: true })

  marked.use({
    walkTokens(token) {
      if (token.type === "link") token.href = resolveLink(token.href, repoRef)
      if (token.type === "image") token.href = resolveImage(token.href, repoRef)
    },
    renderer: {
      heading({ tokens, depth }) {
        if (depth === 1 && !droppedTitle) {
          droppedTitle = true
          return ""
        }
        const inner = this.parser.parseInline(tokens)
        const id = slug(plain(tokens))
        const level = Math.min(depth + 1, 6)
        return `<h${level} id="${id}">${inner} <a class="lg-anchor" href="#${id}" aria-label="Link to this section">#</a></h${level}>\n`
      },
      code({ text }) {
        const escaped = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
        return `<pre class="ui-pre"><code>${escaped}</code></pre>\n`
      },
      table(token) {
        const cell = (c, tag) => `<${tag}>${this.parser.parseInline(c.tokens)}</${tag}>`
        const head = `<tr>${token.header.map((c) => cell(c, "th")).join("")}</tr>`
        const body = token.rows.map((row) => `<tr>${row.map((c) => cell(c, "td")).join("")}</tr>`).join("")
        return `<div class="ui-table-wrap"><table class="ui-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>\n`
      },
      image({ href, title, text }) {
        if (isBadge(href)) return ""
        const t = title ? ` title="${title}"` : ""
        return `<img src="${href}" alt="${text}"${t} loading="lazy">`
      },
    },
  })

  const dirty = marked.parse(markdown)
  return sanitizeHtml(dirty, {
    allowedTags: [
      "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "blockquote", "ul", "ol", "li",
      "a", "strong", "b", "em", "i", "del", "s", "ins", "sup", "sub", "kbd", "code", "pre",
      "img", "table", "thead", "tbody", "tr", "th", "td", "div", "span", "details", "summary",
      "dl", "dt", "dd", "input",
    ],
    allowedAttributes: {
      a: ["href", "title", "id", "aria-label", "class"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      h2: ["id"], h3: ["id"], h4: ["id"], h5: ["id"], h6: ["id"],
      input: ["type", "checked", "disabled"],
      pre: ["class"],
      div: ["class"],
      table: ["class"],
    },
    allowedClasses: {
      a: ["lg-anchor"],
      pre: ["ui-pre"],
      div: ["ui-table-wrap"],
      table: ["ui-table"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      // Raw <h1> in an HTML README would be a second page title
      h1: "h2",
      img: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, src: resolveImage(attribs.src, repoRef), loading: "lazy" },
      }),
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, href: resolveLink(attribs.href, repoRef) },
      }),
      // GitHub task lists: keep the box, never let it be ticked here
      input: (tagName, attribs) => ({ tagName, attribs: { ...attribs, disabled: "" } }),
    },
    exclusiveFilter: (frame) => {
      if (frame.tag === "img") return isBadge(frame.attribs.src) || !frame.attribs.src
      if (frame.tag === "input") return frame.attribs.type !== "checkbox"
      // A link that only held badges is now empty
      if (frame.tag === "a") return !frame.text.trim() && frame.mediaChildren.length === 0
      return false
    },
  })
}
