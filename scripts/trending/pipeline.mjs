/**
 * The measuring half of the trending pipeline, shared by the daily run (analyze.mjs) and the
 * backfill of past days (backfill.mjs): decide whether a repository uses Vitest, check out its
 * sources at a commit, run vitest-dedup, and write the day's snapshot plus the full artifacts.
 */
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { DAYS_DIR, ROOT, buildIndex, readExclusions, summarizeReport } from './lib.mjs';

export const exec = promisify(execFile);

// GitHub's `size` counts the whole history and every binary; the text-only checkout is a small
// fraction of it. This only stops pathological repositories.
const MAX_REPO_SIZE_KB = 10_000_000;
const CLONE_TIMEOUT_MS = 240_000;
const SCAN_TIMEOUT_MS = 300_000;

const ANALYZER = (process.env.VITEST_DEDUP_BIN || 'npx -y vitest-dedup@latest').split(/\s+/);
export const UA = { 'user-agent': 'vitestdedup.dev-trending (+https://vitestdedup.dev/trending/)' };
const API_HEADERS = {
  ...UA,
  accept: 'application/vnd.github+json',
  ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

const analyzer = (args, opts = {}) => {
  const [bin, ...lead] = ANALYZER;
  return exec(bin, [...lead, ...args], { maxBuffer: 256 * 1024 * 1024, ...opts });
};

export async function analyzerVersion() {
  const { stdout } = await analyzer(['--version']);
  return stdout.trim().replace(/^vitest-dedup\s+/, '');
}

export async function api(path) {
  const res = await fetch(`https://api.github.com/${path}`, { headers: API_HEADERS });
  if (res.status === 404 || res.status === 409) return null; // 409: empty repository
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

const VITEST_CONFIG =
  /(^|\/)vitest\.(config|workspace)\.[cm]?[jt]s$|(^|\/)vitest\.[\w.-]+\.config\.[cm]?[jt]s$/;
const SKIP_DIRS = /(^|\/)(node_modules|dist|vendor|third_party)\//;

/**
 * Whether a repository uses Vitest, judged from its tree and root package.json without cloning.
 * `until` (ISO time) judges the repository as it was then, at the last commit before it.
 */
async function classify(name, until) {
  const meta = await api(`repos/${name}`);
  if (!meta) return { usesVitest: false, reason: 'no repository metadata' };
  const base = {
    description: meta.description ?? '',
    language: meta.language,
    stars: meta.stargazers_count,
    sizeKb: meta.size,
    defaultBranch: meta.default_branch,
  };
  let ref = meta.default_branch;
  if (until) {
    const commits = await api(
      `repos/${name}/commits?sha=${encodeURIComponent(meta.default_branch)}&until=${until}&per_page=1`,
    );
    if (!commits?.length)
      return { ...base, usesVitest: false, reason: `no commit before ${until}` };
    ref = commits[0].sha;
  }
  const tree = await api(`repos/${name}/git/trees/${ref}?recursive=1`);
  const configs = (tree?.tree ?? [])
    .filter((e) => e.type === 'blob' && !SKIP_DIRS.test(e.path) && VITEST_CONFIG.test(e.path))
    .map((e) => e.path);
  let dependency = false;
  const pkg = await api(`repos/${name}/contents/package.json?ref=${ref}`);
  if (pkg?.content) {
    try {
      const json = JSON.parse(Buffer.from(pkg.content, 'base64').toString('utf8'));
      dependency =
        ['dependencies', 'devDependencies', 'peerDependencies'].some(
          (k) => json[k] && 'vitest' in json[k],
        ) || Object.values(json.scripts ?? {}).some((s) => /\bvitest\b/.test(String(s)));
    } catch {
      // A malformed root package.json leaves the config-file signal to decide.
    }
  }
  const usesVitest = configs.length > 0 || dependency;
  return {
    ...base,
    commit: until ? ref : null,
    usesVitest,
    reason: usesVitest ? null : 'no Vitest config or dependency found',
    configCount: configs.length,
    dependency,
    treeTruncated: !!tree?.truncated,
  };
}

// The analyzer reads only JavaScript/TypeScript sources and project manifests, so the checkout
// fetches only those: images, videos, fixtures and lockfiles never leave GitHub. On a 4.4 GB
// repository this is 121 MB in 18 s instead of 1.3 GB in 273 s, with identical results.
const CHECKOUT_PATTERNS = [
  '*.ts',
  '*.tsx',
  '*.mts',
  '*.cts',
  '*.js',
  '*.jsx',
  '*.mjs',
  '*.cjs',
  '*.vue',
  '*.svelte',
  'package.json',
  'tsconfig*.json',
  'jsconfig*.json',
  'pnpm-workspace.yaml',
  '!node_modules/',
];

/** Sources-only shallow checkout of the default branch, or of `commit` when given. */
async function textOnlyClone(name, dir, commit) {
  const opts = { timeout: CLONE_TIMEOUT_MS, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } };
  const url = `https://github.com/${name}.git`;
  if (commit) {
    await exec('git', ['init', '-q', dir], opts);
    await exec('git', ['-C', dir, 'remote', 'add', 'origin', url], opts);
    await exec(
      'git',
      ['-C', dir, 'fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', commit],
      opts,
    );
  } else {
    await exec(
      'git',
      [
        'clone',
        '-q',
        '--depth',
        '1',
        '--filter=blob:none',
        '--no-checkout',
        '--single-branch',
        url,
        dir,
      ],
      opts,
    );
  }
  await exec('git', ['-C', dir, 'sparse-checkout', 'set', '--no-cone', ...CHECKOUT_PATTERNS], opts);
  await exec('git', ['-C', dir, 'checkout', '-q', ...(commit ? ['FETCH_HEAD'] : [])], opts);
}

async function analyzeRepo(name, artifactDir, commit) {
  const dir = await mkdtemp(join(tmpdir(), 'trending-'));
  const slug = name.replace('/', '__');
  try {
    const t0 = Date.now();
    await textOnlyClone(name, dir, commit);
    const { stdout: sha } = await exec('git', ['-C', dir, 'rev-parse', 'HEAD']);
    const t1 = Date.now();
    let stdout = '';
    let stderr = '';
    let exitCode = 0;
    try {
      ({ stdout, stderr } = await analyzer(
        [dir, '--reporters', 'jsonl', '--emit-test-fingerprints'],
        {
          timeout: SCAN_TIMEOUT_MS,
        },
      ));
    } catch (e) {
      // Exit 1 means error-severity findings, a normal result; anything else is a failed analysis.
      if (e.code !== 1) {
        // Keep the failed run's output: it is what a fix needs.
        await writeFile(join(artifactDir, `${slug}.jsonl`), String(e.stdout ?? ''));
        await writeFile(
          join(artifactDir, `${slug}.stderr`),
          String(e.stderr ?? e.message)
            .split(dir)
            .join(`<${name}>`),
        );
        const first =
          String(e.stderr ?? e.message)
            .split('\n')
            .find(Boolean) ?? '';
        throw new Error(`analyzer exited ${e.code ?? e.signal}: ${first}`);
      }
      ({ stdout, stderr } = e);
      exitCode = 1;
    }
    const t2 = Date.now();
    await writeFile(join(artifactDir, `${slug}.jsonl`), stdout);
    await writeFile(join(artifactDir, `${slug}.stderr`), stderr.split(dir).join(`<${name}>`));
    return {
      headSha: sha.trim(),
      exitCode,
      cloneMs: t1 - t0,
      scanMs: t2 - t1,
      report: summarizeReport(stdout, name, sha.trim()),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Measure one day's candidates (ordered best first; each { name, starsToday, lists, until? }) and
 * write its snapshot. Returns false, writing nothing public, when fewer than `minAnalyzed` were
 * analyzed. `until` analyses a candidate at its last commit before that time instead of HEAD.
 */
export async function runDay({ date, source, note, candidates, maxRepos, minAnalyzed, version }) {
  const generatedAt = new Date().toISOString();
  const artifactDir = process.env.TRENDING_ARTIFACTS || join(ROOT, '.trending-artifacts', date);
  await mkdir(artifactDir, { recursive: true });
  const exclude = await readExclusions();
  const manifest = {
    date,
    generatedAt,
    source,
    analyzerVersion: version,
    maxRepos,
    candidates: [],
  };
  const repos = [];
  const skipped = [];
  for (const entry of candidates) {
    const record = { ...entry };
    manifest.candidates.push(record);
    if (repos.length >= maxRepos) {
      record.outcome = 'not reached';
      continue;
    }
    if (exclude.has(entry.name.toLowerCase())) {
      record.outcome = 'excluded on request';
      continue;
    }
    try {
      Object.assign(record, await classify(entry.name, entry.until));
    } catch (e) {
      record.outcome = `classification failed: ${e.message}`;
      continue;
    }
    if (!record.usesVitest) {
      record.outcome = 'no Vitest';
      continue;
    }
    if (record.sizeKb > MAX_REPO_SIZE_KB) {
      record.outcome = 'over size cap';
      skipped.push({
        name: entry.name,
        reason: `larger than ${MAX_REPO_SIZE_KB / 1_000_000} GB on GitHub`,
      });
      continue;
    }
    try {
      console.log(
        `analyzing ${entry.name}${record.commit ? ` at ${record.commit.slice(0, 7)}` : ''}`,
      );
      const result = await analyzeRepo(entry.name, artifactDir, record.commit);
      Object.assign(record, {
        outcome: 'analyzed',
        headSha: result.headSha,
        exitCode: result.exitCode,
        cloneMs: result.cloneMs,
        scanMs: result.scanMs,
      });
      repos.push({
        name: entry.name,
        url: `https://github.com/${entry.name}`,
        description: record.description,
        language: record.language,
        stars: record.stars,
        starsToday: entry.starsToday,
        lists: entry.lists,
        defaultBranch: record.defaultBranch,
        headSha: result.headSha,
        scanMs: result.scanMs,
        ...result.report,
      });
      const r = result.report;
      console.log(
        `  -> ${r.tests.analyzed} tests, ${r.findings.total} findings (${r.findings.errors} error)`,
      );
    } catch (e) {
      record.outcome = `analysis failed: ${e.message}`;
      skipped.push({ name: entry.name, reason: 'analysis failed' });
      console.log(`  skip ${entry.name}: ${e.message}`);
    }
  }
  await writeFile(join(artifactDir, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  if (repos.length < minAnalyzed) {
    console.error(`${date}: only ${repos.length} repositories analysed; no snapshot written`);
    return false;
  }
  await mkdir(DAYS_DIR, { recursive: true });
  const snapshot = {
    date,
    generatedAt,
    source,
    ...(note ? { note } : {}),
    analyzerVersion: version,
    scanned: candidates.length,
    repos,
    skipped,
  };
  await writeFile(join(DAYS_DIR, `${date}.json`), JSON.stringify(snapshot, null, 1) + '\n');
  const index = await buildIndex();
  console.log(
    `wrote ${date} with ${repos.length} repositories; index covers ${index.days.length} days`,
  );
  return true;
}
