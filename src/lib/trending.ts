import indexJson from '../data/trending/index.json';
import excludeJson from '../../scripts/trending/exclude.json';

const excluded = new Set(excludeJson.repositories.map((n: string) => n.toLowerCase()));

export interface TrendingLocation {
  path: string;
  line: number;
  endLine: number;
  url: string;
}

export interface TrendingFinding {
  rule: string;
  severity: 'error' | 'warning';
  verdict: string;
  message: string;
  titles: string[];
  locations: TrendingLocation[];
  more: number;
}

export interface TrendingRepo {
  name: string;
  url: string;
  description: string;
  language: string | null;
  stars: number;
  starsToday: number;
  lists: string[];
  defaultBranch: string;
  headSha: string;
  scanMs: number;
  incomplete: boolean;
  tests: { analyzed: number; unresolved: number; files: number };
  comparablePercent: number;
  exclusions: { reason: string; files: number; tests: number }[];
  findings: { total: number; errors: number; warnings: number; byRule: Record<string, number> };
  top: TrendingFinding[];
}

export interface TrendingDay {
  date: string;
  generatedAt: string;
  /** `github-trending-daily` for a day measured live, `backfill-new-entries` for a rebuilt one. */
  source: string;
  note?: string;
  analyzerVersion: string;
  scanned: number;
  repos: TrendingRepo[];
  skipped: { name: string; reason: string }[];
}

export interface DaySummary {
  date: string;
  source: string;
  analyzerVersion: string;
  scanned: number;
  repos: number;
  tests: number;
  findings: number;
  errors: number;
  skipped: number;
}

export interface Appearance {
  date: string;
  rank: number;
  analyzerVersion: string;
  headSha: string;
  stars: number;
  tests: number;
  comparablePercent: number;
  findings: number;
  errors: number;
}

interface TrendingIndex {
  updatedAt: string;
  days: DaySummary[];
  repos: Record<string, { name: string; latest: string; appearances: Appearance[] }>;
}

const index = indexJson as TrendingIndex;

// Snapshots are the source of truth; each page loads only the day it renders.
const dayModules = import.meta.glob<{ default: TrendingDay }>('../data/trending/days/*.json');

export const trendingIndex = index;
export const latestDate = index.days[index.days.length - 1]?.date;

export async function loadDay(date: string): Promise<TrendingDay> {
  const load = dayModules[`../data/trending/days/${date}.json`];
  if (!load) throw new Error(`no trending snapshot for ${date}`);
  const day = (await load()).default;
  // Snapshots written before an exclusion request still list the repository; drop it here too.
  const kept = (r: { name: string }) => !excluded.has(r.name.toLowerCase());
  return { ...day, repos: day.repos.filter(kept), skipped: day.skipped.filter(kept) };
}

export const isRebuilt = (day: { source: string }) => day.source !== 'github-trending-daily';

export const repoPath = (name: string) => `/trending/repo/${name}/`;
export const dayPath = (date: string) =>
  date === latestDate ? '/trending/' : `/trending/day/${date}/`;

export const formatDay = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

export const formatNumber = (n: number) => n.toLocaleString('en-US');

export const ruleLabels: Record<string, string> = {
  'duplicate-test': 'Duplicate test',
  'cross-file-duplicate': 'Cross-file duplicate',
  'duplicate-suite': 'Duplicate suite',
  'duplicate-each-row': 'Duplicate .each row',
  'subsumed-test': 'Subsumed test',
  'redundant-hook': 'Redundant hook',
  'near-duplicate-test': 'Near-duplicate test',
  'duplicate-test-name': 'Duplicate test name',
  'parameterization-candidate': 'Parameterization candidate',
};

export const reasonLabels: Record<string, string> = {
  'unresolved-context': 'context could not be resolved',
  'helper-export-unreadable': 'imported helper unreadable',
  'helper-setup-effects': 'helper chain has setup effects',
  'helper-effects-unproved': 'helper effects unproved',
  'mock-factory-unreadable': 'vi.mock factory unreadable',
  'globals-undetermined': 'globals setting undetermined',
  'fixture-unreadable': 'test.extend fixture unreadable',
  'runner-mocked': 'runner is mocked',
  'unsupported-expression': 'unsupported expression',
  'source-limit': 'file over the size limit',
  'parse-error': 'parse error',
};
