#!/usr/bin/env node
// Syncs the VitestDedup source repository's published docs into the Starlight
// content collection. Output is committed so builds stay deterministic; CI
// re-runs the sync before every build so deploys always carry the latest
// upstream docs. The published set mirrors the `files` list of the upstream
// package.json — internal *.local.md notes and working documents stay out.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { referenceGroupIndexes, referenceTopLevel } from '../src/reference-nav.mjs';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceRepo = process.env.VITEST_DEDUP_REPO ?? path.resolve(projectRoot, '../vitest-dedup');
const docsDir = path.join(sourceRepo, 'docs');
const outDir = path.resolve(projectRoot, 'src/content/docs/docs/reference');
const GITHUB_BASE = 'https://github.com/figueiredoluiz/vitest-dedup';

const EXCLUDED = new Set([
  'adjudication-procedure.md',
  'adjudication-results',
  'oxc-api-notes.md',
  'remediation-plan.md',
  'testing-and-corpus-plan.md',
]);

// Page titles come from each document's first `# ` heading. Upstream numbers some headings
// ("4b. Title formatting") because code comments cite those sections, and writes inline code in
// others. Neither reads well as a sidebar label or page title, so titles are normalized here and
// the section references in the prose are rewritten to page names (see `buildSectionLinks`).
const SECTION_PREFIX = /^\d+[a-z]?\.\s+/;
const cleanTitle = (title) => title.replace(SECTION_PREFIX, '').replace(/`/g, '').trim();

// The upstream index lists its pages in reading order; the sidebar follows that order rather than
// alphabetical file names. A page the index does not link sorts after the linked ones.
const SIDEBAR_LABEL_OVERRIDES = { 'README.md': 'Overview' };
const DESCRIPTION_OVERRIDES = {
  'README.md':
    'Index of the VitestDedup analyzer reference: configuration, rules, reports, baselines and the Vitest surface.',
};

if (!existsSync(docsDir)) {
  console.error(`Source docs not found: ${docsDir}`);
  console.error('Set VITEST_DEDUP_REPO or clone the source repository next to this project.');
  process.exit(2);
}

const sourceSha = execSync('git rev-parse --short HEAD', { cwd: sourceRepo }).toString().trim();

const collectMarkdownFiles = async (dir, prefix = '') => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (EXCLUDED.has(relative) || entry.name.endsWith('.local.md')) continue;
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(path.join(dir, entry.name), relative)));
    } else if (entry.name.endsWith('.md')) {
      files.push(relative);
    }
  }
  return files;
};

const extractTitle = (raw) => {
  const match = raw.match(/^#\s+(.+)$/m);
  return { title: match?.[1]?.trim() ?? 'Untitled', raw };
};

const buildDescription = (body) => {
  const paragraph = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .find(
      (block) =>
        block && !block.startsWith('|') && !block.startsWith('#') && !block.startsWith('```'),
    );
  if (!paragraph) return '';
  const text = paragraph
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
};

// `| 4b | ... | [Title formatting](vitest-surface/title-formatting.md) |` rows of an index page, in
// order: section number -> linked page, plus the order of the linked pages.
const readIndexTable = (raw, indexFile) => {
  const dir = path.posix.dirname(indexFile);
  const sections = new Map();
  const order = [];
  for (const line of raw.split('\n')) {
    if (!line.startsWith('|')) continue;
    const link = line.match(/\[[^\]]+\]\(([^)#]+\.md)(?:#[^)]*)?\)/);
    if (!link) continue;
    const target = path.posix.normalize(path.posix.join(dir, link[1]));
    if (!order.includes(target)) order.push(target);
    const section = line.match(/^\|\s*(\d+[a-z]?)\s*\|/);
    if (section) sections.set(section[1], target);
  }
  return { sections, order };
};

const rewriteLinks = (body, currentFile) => {
  const currentDir = path.posix.dirname(currentFile);
  return body.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (whole, label, target) => {
    if (/^([a-z]+:|\/|#|mailto:)/i.test(target)) return whole;
    const linkPath = target.match(/^([^#]*)(#.*)?$/)[1];
    const hash = target.match(/^([^#]*)(#.*)?$/)[2] ?? '';
    if (!linkPath) return whole;
    const resolved = path.posix.normalize(path.posix.join(currentDir, linkPath));
    if (resolved.startsWith('..')) {
      const repoRelative = resolved.slice(3);
      return `[${label}](${GITHUB_BASE}/blob/main/${repoRelative}${hash})`;
    }
    const slug = resolved.replace(/\.md$/, '').replace(/\/README$/, '');
    return `[${label}](/docs/reference/${slug}${slug ? '/' : ''}${hash})`;
  });
};

const files = await collectMarkdownFiles(docsDir);

// Every top-level upstream page needs a sidebar entry (src/reference-nav.mjs), or it is
// reachable only by URL.
const navigable = new Set([
  'README.md',
  ...referenceTopLevel.map(({ file }) => file),
  ...referenceGroupIndexes,
]);
const unlisted = files.filter((file) => !file.includes('/') && !navigable.has(file));
if (unlisted.length > 0) {
  console.error(
    `Upstream top-level docs missing from src/reference-nav.mjs: ${unlisted.join(', ')}`,
  );
  process.exit(3);
}
await rm(outDir, { recursive: true, force: true });

// First pass: titles, and the section map and page order each index page defines.
const pages = new Map();
for (const relative of files) {
  const raw = await readFile(path.join(docsDir, relative), 'utf8');
  pages.set(relative, { raw, title: cleanTitle(extractTitle(raw).title) });
}
const sectionTargets = new Map();
const sidebarOrder = new Map();
for (const [relative, { raw }] of pages) {
  const indexFor = relative.replace(/\.md$/, '');
  const children = files.filter((file) => file.startsWith(`${indexFor}/`));
  if (children.length === 0) continue;
  const { sections, order } = readIndexTable(raw, relative);
  for (const [section, target] of sections) sectionTargets.set(section, target);
  order.forEach((target, position) => {
    if (!sidebarOrder.has(target)) sidebarOrder.set(target, position + 1);
  });
}

const pageLink = (target) => {
  const slug = target.replace(/\.md$/, '').replace(/\/README$/, '');
  return `/docs/reference/${slug}/`;
};

// `[§12](...)` and bare `§12` cite a numbered section; the page title says what it is.
const rewriteSectionRefs = (body) =>
  body
    .replace(/\[§(\d+[a-z]?)\]\(([^)]+)\)/g, (whole, section, url) => {
      const target = sectionTargets.get(section);
      return target ? `[${pages.get(target).title}](${url})` : whole;
    })
    .replace(/§(\d+[a-z]?)\b/g, (whole, section) => {
      const target = sectionTargets.get(section);
      return target ? `[${pages.get(target).title}](${pageLink(target)})` : whole;
    });

// An internal marker the upstream docs tests look for; it means nothing to a reader.
const stripInternalMarkers = (body) => body.replace(/ ?`\[status: current\]`/g, '');

for (const relative of files) {
  const { raw, title } = pages.get(relative);
  const withoutHeading = raw.replace(/^#\s+.+\n/, '');
  const body = stripInternalMarkers(rewriteSectionRefs(withoutHeading));
  const outputRel = relative === 'README.md' ? 'index.md' : relative;
  const destination = path.join(outDir, outputRel);
  const sidebar = [];
  if (SIDEBAR_LABEL_OVERRIDES[relative])
    sidebar.push(`  label: ${JSON.stringify(SIDEBAR_LABEL_OVERRIDES[relative])}`);
  const children = relative.includes('/') ? (sidebarOrder.get(relative) ?? 100) : undefined;
  if (children !== undefined) sidebar.push(`  order: ${children}`);
  const frontmatter = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(DESCRIPTION_OVERRIDES[relative] ?? buildDescription(body))}`,
    ...(sidebar.length ? ['sidebar:', ...sidebar] : []),
    '---',
    '',
    `<!-- Synced from ${GITHUB_BASE}@${sourceSha} docs/${relative}. Edits belong upstream. -->`,
    '',
  ].join('\n');
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, `${frontmatter}${rewriteLinks(body, relative).trimStart()}\n`);
}

console.log(
  `Synced ${files.length} docs from ${GITHUB_BASE}@${sourceSha} into ${path.relative(projectRoot, outDir)}`,
);
