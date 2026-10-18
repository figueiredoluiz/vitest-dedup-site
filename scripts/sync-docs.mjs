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

const rewriteLinks = (body, currentFile) => {
  const currentDir = path.posix.dirname(currentFile);
  return body.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (whole, label, target) => {
    if (/^([a-z]+:|\/\/|#|mailto:)/i.test(target)) return whole;
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
await rm(outDir, { recursive: true, force: true });

for (const relative of files) {
  const raw = await readFile(path.join(docsDir, relative), 'utf8');
  const { title } = extractTitle(raw);
  const body = raw.replace(/^#\s+.+\n/, '');
  const outputRel = relative === 'README.md' ? 'index.md' : relative;
  const destination = path.join(outDir, outputRel);
  const frontmatter = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(buildDescription(body))}`,
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
