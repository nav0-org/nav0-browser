import { createContentLoader } from 'vitepress';

function formatTag(tag: string): string {
  const acronyms = ['ai', 'vpn'];
  return tag
    .split('-')
    .map((word) =>
      acronyms.includes(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ');
}

function calculateReadTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

function shortReadTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min`;
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatLongDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const ART_BY_TAG: Record<string, { gradient: string; glyph: string; ink?: string }> = {
  opera: { gradient: 'linear-gradient(135deg, #c43c3c 0%, #ff5e7a 100%)', glyph: 'O' },
  performance: { gradient: 'linear-gradient(135deg, #1f8b4c 0%, #00b4c8 100%)', glyph: '↓' },
  comet: { gradient: 'linear-gradient(135deg, #2a2a48 0%, #6e6e9c 100%)', glyph: 'C' },
  duckduckgo: {
    gradient: 'linear-gradient(135deg, #ff8c20 0%, #ffd066 100%)',
    glyph: 'D',
    ink: '#5a3300',
  },
  edge: { gradient: 'linear-gradient(135deg, #0071e3 0%, #00b4c8 100%)', glyph: 'E' },
  brave: { gradient: 'linear-gradient(135deg, #ff5e3a 0%, #b347d9 100%)', glyph: 'B' },
  firefox: { gradient: 'linear-gradient(135deg, #ff7b20 0%, #c43c3c 100%)', glyph: 'F' },
  chrome: { gradient: 'linear-gradient(135deg, #4a4f5c 0%, #b3b7c3 100%)', glyph: 'C' },
  arc: { gradient: 'linear-gradient(135deg, #ff5e7a 0%, #b347d9 100%)', glyph: 'A' },
  vivaldi: { gradient: 'linear-gradient(135deg, #c43c3c 0%, #424245 100%)', glyph: 'V' },
  safari: { gradient: 'linear-gradient(135deg, #00b4c8 0%, #4ea7ff 100%)', glyph: 'S' },
  tor: { gradient: 'linear-gradient(135deg, #b347d9 0%, #424245 100%)', glyph: 'T' },
  privacy: { gradient: 'linear-gradient(135deg, #ff7b20 0%, #c43c3c 100%)', glyph: 'P' },
  security: { gradient: 'linear-gradient(135deg, #1d1d1f 0%, #6e6e73 100%)', glyph: 'S' },
  ai: { gradient: 'linear-gradient(135deg, #6e6e9c 0%, #2a2a48 100%)', glyph: 'Ai' },
  data: {
    gradient: 'linear-gradient(135deg, #00b4c8 0%, #ffd066 100%)',
    glyph: '↓',
    ink: '#1d1d1f',
  },
  'open-web': { gradient: 'linear-gradient(135deg, #b347d9 0%, #0071e3 100%)', glyph: '↗' },
  'indie-browsers': { gradient: 'linear-gradient(135deg, #b347d9 0%, #0071e3 100%)', glyph: '↗' },
  'data-consumption': {
    gradient: 'linear-gradient(135deg, #00b4c8 0%, #ffd066 100%)',
    glyph: '↓',
    ink: '#1d1d1f',
  },
};

const FALLBACK_ART = {
  gradient: 'linear-gradient(135deg, #4a4f5c 0%, #b3b7c3 100%)',
  glyph: '·',
};

const CATEGORY_BY_TAG: Record<string, string> = {
  privacy: 'Privacy',
  comparison: 'Comparisons',
  performance: 'Performance',
  security: 'Privacy',
  'open-web': 'Indie web',
  'indie-browsers': 'Indie web',
  ai: 'Privacy',
  bloat: 'Privacy',
  'data-consumption': 'Performance',
  data: 'Performance',
  electron: 'Engineering',
  engineering: 'Engineering',
  browsers: 'Comparisons',
  opera: 'Comparisons',
  comet: 'Comparisons',
  edge: 'Comparisons',
  brave: 'Comparisons',
  firefox: 'Comparisons',
  chrome: 'Comparisons',
  arc: 'Comparisons',
  vivaldi: 'Comparisons',
  safari: 'Comparisons',
  tor: 'Comparisons',
  duckduckgo: 'Comparisons',
};

function pickArt(tags: string[]): { gradient: string; glyph: string; ink?: string } {
  for (const t of tags) {
    if (ART_BY_TAG[t]) return ART_BY_TAG[t];
  }
  return FALLBACK_ART;
}

function pickCategory(tags: string[]): string {
  for (const t of tags) {
    if (CATEGORY_BY_TAG[t]) return CATEGORY_BY_TAG[t];
  }
  return 'Privacy';
}

export interface BlogPost {
  title: string;
  url: string;
  slug: string;
  date: string;
  longDate: string;
  excerpt: string;
  tag: string;
  category: string;
  readTime: string;
  shortReadTime: string;
  author: string;
  artGradient: string;
  artGlyph: string;
  artInk?: string;
}

declare const data: BlogPost[];
export { data };

export default createContentLoader('blog/*.md', {
  includeSrc: true,
  transform(rawData): BlogPost[] {
    return rawData
      .filter((page) => page.url !== '/blog/')
      .sort((a, b) => +new Date(b.frontmatter.date) - +new Date(a.frontmatter.date))
      .map((page) => {
        const tags: string[] = page.frontmatter.tags || [];
        const art = pickArt(tags);
        return {
          title: page.frontmatter.title,
          url: page.url,
          slug: page.url.replace(/^\/blog\//, '').replace(/\/$/, ''),
          date: formatDate(page.frontmatter.date),
          longDate: formatLongDate(page.frontmatter.date),
          excerpt: page.frontmatter.description,
          tag: formatTag(tags[0] || 'blog'),
          category: pickCategory(tags),
          readTime: calculateReadTime(page.src || ''),
          shortReadTime: shortReadTime(page.src || ''),
          author: page.frontmatter.author || 'Nav0 Team',
          artGradient: art.gradient,
          artGlyph: art.glyph,
          artInk: art.ink,
        };
      });
  },
});
