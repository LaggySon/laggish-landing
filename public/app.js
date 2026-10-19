// laggi.sh: the few things the server cannot do. The page works without this file.

const pad = (n) => String(n).padStart(2, "0")

// ---------- Local times (DESIGN.md 11) ----------

const localParts = (d) => ({
  y: d.getFullYear(),
  mo: pad(d.getMonth() + 1),
  d: pad(d.getDate()),
  h: pad(d.getHours()),
  mi: pad(d.getMinutes()),
  s: pad(d.getSeconds()),
})

const formats = {
  date: (p) => `${p.y}-${p.mo}-${p.d}`,
  datetime: (p) => `${p.y}-${p.mo}-${p.d} ${p.h}:${p.mi}:${p.s}`,
  event: (p, n) => {
    if (p.y === n.y && p.mo === n.mo && p.d === n.d) return `${p.h}:${p.mi}:${p.s}`
    if (p.y === n.y) return `${p.mo}-${p.d} ${p.h}:${p.mi}:${p.s}`
    return `${p.y}-${p.mo}-${p.d} ${p.h}:${p.mi}:${p.s}`
  },
}

const localizeTimes = () => {
  const now = localParts(new Date())
  for (const el of document.querySelectorAll("time[data-format]")) {
    const date = new Date(el.getAttribute("datetime"))
    if (Number.isNaN(date.getTime())) continue
    const format = formats[el.dataset.format]
    if (format) el.textContent = format(localParts(date), now)
    if (!el.title) el.title = date.toString()
  }
}

// ---------- Age of the data: "checked 4m ago" ----------

const ageText = (seconds) => {
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const tickAges = () => {
  for (const el of document.querySelectorAll(".ui-age[data-since]")) {
    const seconds = Math.max(0, Math.round((Date.now() - new Date(el.dataset.since).getTime()) / 1000))
    el.textContent = `checked ${ageText(seconds)}`
    el.toggleAttribute("data-stale", seconds > Number(el.dataset.staleAfter || Infinity))
  }
}

// ---------- Cards or list (DESIGN.md 7.3, kept in localStorage per 12.2) ----------

const VIEW_KEY = "laggish:view"

const setView = (view, { focus = false } = {}) => {
  document.documentElement.dataset.view = view
  for (const group of document.querySelectorAll("[data-view-switch]")) {
    for (const option of group.querySelectorAll("[data-view-choice]")) {
      const on = option.dataset.viewChoice === view
      option.setAttribute("aria-checked", String(on))
      option.tabIndex = on ? 0 : -1
      if (on && focus) option.focus()
    }
  }
}

const initViewSwitch = () => {
  const group = document.querySelector("[data-view-switch]")
  if (!group) return
  const options = [...group.querySelectorAll("[data-view-choice]")]
  setView(document.documentElement.dataset.view || "cards")
  const choose = (view, focus) => {
    setView(view, { focus })
    try {
      localStorage.setItem(VIEW_KEY, view)
    } catch {}
  }
  group.addEventListener("click", (event) => {
    const option = event.target.closest("[data-view-choice]")
    if (option) choose(option.dataset.viewChoice, false)
  })
  group.addEventListener("keydown", (event) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (!step) return
    event.preventDefault()
    const current = options.findIndex((o) => o.getAttribute("aria-checked") === "true")
    const next = options[(current + step + options.length) % options.length]
    choose(next.dataset.viewChoice, true)
  })
  // Two tabs agree
  window.addEventListener("storage", (event) => {
    if (event.key === VIEW_KEY && (event.newValue === "cards" || event.newValue === "list")) setView(event.newValue)
  })
}

// ---------- Filter (state in the URL, DESIGN.md 12.2) ----------

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

const initFilter = () => {
  const form = document.querySelector("[data-filter-form]")
  const input = form?.querySelector("[data-filter]")
  if (!input) return
  const count = document.querySelector("[data-filter-count]")
  const empty = document.querySelector("[data-filter-empty]")
  const echo = document.querySelector("[data-filter-echo]")
  const others = document.querySelector("[data-others]")
  const othersCount = document.querySelector("[data-others-count]")
  const projectItems = [...document.querySelectorAll(".lg-view-cards [data-search]")]
  const projectRows = [...document.querySelectorAll(".lg-view-list [data-search]")]
  const otherRows = others ? [...others.querySelectorAll("[data-search]")] : []
  const domain = othersCount?.textContent.match(/not on (\S+)$/)?.[1] ?? ""
  let othersOpenedByFilter = false

  const apply = () => {
    const q = input.value.trim().toLowerCase()
    const words = q.split(/\s+/).filter(Boolean)
    const hit = (el) => words.every((w) => el.dataset.search.includes(w))
    let shown = 0
    for (const el of projectItems) {
      const on = hit(el)
      el.hidden = !on
      if (on) shown++
    }
    for (const el of projectRows) el.hidden = !hit(el)
    let otherShown = 0
    for (const el of otherRows) {
      const on = hit(el)
      el.hidden = !on
      if (on) otherShown++
    }
    if (count) {
      count.textContent = q && otherRows.length
        ? `${plural(shown, "project", "projects")} · ${plural(otherShown, "other repository", "other repositories")}`
        : plural(shown, "project", "projects")
    }
    if (empty) {
      empty.hidden = !(q && shown === 0)
      if (echo) echo.textContent = input.value.trim()
    }
    if (othersCount) {
      othersCount.textContent = `${plural(q ? otherShown : otherRows.length, "public repository", "public repositories")} not on ${domain}`
    }
    // Show matches that are only among the other repositories, and fold the
    // panel again when the filter that opened it is cleared
    if (others) {
      if (q && otherShown > 0 && !others.open) {
        others.open = true
        othersOpenedByFilter = true
      } else if (!q && othersOpenedByFilter) {
        others.open = false
        othersOpenedByFilter = false
      }
    }
    const url = new URL(location.href)
    if (q) url.searchParams.set("q", input.value.trim())
    else url.searchParams.delete("q")
    history.replaceState(null, "", url)
  }

  input.addEventListener("input", apply)
  form.addEventListener("submit", (event) => {
    event.preventDefault()
    apply()
  })
  document.querySelector("[data-filter-clear]")?.addEventListener("click", (event) => {
    event.preventDefault()
    input.value = ""
    apply()
    input.focus()
  })
  // "/" focuses the filter unless the focus is already in a field (DESIGN.md 12.4)
  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return
    const t = event.target
    if (t.closest?.("input, textarea, select, [contenteditable]")) return
    event.preventDefault()
    input.focus()
    input.select()
  })
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && input.value) {
      input.value = ""
      apply()
    }
  })
  // The back/forward cache can restore an old field value
  window.addEventListener("pageshow", () => {
    if (input.value.trim() !== (new URL(location.href).searchParams.get("q") ?? "")) apply()
  })
}

// ---------- Clamped text expands in place (DESIGN.md 7.20) ----------

const initExpanders = () => {
  const items = [...document.querySelectorAll("[data-expand]")]
  if (!items.length) return
  const measure = (el) => {
    if (el.getAttribute("aria-expanded") === "true") return
    // A few pixels of slack: line boxes round, and a fully shown last line can measure 1–2px over
    const clipped = el.scrollHeight > el.clientHeight + 4 || el.scrollWidth > el.clientWidth + 4
    if (clipped) {
      el.setAttribute("role", "button")
      el.setAttribute("tabindex", "0")
      el.setAttribute("aria-expanded", "false")
      el.title = el.textContent.trim()
    } else {
      el.removeAttribute("role")
      el.removeAttribute("tabindex")
      el.removeAttribute("aria-expanded")
      el.removeAttribute("title")
    }
  }
  const toggle = (el) => {
    if (!el.hasAttribute("aria-expanded")) return
    el.setAttribute("aria-expanded", String(el.getAttribute("aria-expanded") !== "true"))
  }
  const observer = new ResizeObserver((entries) => entries.forEach((e) => measure(e.target)))
  // The clamped box keeps its size when the web font arrives, so measure again then
  document.fonts?.ready.then(() => items.forEach(measure))
  for (const el of items) {
    observer.observe(el)
    el.addEventListener("click", () => toggle(el))
    el.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return
      if (!el.hasAttribute("aria-expanded")) return
      event.preventDefault()
      toggle(el)
    })
  }
}

localizeTimes()
tickAges()
initExpanders()
setInterval(tickAges, 1000)
initViewSwitch()
initFilter()
