// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Canonical origin for metadata and the sitemap. Override with SITE_URL at
// deploy time; the default is the real local origin so built pages never
// carry a fictitious production domain.
const site = process.env.SITE_URL ?? 'http://localhost:4321';

export default defineConfig({
  site,
  integrations: [
    starlight({
      title: 'VitestDedup',
      description:
        'A static analyzer that finds duplicate and near-duplicate Vitest tests without importing or executing them.',
      logo: { src: './src/assets/logo.svg' },
      customCss: ['./src/styles/starlight.css'],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/figueiredoluiz/vitest-dedup',
        },
        {
          icon: 'npm',
          label: 'npm',
          href: 'https://www.npmjs.com/package/vitest-dedup',
        },
      ],
      head: [
        {
          tag: 'link',
          attrs: { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        },
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Website home', link: '/' },
            { label: 'Introduction', slug: 'docs' },
            { label: 'Installation', slug: 'docs/installation' },
            { label: 'Quick Start', slug: 'docs/quick-start' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'CLI Reference', slug: 'docs/cli-reference' },
            { label: 'Configuration', slug: 'docs/configuration' },
            { label: 'Detection Concepts', slug: 'docs/detection-concepts' },
            { label: 'Understanding Results', slug: 'docs/understanding-results' },
            { label: 'Reports', slug: 'docs/reports' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'CI Integration', slug: 'docs/ci-integration' },
            { label: 'Troubleshooting', slug: 'docs/troubleshooting' },
            { label: 'Contributing', slug: 'docs/contributing' },
            { label: 'Changelog', link: '/changelog/' },
          ],
        },
      ],
    }),
    sitemap(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
