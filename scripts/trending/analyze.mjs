#!/usr/bin/env node
/**
 * Daily trending analysis: scrape GitHub trending, keep the repositories that use Vitest, run the
 * latest released vitest-dedup on each, and write the day's public snapshot to
 * src/data/trending/days/YYYY-MM-DD.json. The full analyzer output (raw JSONL, stderr and a run
 * manifest) goes to the artifact directory, which the workflow uploads and git ignores.
 *
 * Runs in the "Trending" workflow, or locally:
 *   GITHUB_TOKEN=$(gh auth token) node scripts/trending/analyze.mjs
 *
 * Environment:
 *   GITHUB_TOKEN        API token (the workflow's own token is enough)
 *   VITEST_DEDUP_BIN    analyzer command; default `npx -y vitest-dedup@latest`
 *   TRENDING_MAX_REPOS  repositories analysed per day (default 25)
 *   TRENDING_ARTIFACTS  artifact directory (default .trending-artifacts/<date>)
 */
import { UA, analyzerVersion, runDay } from './pipeline.mjs';

const LANGUAGES = ['', 'typescript', 'javascript', 'vue', 'svelte'];
const MAX_REPOS = Number(process.env.TRENDING_MAX_REPOS ?? 25);
// Floors: a layout change or an outage must fail the run, not publish an empty day.
const MIN_SCRAPED = 20;
const MIN_ANALYZED = 3;

async function scrapeTrending(language) {
  const url = `https://github.com/trending${language ? `/${language}` : ''}?since=daily`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const repos = [];
  for (const article of (await res.text()).split('<article').slice(1)) {
    const name = article.match(/<h2[\s\S]*?href="\/([\w.-]+\/[\w.-]+)"/)?.[1];
    if (!name || repos.some((r) => r.name === name)) continue;
    const starsToday = article.match(/([\d,]+) stars? today/)?.[1];
    repos.push({ name, starsToday: starsToday ? Number(starsToday.replace(/,/g, '')) : 0 });
  }
  return repos;
}

const version = await analyzerVersion();
console.log(`vitest-dedup ${version}`);

const candidates = new Map();
for (const language of LANGUAGES) {
  try {
    for (const r of await scrapeTrending(language)) {
      const e = candidates.get(r.name) ?? { name: r.name, starsToday: 0, lists: [] };
      e.starsToday = Math.max(e.starsToday, r.starsToday);
      e.lists.push(language || 'all');
      candidates.set(r.name, e);
    }
  } catch (e) {
    console.log(`skip list ${language || 'all'}: ${e.message}`);
  }
}
if (candidates.size < MIN_SCRAPED) {
  console.error(
    `scraped only ${candidates.size} repositories; the trending layout may have changed`,
  );
  process.exit(1);
}
console.log(`trending: ${candidates.size} repositories`);

const written = await runDay({
  date: new Date().toISOString().slice(0, 10),
  source: 'github-trending-daily',
  candidates: [...candidates.values()].sort((a, b) => b.starsToday - a.starsToday),
  maxRepos: MAX_REPOS,
  minAnalyzed: MIN_ANALYZED,
  version,
});
if (!written) process.exit(1);
