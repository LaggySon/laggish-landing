# laggi.sh

Follow DESIGN.md for all UI work. It replaces any other design instructions in this file.

- `public/tokens.css` and `public/components.css` are unedited copies from the Laggish design guide. Never edit them; the site's own CSS is `public/ui-local.css`, with the `lg-` prefix.
- State words live in `lib/status.js`, formats in `lib/format.js`.
- `npm test` runs the unit tests. `npm run dev` serves the site on http://localhost:4100.
- The site must never need a code change to show a new project: everything about a project comes from GitHub at request time (see README.md).
