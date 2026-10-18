// Contrast audit for a page built with the Laggish design guide. Paste into the browser console, or run it from a test.
// It checks every visible element that owns text against the background it actually sits on,
// including stacked translucent tints and the fill under a progress-bar label.
// It returns the failures. An empty array is a pass. Run it in light and in dark mode.
(() => {
  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext("2d", { willReadFrequently: true })
  function parse(color) {
    let match = color.match(/^rgba?\(([^)]+)\)$/)
    if (match) {
      const p = match[1].split(/[\s,/]+/).filter(Boolean).map(Number)
      return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]
    }
    match = color.match(/^color\(srgb ([^)]+)\)$/)
    if (match) {
      const p = match[1].split(/[\s/]+/).filter(Boolean).map(Number)
      return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1]
    }
    // Any other format (oklab, oklch, lab): let the canvas convert it to sRGB.
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = color
    context.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
    return [r, g, b, a / 255]
  }
  const over = (top, bottom) => {
    const a = top[3]
    return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1]
  }
  const luminance = (c) => {
    const f = (v) => {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])
  }
  const ratio = (a, b) => {
    const x = luminance(a)
    const y = luminance(b)
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
  }
  function backgroundOf(element) {
    const layers = []
    let node = element
    while (node && node.nodeType === 1) {
      const c = parse(getComputedStyle(node).backgroundColor)
      if (c && c[3] > 0) {
        layers.push(c)
        if (c[3] >= 1) break
      }
      node = node.parentElement
    }
    let base = layers.length && layers[layers.length - 1][3] >= 1
      ? layers.pop()
      : parse(getComputedStyle(document.body).backgroundColor)
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base)
    return base
  }

  // Stop color fades so every element reports its final color.
  const freeze = document.createElement("style")
  freeze.textContent = "*, *::before, *::after { transition: none !important; }"
  document.head.appendChild(freeze)
  document.body.getBoundingClientRect()

  const failures = []
  for (const element of document.querySelectorAll("body *")) {
    if (element.closest("dialog:not([open]), script, style, :disabled, .ui-log-line--dim")) continue
    const ownsText = [...element.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    if (!ownsText) continue
    const box = element.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) continue
    const style = getComputedStyle(element)
    if (style.visibility === "hidden") continue

    const background = backgroundOf(element)
    // SVG text paints with fill, not color.
    const fg = parse(element instanceof SVGElement ? style.fill : style.color)
    const text = fg[3] < 1 ? over(fg, background) : fg
    let worst = ratio(text, background)
    let where = "background"
    // A progress label has two copies: one over the track, one clipped to the fill.
    // A single label (no on-fill copy) must pass on both.
    if (element.classList.contains("ui-progress-label")) {
      const bar = element.parentElement
      const fill = bar.querySelector(".ui-progress-fill")
      const hasOnFillCopy = bar.querySelector(".ui-progress-label--on-fill") !== null
      const isOnFillCopy = element.classList.contains("ui-progress-label--on-fill")
      const fillColor = over(parse(getComputedStyle(fill).backgroundColor), background)
      if (isOnFillCopy) {
        worst = ratio(text, fillColor)
        where = "progress fill"
      } else if (!hasOnFillCopy) {
        const onFill = ratio(text, fillColor)
        if (onFill < worst) {
          worst = onFill
          where = "progress fill"
        }
      }
    }
    const size = parseFloat(style.fontSize)
    const weight = parseInt(style.fontWeight, 10)
    const isLarge = size >= 24 || (size >= 18.66 && weight >= 700)
    const needed = isLarge ? 3 : 4.5
    if (worst < needed) {
      failures.push({
        text: element.textContent.trim().slice(0, 40),
        className: String(element.className.baseVal ?? element.className).slice(0, 60),
        ratio: Number(worst.toFixed(2)),
        needed,
        where,
      })
    }
  }
  freeze.remove()
  return failures
})()
