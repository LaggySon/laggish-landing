// Everything the site needs to know about its owner. Each value can be changed
// with an environment variable on the host, so the code never has to change.
const env = (name, fallback) => {
  const value = typeof process !== "undefined" ? process.env[name] : undefined
  return value && value.trim() ? value.trim() : fallback
}

export const config = {
  // The GitHub account whose public repositories are listed.
  owner: env("GITHUB_OWNER", "LaggySon"),
  // The domain this site lives on. A repository whose live site is this domain
  // or one of its subdomains is a laggish project.
  domain: env("LAGGISH_DOMAIN", "laggi.sh"),
  // Optional. A classic token with no scopes raises GitHub's limit from 60 to
  // 5,000 requests an hour. The site works without one.
  token: env("GITHUB_TOKEN", ""),
  // A repository with this topic is listed even if nothing else marks it.
  includeTopic: env("LAGGISH_TOPIC", "laggish"),
  // A repository with this topic is never listed as a laggish project.
  hideTopic: env("LAGGISH_HIDE_TOPIC", "laggish-hidden"),
  // How long one fetch of GitHub stays fresh, in seconds.
  freshSeconds: Number(env("FRESH_SECONDS", "300")),
}

export const siteUrl = `https://${config.domain}`
