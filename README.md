# VitestDedup website

The official website for [VitestDedup](https://github.com/figueiredoluiz/vitest-dedup), a static
analyzer that finds duplicate and near-duplicate Vitest tests.

Built with [Astro](https://astro.build) + [Starlight](https://starlight.astro.build) for
documentation, Tailwind CSS v4 for the design system, and Pagefind search through Starlight's
built-in integration. Fully static: no backend, no runtime server-side processing.

## Getting started

Requires Node 20+ and [pnpm](https://pnpm.io).

```sh
pnpm install
pnpm dev
```

The dev server serves at <http://localhost:4321>.

Production build and local preview:

```sh
pnpm build
pnpm preview
```

Documentation search (Pagefind) indexes at build time, so test it in `pnpm preview`, not `pnpm dev`.

## Pages

| Route | Content |
| --- | --- |
| `/` | Custom landing page: hero with terminal demo, problem/solution, features, report showcase, workflow, community. |
| `/docs/` | Starlight documentation: 11 pages of verified reference for the analyzer. |
| `/changelog/` | Release history rendered from a local fixture. |

## Structure

```text
├── public/                  favicon and static assets
├── src/
│   ├── components/
│   │   ├── landing/         homepage sections
│   │   ├── reports/         report visualization (findings, stats)
│   │   └── shared/          header, footer, theme toggle, terminal
│   ├── content/docs/docs/   Starlight documentation pages (nested so docs serve at /docs/)
│   ├── data/
│   │   ├── releases.json    release fixture shaped after the GitHub Releases API
│   │   └── sample-report.json  illustrative findings shaped after the JSON report fields
│   ├── layouts/             BaseLayout for non-docs pages
│   ├── lib/                 typed loaders (releases, report, markdown) and site config
│   ├── pages/               index.astro, changelog.astro
│   └── styles/              tailwind.css (design tokens), starlight.css (docs palette)
└── astro.config.mjs
```

## Configuration

- **`SITE_URL`** (env) — canonical origin used for metadata and the sitemap. Defaults to
  `http://localhost:4321`, so built pages never carry a fictitious production domain. Set it when
  deploying.
- **`src/lib/site.ts`** — site-wide config: repository URL, npm URL, current version. Emptying
  `repoUrl` hides every GitHub call to action across the site.

## Data sources and what is mocked

Content was written against the actual VitestDedup source repository (`docs/`, `README.md`, release
tags), so CLI commands, flags, rules, reporters, and exit codes are real.

- `src/data/releases.json` — real tag names and dates (v0.1.0–v0.5.0) with summary bodies written
  for this site; each entry links to the original GitHub release. Shaped after the GitHub Releases
  API so it can be replaced with build-time fetches later.
- `src/data/sample-report.json` — illustrative findings only, shaped after the documented JSON
  report fields (rule, verdict, participants, fingerprint). The report components are structured to
  consume real `--reporters json` output without changes.

## Theming

Landing pages and Starlight share one theme: both drive the `data-theme` attribute on `<html>` and
the `starlight-theme` localStorage key, so a single toggle keeps dark/light in sync across the whole
site. Brand tokens live in `src/styles/tailwind.css`; Starlight's palette is aligned in
`src/styles/starlight.css`.

## Deployment

Production hosting is Cloudflare Pages, published by the GitHub Actions workflow in
`.github/workflows/deploy.yml` (direct upload via `wrangler-action`, not the Git integration).

- Canonical domain: **vitestdedup.dev** — set at build time through `SITE_URL`, which feeds
  canonical URLs, Open Graph tags, and the sitemap.
- Pages project: `vitest-dedup-site` (production URL `https://vitest-dedup-site.pages.dev` until
  the custom domain is attached).
- Required repository secrets: `CLOUDFLARE_API_TOKEN` (Account → Cloudflare Pages → Edit) and
  `CLOUDFLARE_ACCOUNT_ID`.
- Pushes to `main` deploy to production; pull requests get preview deployments.

## Deferred until a later phase

- Build-time sync of docs Markdown from the source repository.
- Build-time fetch of releases from the GitHub Releases API.
- Import of real VitestDedup report output to replace the sample fixture.
- Automated rebuilds on source-repo changes; versioned docs; pt-BR/ja localization.
