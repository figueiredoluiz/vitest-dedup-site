import releasesJson from '../data/releases.json';

export interface Release {
  tagName: string;
  name: string;
  publishedAt: string;
  prerelease: boolean;
  url: string;
  body: string;
}

const byNewestFirst = (a: Release, b: Release): number =>
  Date.parse(b.publishedAt) - Date.parse(a.publishedAt);

export const releases: Release[] = [...(releasesJson as Release[])].sort(byNewestFirst);

export const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(iso));
