// Regenerates src/data/sample-report.json from a real run of the CLI on the project written by demo/generate-sample-project.mjs.
// Usage: node demo/generate-sample-report.mjs /path/to/vitest-dedup
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const bin = process.argv[2] && resolve(process.argv[2]);
if (!bin) throw new Error('usage: node demo/generate-sample-report.mjs <vitest-dedup binary>');
const here = dirname(fileURLToPath(import.meta.url));
execFileSync(process.execPath, [join(here, 'generate-sample-project.mjs')], { stdio: 'inherit' });
const project = join(here, '.generated', 'sample-project');
const run = (args) => spawnSync(bin, [...args], { cwd: project, encoding: 'utf8' });

const version = execFileSync(bin, ['--version'], { encoding: 'utf8' }).trim().split(' ').pop();
const records = run(['.', '--reporters', 'jsonl']).stdout.trim().split('\n').map((l) => JSON.parse(l));
const findings = records.filter((r) => r.type === 'finding');
const summary = records.find((r) => r.type === 'summary');
const terminal = run(['.']).stdout;

// Terminal sections list findings grouped by rule, each with its own `action:` line.
const actions = new Map();
let rule = null;
for (const line of terminal.split('\n')) {
  if (/^[a-z][a-z-]+$/.test(line)) rule = line;
  const m = line.match(/^\s+action: (.*)$/);
  if (m && rule) actions.set(rule, m[1]);
}
const timeMs = Number(terminal.match(/Detection time: ([\d.]+) ms/)?.[1]);
if (!findings.length || !summary || !Number.isFinite(timeMs)) throw new Error('CLI output did not parse');
for (const f of findings) if (!actions.has(f.rule)) throw new Error(`no action for ${f.rule}`);

const bySeverity = (f) => (f.severity === 'error' ? 0 : 1);
const sorted = [...findings].sort((a, b) => bySeverity(a) - bySeverity(b));
const report = {
  meta: {
    source: 'sample-project',
    note: `Real output of vitest-dedup ${version} on a generated ${summary.testsAnalyzed}-test project (demo/generate-sample-project.mjs), reshaped for display.`,
    toolVersion: version.replace(/^v/, ''),
  },
  summary: {
    filesAnalyzed: summary.filesAnalyzed,
    testsAnalyzed: summary.testsAnalyzed,
    findings: findings.length,
    errorFindings: summary.errors,
    warningFindings: summary.warnings,
    suppressed: summary.suppressed ?? 0,
    detectionTimeMs: timeMs,
    incomplete: summary.incomplete,
  },
  findings: sorted.map((f, i) => ({
    id: `F${i + 1}`,
    rule: f.rule,
    severity: f.severity,
    verdict: f.verdict,
    message: f.message,
    action: actions.get(f.rule),
    fingerprint: f.fingerprint,
    participants: f.locations.map((l, j) => ({
      file: l.path,
      title: f.titles[j],
      line: l.line,
      column: l.column,
      inert: f.inert[j],
    })),
  })),
};
writeFileSync(join(here, '..', 'src/data/sample-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`wrote ${report.findings.length} findings, ${report.summary.testsAnalyzed} tests, ${timeMs} ms`);
