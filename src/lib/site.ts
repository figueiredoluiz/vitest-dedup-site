export const siteConfig = {
  name: 'VitestDedup',
  tagline: 'Find duplicated tests. Reduce redundancy. Keep your test suite maintainable.',
  description:
    'VitestDedup is a static analyzer that finds duplicate and near-duplicate Vitest tests without importing or executing them.',
  license: 'MIT',
  // Empty string hides every repository call to action across the site.
  repoUrl: 'https://github.com/figueiredoluiz/vitest-dedup',
  npmUrl: 'https://www.npmjs.com/package/vitest-dedup',
} as const;

export const headerNav = [
  { label: 'Features', href: '/#features' },
  { label: 'Docs', href: '/docs/' },
  { label: 'Trending', href: '/trending/' },
  { label: 'Changelog', href: '/changelog/' },
] as const;
