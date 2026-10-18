// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { referenceTopLevel } from './src/reference-nav.mjs';

// Canonical origin for metadata and the sitemap. Override with SITE_URL at
// deploy time; the default is the real local origin so built pages never
// carry a fictitious production domain.
const site = process.env.SITE_URL ?? 'http://localhost:4321';
const ogImageUrl = new URL('/images/og.png', site).href;

// GA4 measurement id; unset (local dev) means no tracking scripts at all.
const gaId = process.env.PUBLIC_GA_ID;

const gaInitScript = (id) =>
  `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`;

// Surfaces docs-search terms (Pagefind input) as GA `search` events.
const gaSearchScript = `(function(){var t=null,last='';document.addEventListener('input',function(e){var el=e.target;if(!(el&&el.matches&&el.matches('input[type="search"]')))return;var term=(el.value||'').trim();clearTimeout(t);t=setTimeout(function(){if(term&&term!==last&&window.gtag){window.gtag('event','search',{search_term:term});last=term;}},800);},true);})();`;

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
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content: ogImageUrl,
          },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:width', content: '1200' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:height', content: '630' },
        },
        {
          tag: 'meta',
          attrs: {
            name: 'twitter:card',
            content: 'summary_large_image',
          },
        },
        ...(gaId
          ? [
              {
                tag: 'script',
                attrs: {
                  async: true,
                  src: `https://www.googletagmanager.com/gtag/js?id=${gaId}`,
                },
              },
              { tag: 'script', content: gaInitScript(gaId) },
              { tag: 'script', content: gaSearchScript },
            ]
          : []),
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
          // The pages under docs/reference are synced from the analyzer repository
          // (`pnpm sync:docs`). A folder becomes a sidebar group named after the folder, so each
          // group is declared here with a real label; page order inside a group comes from the
          // `sidebar.order` the sync derives from the upstream index tables. Add a new upstream
          // top-level page here, or the sync fails (see `referenceTopLevel`).
          label: 'Analyzer Reference',
          items: [
            { label: 'Overview', slug: 'docs/reference' },
            ...referenceTopLevel.map(({ label, slug }) => ({ label, slug })),
            {
              label: 'Rules',
              items: [
                { label: 'Overview', slug: 'docs/reference/rules' },
                { autogenerate: { directory: 'docs/reference/rules' } },
              ],
            },
            {
              label: 'Reports',
              items: [
                { label: 'Overview', slug: 'docs/reference/reports' },
                { autogenerate: { directory: 'docs/reference/reports' } },
              ],
            },
            {
              label: 'Vitest surface',
              items: [
                { label: 'Overview', slug: 'docs/reference/vitest-surface' },
                { autogenerate: { directory: 'docs/reference/vitest-surface' } },
              ],
            },
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
