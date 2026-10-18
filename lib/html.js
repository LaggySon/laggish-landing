// A tiny HTML builder: interpolated values are escaped unless they are already
// Html (from another html`` call or raw()). Arrays are joined.
export class Html {
  constructor(value) {
    this.value = value
  }
  toString() {
    return this.value
  }
}

export const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

const render = (value) => {
  if (value === null || value === undefined || value === false) return ""
  if (value instanceof Html) return value.value
  if (Array.isArray(value)) return value.map(render).join("")
  return escape(value)
}

export const html = (strings, ...values) => {
  let out = strings[0]
  for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1]
  return new Html(out)
}

export const raw = (value) => new Html(String(value))
