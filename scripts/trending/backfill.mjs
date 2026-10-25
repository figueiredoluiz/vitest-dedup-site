#!/usr/bin/env node
/**
 * Rebuild past trending days. GitHub's trending page has no history, so the lists come from
 * vitalets/github-trending-repos, which comments once a day on one issue per language with the
 * repositories that newly entered that language's daily trending list. Repositories still trending
 * from earlier days are not repeated there, so a rebuilt day is the day's new entries, not its full
 * ranking. Each repository is analysed at its last commit before the comment, with the latest
 * vitest-dedup release.
 *
 *   GITHUB_TOKEN=$(gh auth token) node scripts/trending/backfill.mjs --since 2026-10-19 --until 2026-10-24
 *
 * Days that already have a snapshot are left alone unless --force is given.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { DAYS_DIR } from './lib.mjs';
import { analyzerVersion, api, runDay } from './pipeline.mjs';

const SOURCE_REPO = 'vitalets/github-trending-repos';
// Issue per daily list, as titled "New daily trending repos in <language>".
const ISSUES = { all: 6, javascript: 5, typescript: 34, vue: 128, svelte: 159 };
const MAX_REPOS = Number(process.env.TRENDING_MAX_REPOS ?? 25);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const { values } = parseArgs({
  options: { since: { type: 'string' }, until: { type: 'string' }, force: { type: 'boolean' } },
});
if (!DAY.test(values.since ?? '') || !DAY.test(values.until ?? '') || values.since > values.until) {
  console.error('usage: backfill.mjs --since YYYY-MM-DD --until YYYY-MM-DD [--force]');
  process.exit(2);
}

/** Repositories and their stars that day, from one comment body. */
function parseComment(body) {
  const links = [
    ...body.matchAll(/\[[^\]]+ \/ [^\]]+\]\(https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\)/g),
  ];
  return links.map((m, i) => {
    const segment = body.slice(m.index, links[i + 1]?.index ?? body.length);
    const stars = segment.match(/\+([\d,]+)\*\* stars? today/)?.[1];
    return { name: m[1], starsToday: stars ? Number(stars.replace(/,/g, '')) : 0 };
  });
}

async function comments(issue, since) {
  const out = [];
  for (let page = 1; ; page++) {
    const batch = await api(
      `repos/${SOURCE_REPO}/issues/${issue}/comments?since=${since}T00:00:00Z&per_page=100&page=${page}`,
    );
    out.push(...(batch ?? []));
    if (!batch || batch.length < 100) return out;
  }
}

const days = new Map();
for (const [list, issue] of Object.entries(ISSUES)) {
  for (const c of await comments(issue, values.since)) {
    const date = c.created_at.slice(0, 10);
    if (date < values.since || date > values.until) continue;
    const day = days.get(date) ?? new Map();
    for (const r of parseComment(c.body)) {
      const e = day.get(r.name) ?? { name: r.name, starsToday: 0, lists: [], until: c.created_at };
      e.starsToday = Math.max(e.starsToday, r.starsToday);
      if (!e.lists.includes(list)) e.lists.push(list);
      if (c.created_at < e.until) e.until = c.created_at;
      day.set(r.name, e);
    }
    days.set(date, day);
  }
}
// Work-performed floor: an API or format change that yields nothing must fail loudly.
if (days.size === 0) {
  console.error(`no comments from ${SOURCE_REPO} between ${values.since} and ${values.until}`);
  process.exit(1);
}

const version = await analyzerVersion();
console.log(`vitest-dedup ${version}`);
for (const date of [...days.keys()].sort()) {
  if (existsSync(join(DAYS_DIR, `${date}.json`)) && !values.force) {
    console.log(`${date}: snapshot exists, skipped (use --force to rebuild)`);
    continue;
  }
  const candidates = [...days.get(date).values()].sort((a, b) => b.starsToday - a.starsToday);
  console.log(`${date}: ${candidates.length} new trending entries`);
  await runDay({
    date,
    source: 'backfill-new-entries',
    note: `Rebuilt from the repositories that newly entered GitHub's daily trending lists that day, as recorded by ${SOURCE_REPO}; each was analysed at its last commit before that time.`,
    candidates,
    maxRepos: MAX_REPOS,
    minAnalyzed: 1,
    version,
  });
}
