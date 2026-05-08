import { createContentLoader } from 'vitepress';

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function shortDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export interface ReleaseSummary {
  version: string;
  url: string;
  date: string;
  dateLong: string;
  dateShort: string;
  isAlpha: boolean;
  badge?: string;
}

export interface ReleasesData {
  all: ReleaseSummary[];
  latest: ReleaseSummary | null;
  totalCount: number;
  cadenceDays: number | null;
}

declare const data: ReleasesData;
export { data };

export default createContentLoader('releases/v*.md', {
  transform(rawData): ReleasesData {
    const all = rawData
      .map<ReleaseSummary>((page) => {
        const title = (page.frontmatter.title as string) || page.url.split('/').pop() || '';
        const badge = page.frontmatter.badge as string | undefined;
        const isAlpha = (badge || '').toLowerCase().includes('alpha') || /-alpha/.test(title);
        const dateStr =
          typeof page.frontmatter.date === 'string'
            ? page.frontmatter.date
            : new Date(page.frontmatter.date as Date).toISOString().split('T')[0];
        return {
          version: title,
          url: page.url,
          date: dateStr,
          dateLong: formatDate(dateStr),
          dateShort: shortDate(dateStr),
          isAlpha,
          badge,
        };
      })
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));

    let cadenceDays: number | null = null;
    if (all.length >= 2) {
      const newest = +new Date(all[0].date);
      const oldest = +new Date(all[all.length - 1].date);
      const spanDays = (newest - oldest) / (1000 * 60 * 60 * 24);
      cadenceDays = Math.round(spanDays / (all.length - 1));
    }

    return {
      all,
      latest: all[0] ?? null,
      totalCount: all.length,
      cadenceDays,
    };
  },
});
