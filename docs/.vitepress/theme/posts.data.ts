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

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export interface BlogPost {
  title: string;
  url: string;
  date: string;
  excerpt: string;
  tag: string;
  readTime: string;
  author: string;
}

declare const data: BlogPost[];
export { data };

export default createContentLoader('blog/*.md', {
  includeSrc: true,
  transform(rawData): BlogPost[] {
    return rawData
      .filter((page) => page.url !== '/blog/')
      .sort((a, b) => +new Date(b.frontmatter.date) - +new Date(a.frontmatter.date))
      .map((page) => ({
        title: page.frontmatter.title,
        url: page.url,
        date: formatDate(page.frontmatter.date),
        excerpt: page.frontmatter.description,
        tag: formatTag(page.frontmatter.tags?.[0] || 'blog'),
        readTime: calculateReadTime(page.src || ''),
        author: page.frontmatter.author || 'Nav0 Team',
      }));
  },
});
