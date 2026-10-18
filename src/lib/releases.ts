import releasesJson from '../data/releases.json';

export interface Release {
  tagName: string;
  name: string;
  publishedAt: string;
  prerelease: boolean;
  url: string;
  body: string;
}

interface GitHubRelease {
  tag_name: string;
  name: string | null;
  published_at: string | null;
  prerelease: boolean;
  html_url: string;
  body: string | null;
}

const SOURCE_REPO = 'figueiredoluiz/vitest-dedup';

const byNewestFirst = (a: Release, b: Release): number =>
  Date.parse(b.publishedAt) - Date.parse(a.publishedAt);

// The fixture mirrors the GitHub Releases API shape and is the offline
// fallback so local development never blocks on the network.
const fixtureReleases: Release[] = [...(releasesJson as Release[])].sort(byNewestFirst);

const mapGitHubRelease = (release: GitHubRelease): Release => ({
  tagName: release.tag_name,
  name: release.name ?? release.tag_name,
  publishedAt: release.published_at ?? '',
  prerelease: release.prerelease,
  url: release.html_url,
  body: release.body ?? '',
});

const fetchReleases = async (): Promise<Release[] | null> => {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  try {
    const response = await fetch(
      `https://api.github.com/repos/${SOURCE_REPO}/releases?per_page=30`,
      { headers },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as GitHubRelease[];
    const releases = data
      .filter((release) => release.published_at)
      .map(mapGitHubRelease)
      .sort(byNewestFirst);
    return releases.length > 0 ? releases : null;
  } catch {
    return null;
  }
};

export const getReleases = async (): Promise<Release[]> =>
  (await fetchReleases()) ?? fixtureReleases;

export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(iso));
