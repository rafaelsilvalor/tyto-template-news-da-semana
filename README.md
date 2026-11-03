# tyto-template-news-da-semana

`news-da-semana`, a [Tyto](https://github.com/rafaelsilvalor/tyto) code template in its own
repository: the week's news as a carousel of 1080×1350 slides. Every slide carries the logo and
"News da semana" on the left and its own news on the right, one bold label and its words after
the other, centred on the page's height.

**This repository holds the composition only.** The logo is not here: Tyto hands it to the
template from the brand kit installed on the machine, and without one it draws a placeholder
(Tyto ADR 0063, ADR 0065). The example brief is invented copy.

## Install into Tyto

```
tyto plugin install git+https://github.com/rafaelsilvalor/tyto-template-news-da-semana.git
```

Tyto clones the default branch and never builds it, so `dist/index.js` is committed on `main`
and every release is a tag of it. To take a change pushed here, run the same command again:
installing a name that is already installed replaces it.

A pack brings templates and no formats. Copy `templates/formats.yaml` into the project that
renders `news-da-semana`, or merge its `grid` line into the project's own. Then a brief is:

```
---
template: news-da-semana
formats: [grid]
---

::lamina
  **Label:**
  the news under its label
  **Another label:** the news beside it
```

One `::lamina` is one slide. A line break in the brief is a line break on the slide. The
house's seal, `selo: ./selo.png` in the frontmatter, is glued to the last slide's foot.

## What it may reach

| Permission        | Why                                                                          |
| ----------------- | ---------------------------------------------------------------------------- |
| `font:CircularXX` | The list is placed by measuring CircularXX, a licensed face (Tyto ADR 0048). |

**The install asks for it once.** A face installed on the machine crosses to a plugin only
under this permission. Without it the render warns `W_PLUGIN_FONT_WITHHELD` and the list is
placed from an estimate of its lines.

## What a configuration may change

`templates/news-da-semana/manifest.yaml` declares the colours as `values` (Tyto ADR 0153), each
default the reference art's. A value changes a colour, never which pieces a slide draws.
`engine` is `>=0.13`, the plugin API this repository is built against.

## Development

`pnpm check` runs Prettier, the type checker, ESLint and the tests; `pnpm build` writes
`dist/index.js`, one ES module with every `@tyto` import inlined, which is committed and which
CI rebuilds and compares.

The template depends on Tyto's published contract, held by GitHub Packages under the owner's
scope (Tyto ADR 0149) and aliased in `package.json`: `@tyto/house-style` draws the logo,
`@tyto/template-kit` and `@tyto/core` are what the slides are drawn with, and
`@tyto/plugin-api` is what loads them. The committed `.npmrc` names the scope only. GitHub asks
for a token with `read:packages` even for public packages, and it goes in your user-level
`~/.npmrc`:

```sh
gh auth refresh -s read:packages
echo '//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}' >> ~/.npmrc
NODE_AUTH_TOKEN=$(gh auth token) pnpm install
```

The tests, all without Tyto:

- `src/template.test.ts`: the carousel's rules on the scene — one slide per `::lamina`, labels
  Bold and words Light, the subtitle the brief replaces, every text inside its slide, the list
  centred and a list too long reported.
- `tests/examples.test.ts`: the example brief compiled as Tyto compiles it, through
  `@tyto/template-kit/testing` (Tyto ADR 0152), against the HTML in `tests/__snapshots__/`.
- `tests/values.test.ts`: each declared value's default pinned to the one the code falls back
  to, and a colour set in a test found in the HTML.
- `tests/faces.test.ts`: the faces the manifest declares are the ones the example draws.
- `tests/plugin.test.ts`: the built `dist/index.js`, loaded through `@tyto/plugin-api/testing`
  (Tyto ADR 0150), drawing `news-da-semana` across the isolation protocol.

The `contract` workflow runs every day against the newest published contract, past the ranges
`package.json` asks for, so a Tyto release that breaks this template turns it red before
somebody installs it.
