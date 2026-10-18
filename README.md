# laggi.sh

The homepage at [laggi.sh](https://laggi.sh): every laggish project, read live from GitHub, with a link to each live deployment. It never needs a code change to show a new project.

It follows the Laggish design guide in [DESIGN.md](DESIGN.md). `public/tokens.css` and `public/components.css` are unedited copies from the guide; the site's own rules live in `public/ui-local.css`.

## What gets listed

Every public repository of [LaggySon](https://github.com/LaggySon) that is not a fork is read on each refresh. It is a **project** when any of these is true:

1. **Its live site is on laggi.sh.** The site looks, in this order, at the repository's Website field (About → Website), at `https://<repository-name>.laggi.sh` (if that host exists in DNS, it counts), and at links in the README.
2. **It carries the Laggish design guide** as `DESIGN.md`.
3. **It has the topic `laggish`.**

Every other public repository goes in the folded "Other repositories" table, with its live site if it has one.

So, to put a new project on the homepage, do any one of:

- deploy it at `<repository-name>.laggi.sh` (nothing else to do),
- set its Website field to any `*.laggi.sh` address,
- add `DESIGN.md` from the design guide, or
- add the topic `laggish`.

To keep a repository off the list, give it the topic `laggish-hidden`. Make it private and it disappears entirely.

## Where each part comes from

| On the page | Source |
|---|---|
| Name | The README's first heading when it spells the repository name ("Transitmaps"), else the repository name |
| Description | The repository's About description; without one, the README's first paragraph; without that, the live site's `<meta name="description">` |
| Extra lines | The README's first prose paragraphs (badges, link rows, setup steps, and generator templates are skipped) |
| Live site | Website field, `<name>.laggi.sh`, or a README link, as above |
| Up / Down | The live site is loaded once per refresh: Up for 2xx and 3xx (and 401/403, a sign-in wall), Down for errors, 404, and timeouts after 6s |
| Project page | The full README, rendered and sanitized; facts from the GitHub API; the last 10 commits from GitHub's public commit feed |

A README that is still a generator template (Create T3 App, create-next-app, Phoenix, …) is folded away with a note instead of shown as the project's description.

## How it stays fresh

The site is one Vercel function (`api/index.js`) that renders every page on the server. One refresh costs **one** GitHub API request (the repository list); READMEs, `DESIGN.md`, and commit feeds come from `raw.githubusercontent.com` and `github.com`, which the API rate limit does not cover.

- Pages are cached by Vercel's CDN for 5 minutes and then served stale while a fresh copy is built in the background (`stale-while-revalidate`), so no visitor waits for GitHub.
- If GitHub fails, the last good list stays up with a warning banner, and the site asks GitHub again after a minute.
- `/projects.json` returns the same data as JSON.

## Settings

All optional. Set them as environment variables on the Vercel project.

| Variable | Default | What it does |
|---|---|---|
| `GITHUB_TOKEN` | none | Raises GitHub's limit from 60 to 5,000 requests an hour. Recommended, because Vercel functions share outgoing IP addresses with other sites. Use a **classic** token with **no scopes** and **no expiration**: it can only read public data and never needs renewing |
| `GITHUB_OWNER` | `LaggySon` | Whose repositories to list |
| `LAGGISH_DOMAIN` | `laggi.sh` | The domain that makes a repository a project |
| `LAGGISH_TOPIC` | `laggish` | The topic that adds a repository |
| `LAGGISH_HIDE_TOPIC` | `laggish-hidden` | The topic that keeps a repository off the list |
| `LAGGISH_ONLY` | none | Repository names, separated by commas. When set, the site lists only these and nothing else: no other repositories table, and other repositories' pages return 404. Delete it to go back to the rules above |
| `FRESH_SECONDS` | `300` | How long one read of GitHub stays fresh |

## Deploy

The Vercel project `laggish-landing` deploys every push to `main` to https://laggi.sh (framework preset: Other; no build command). `www.laggi.sh` redirects to `laggi.sh`. To make GitHub reads more reliable, add `GITHUB_TOKEN` as above.

## Develop

```sh
npm install
npm run dev      # http://localhost:4100
npm test
```

The README sanitizer, sanitize-html, is bundled into `lib/vendor/sanitize-html.cjs`. It needs an ESM-only parser, and Vercel's function loader can't `require()` ES modules. After updating sanitize-html, run `npm run vendor` and commit the new bundle. `test/load.test.js` fails if the function stops loading on Vercel's terms.

To check contrast in every mode, as the design guide asks, with puppeteer installed:

```sh
NO_SANDBOX=1 node scripts/audit.mjs http://localhost:4100/ http://localhost:4100/showish
```

| Path | What it is |
|---|---|
| `api/index.js` | The Vercel function; `vercel.json` rewrites every page to it |
| `lib/router.js` | Routes and cache headers |
| `lib/projects.js` | Which repositories are projects, their live sites, the cache |
| `lib/github.js` | GitHub API, raw files, commit feeds, live-site checks |
| `lib/readme.js` | README name, summary, template detection, safe HTML |
| `lib/vendor/sanitize-html.cjs` | Bundled sanitize-html; made by `scripts/vendor.mjs`, never edited |
| `lib/views.js` | The pages |
| `lib/status.js`, `lib/format.js` | State words and formats (DESIGN.md 3.1 and 11) |
| `public/app.js` | Filter, Cards/List switch, local times, the age readout |
| `scripts/dev-server.mjs` | Local server that runs the same handler |
