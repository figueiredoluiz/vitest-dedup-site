// Top-level pages synced into docs/reference, in sidebar order. `scripts/sync-docs.mjs` fails when
// the upstream docs gain a top-level page that is not listed here, so a new page cannot silently
// vanish from the navigation. Folders (rules, reports, vitest-surface) are groups in astro.config.
export const referenceTopLevel = [
  { slug: 'docs/reference/configuration', label: 'Configuration file', file: 'configuration.md' },
  {
    slug: 'docs/reference/baselines',
    label: 'Baselines and changed-file scoping',
    file: 'baselines.md',
  },
  {
    slug: 'docs/reference/incomplete-runs',
    label: 'Incomplete runs and limits',
    file: 'incomplete-runs.md',
  },
  {
    slug: 'docs/reference/imported-runners',
    label: 'Imported runners',
    file: 'imported-runners.md',
  },
  { slug: 'docs/reference/github-action', label: 'GitHub Action', file: 'github-action.md' },
  { slug: 'docs/reference/development', label: 'Development', file: 'development.md' },
  { slug: 'docs/reference/releasing', label: 'Releasing', file: 'releasing.md' },
];

// Index pages that head a folder group; they are listed explicitly as the group's first item.
export const referenceGroupIndexes = ['rules.md', 'reports.md', 'vitest-surface.md'];
