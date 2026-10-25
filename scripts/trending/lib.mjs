/**
 * Shared helpers for the trending pipeline. Daily snapshots in src/data/trending/days/ are the
 * source of truth; src/data/trending/index.json (per-day totals and per-repository appearances)
 * is derived from them by buildIndex().
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA_DIR = join(ROOT, 'src', 'data', 'trending');
export const DAYS_DIR = join(DATA_DIR, 'days');
export const INDEX_FILE = join(DATA_DIR, 'index.json');

const TOP_FINDINGS = 5;
const MAX_LOCATIONS = 4;
const MAX_TEXT = 240;

// Most actionable first: exact duplicates, then structural, then advisory rules.
const RULE_ORDER = [
  'duplicate-test',
  'cross-file-duplicate',
  'duplicate-suite',
  'duplicate-each-row',
  'subsumed-test',
  'redundant-hook',
  'near-duplicate-test',
  'duplicate-test-name',
  'parameterization-candidate',
];
const rank = (rule) => (RULE_ORDER.includes(rule) ? RULE_ORDER.indexOf(rule) : RULE_ORDER.length);

// Analyzed repository content is untrusted: keep it printable and short before it is published.
const clean = (s) =>
  String(s ?? '')
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, ' ')
    .slice(0, MAX_TEXT);

/** The public summary of one repository's JSONL report. */
export function summarizeReport(jsonl, name, sha) {
  const records = jsonl
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const summary = records.find((r) => r.type === 'summary');
  if (!summary) throw new Error('report has no summary record');
  const findings = records.filter((r) => r.type === 'finding');
  const byRule = {};
  for (const f of findings) byRule[f.rule] = (byRule[f.rule] ?? 0) + 1;
  const analyzed = summary.testsAnalyzed;
  const unresolved = summary.unresolvedTests;
  const top = [...findings]
    .sort(
      (a, b) =>
        (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1) ||
        rank(a.rule) - rank(b.rule) ||
        b.locations.length - a.locations.length,
    )
    .slice(0, TOP_FINDINGS)
    .map((f) => ({
      rule: f.rule,
      severity: f.severity,
      verdict: f.verdict,
      message: clean(f.message),
      titles: (f.titles ?? []).slice(0, MAX_LOCATIONS).map(clean),
      locations: f.locations.slice(0, MAX_LOCATIONS).map((l) => ({
        path: clean(l.path),
        line: l.line,
        endLine: l.endLine,
        url: `https://github.com/${name}/blob/${sha}/${encodeURI(l.path)}#L${l.line}-L${l.endLine}`,
      })),
      more: Math.max(0, f.locations.length - MAX_LOCATIONS),
    }));
  return {
    incomplete: summary.incomplete,
    tests: { analyzed, unresolved, files: summary.filesAnalyzed },
    comparablePercent: analyzed ? Math.round(((analyzed - unresolved) / analyzed) * 1000) / 10 : 0,
    exclusions: (summary.exclusions?.reasons ?? [])
      .filter((r) => r.tests > 0)
      .map((r) => ({ reason: r.reason, files: r.files, tests: r.tests })),
    findings: {
      total: findings.length,
      errors: findings.filter((f) => f.severity === 'error').length,
      warnings: findings.filter((f) => f.severity === 'warning').length,
      byRule,
    },
    top,
  };
}

const daySummary = (day) => ({
  date: day.date,
  source: day.source,
  analyzerVersion: day.analyzerVersion,
  scanned: day.scanned,
  repos: day.repos.length,
  tests: day.repos.reduce((n, r) => n + r.tests.analyzed, 0),
  findings: day.repos.reduce((n, r) => n + r.findings.total, 0),
  errors: day.repos.reduce((n, r) => n + r.findings.errors, 0),
  skipped: day.skipped.length,
});

export async function readDays() {
  const files = (await readdir(DAYS_DIR)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  return Promise.all(files.map(async (f) => JSON.parse(await readFile(join(DAYS_DIR, f), 'utf8'))));
}

/** Rebuild index.json from every snapshot. */
export async function buildIndex() {
  const days = await readDays();
  if (days.length === 0) throw new Error(`no snapshots in ${DAYS_DIR}`);
  const repos = {};
  for (const day of days) {
    day.repos.forEach((r, i) => {
      const entry = (repos[r.name] ??= { name: r.name, appearances: [] });
      entry.appearances.push({
        date: day.date,
        rank: i + 1,
        analyzerVersion: day.analyzerVersion,
        headSha: r.headSha,
        stars: r.stars,
        tests: r.tests.analyzed,
        comparablePercent: r.comparablePercent,
        findings: r.findings.total,
        errors: r.findings.errors,
      });
      entry.latest = day.date;
    });
  }
  const index = { updatedAt: days[days.length - 1].generatedAt, days: days.map(daySummary), repos };
  await writeFile(INDEX_FILE, JSON.stringify(index, null, 1) + '\n');
  return index;
}
