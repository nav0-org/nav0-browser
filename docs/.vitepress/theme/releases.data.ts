import { createContentLoader } from 'vitepress';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

function loadHeadlinesFromIndex(): Map<string, string> {
  const indexPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../releases/index.md');
  const out = new Map<string, string>();
  let content: string;
  try {
    content = readFileSync(indexPath, 'utf-8');
  } catch {
    return out;
  }
  // Extract release-list-item blocks: pair href with release-excerpt
  const itemRe = /href="(\/releases\/[^"]+?)"[\s\S]*?<p class="release-excerpt">([\s\S]*?)<\/p>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRe.exec(content))) {
    const url = match[1].endsWith('/') ? match[1] : match[1] + '';
    const text = match[2].replace(/\s+/g, ' ').trim();
    out.set(url, text);
  }
  // Latest hero excerpt: first paragraph between <ReleasesLatestHero> and <template
  const heroRe = /<ReleasesLatestHero[^>]*>([\s\S]*?)<template/;
  const heroMatch = heroRe.exec(content);
  if (heroMatch) {
    const text = heroMatch[1].replace(/\s+/g, ' ').trim();
    if (text) out.set('__latest__', text);
  }
  return out;
}

const indexHeadlines = loadHeadlinesFromIndex();

function extractFirstParagraph(src: string): string {
  if (!src) return '';
  const body = src.replace(/^---\n[\s\S]*?\n---\n/, '');
  const lines = body.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('<')) continue;
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) continue;
    if (trimmed.startsWith('```')) continue;
    if (trimmed.startsWith('---')) continue;
    return trimmed;
  }
  return '';
}

export interface ReleaseSummary {
  version: string;
  url: string;
  date: string;
  dateLong: string;
  dateShort: string;
  isAlpha: boolean;
  badge?: string;
  headline: string;
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
  includeSrc: true,
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

        // Headline resolution order:
        //   1) frontmatter.headline (explicit override)
        //   2) <p class="release-excerpt"> from index.md
        //   3) first paragraph in source body
        //   4) generic placeholder
        const fmHeadline = page.frontmatter.headline as string | undefined;
        const indexHeadline = indexHeadlines.get(page.url);
        const srcHeadline = extractFirstParagraph(page.src || '');
        const headline =
          fmHeadline || indexHeadline || srcHeadline || `Released ${formatDate(dateStr)}.`;

        return {
          version: title,
          url: page.url,
          date: dateStr,
          dateLong: formatDate(dateStr),
          dateShort: shortDate(dateStr),
          isAlpha,
          badge,
          headline,
        };
      })
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));

    // For the latest release, prefer the index.md hero excerpt over the cards
    if (all.length > 0) {
      const heroExcerpt = indexHeadlines.get('__latest__');
      if (heroExcerpt) all[0].headline = heroExcerpt;
    }

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
