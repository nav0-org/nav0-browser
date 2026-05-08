import { defineConfig } from 'vitepress';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import packageJson from '../../package.json';

function getReleaseSidebar() {
  const releasesDir = resolve(dirname(fileURLToPath(import.meta.url)), '../releases');
  const files = readdirSync(releasesDir).filter((f) => f.endsWith('.md') && f !== 'index.md');

  const releases = files
    .map((file) => {
      const content = readFileSync(resolve(releasesDir, file), 'utf-8');
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (!match) return null;

      const frontmatter = match[1];
      const titleMatch = frontmatter.match(/title:\s*(["'])(.+?)\1/);
      const dateMatch = frontmatter.match(/^date:\s*(\S+)/m);

      return {
        text: titleMatch?.[2] || file.replace('.md', ''),
        date: dateMatch?.[1] || '',
        link: `/releases/${file.replace('.md', '')}`,
      };
    })
    .filter((r): r is { text: string; date: string; link: string } => r !== null);

  releases.sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return [
    {
      text: 'Release Notes',
      items: [
        { text: 'All Releases', link: '/releases/' },
        ...releases.map(({ text, link }) => ({ text, link })),
      ],
    },
  ];
}

function getBlogSidebar() {
  const blogDir = resolve(dirname(fileURLToPath(import.meta.url)), '../blog');
  const files = readdirSync(blogDir).filter((f) => f.endsWith('.md') && f !== 'index.md');

  const posts = files
    .map((file) => {
      const content = readFileSync(resolve(blogDir, file), 'utf-8');
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (!match) return null;

      const frontmatter = match[1];
      const titleMatch = frontmatter.match(/title:\s*(["'])(.+?)\1/);
      const dateMatch = frontmatter.match(/^date:\s*(\S+)/m);

      return {
        text: titleMatch?.[2] || file.replace('.md', ''),
        date: dateMatch?.[1] || '',
        link: `/blog/${file.replace('.md', '')}`,
      };
    })
    .filter((p): p is { text: string; date: string; link: string } => p !== null);

  posts.sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return [
    {
      text: 'Blog',
      items: [
        { text: 'All Posts', link: '/blog/' },
        ...posts.map(({ text, link }) => ({ text, link })),
      ],
    },
  ];
}

const siteUrl = 'https://nav0.org';
const siteName = 'Nav0';
const siteDescription =
  'A minimal, privacy-focused web browser. No data collection. No bloat. No AI gimmicks. Just clean, safe browsing.';
const ogImage = `${siteUrl}/og-image.png`;

const softwareAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Nav0 Browser',
  description:
    'A minimal, privacy-focused web browser built on Electron. No data collection. No bloat. No AI gimmicks.',
  url: siteUrl,
  applicationCategory: 'BrowserApplication',
  operatingSystem: 'Windows, macOS, Linux',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  license: 'https://opensource.org/licenses/MIT',
  isAccessibleForFree: true,
  downloadUrl: 'https://nav0.org/install',
  softwareVersion: packageJson.version,
  author: {
    '@type': 'Organization',
    name: 'Nav0',
    url: siteUrl,
  },
  featureList: [
    'Zero telemetry',
    'No data collection',
    'Built-in ad blocker',
    'Tracker blocking',
    'Third-party cookie blocking',
    'HTTPS auto-upgrade',
    'Fingerprint protection',
    'User agent spoofing',
    'Private browsing mode',
    'Tab hibernation',
    'Tab pinning',
    'Customizable keyboard shortcuts',
    'Data retention and auto-delete',
    'Proxy configuration',
    'Process sandboxing',
    'Tab management',
    'Local bookmarks',
    'Download manager',
    'Reader mode',
    'PDF viewer',
    'Find in page with regex',
    'Browser notifications',
    'Open source',
    'Chromium engine',
    'Chrome DevTools',
  ],
};

const sectionNames: Record<string, { name: string; link: string }> = {
  blog: { name: 'Blog', link: '/blog/' },
  guide: { name: 'Guide', link: '/guide/getting-started' },
  releases: { name: 'Release Notes', link: '/releases/' },
};

export default defineConfig({
  title: siteName,
  description: siteDescription,
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,

  sitemap: {
    hostname: siteUrl,
  },

  head: [
    // Favicon
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],

    // Theme
    ['meta', { name: 'theme-color', content: '#1a1a1a' }],

    // Open Graph
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: siteName }],
    ['meta', { property: 'og:title', content: 'Nav0 — Minimal Privacy Browser' }],
    ['meta', { property: 'og:description', content: siteDescription }],
    ['meta', { property: 'og:image', content: ogImage }],
    ['meta', { property: 'og:url', content: siteUrl }],
    ['meta', { property: 'og:locale', content: 'en_US' }],

    // Twitter Card
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'Nav0 — Minimal Privacy Browser' }],
    ['meta', { name: 'twitter:description', content: siteDescription }],
    ['meta', { name: 'twitter:image', content: ogImage }],

    // Google Search Console
    [
      'meta',
      { name: 'google-site-verification', content: '9xATJZCv2SiLHb9BMJXHLSOqzbddjf7m2CQWwIqI1I0' },
    ],

    // Additional SEO
    ['meta', { name: 'author', content: 'Nav0 Contributors' }],
    ['meta', { name: 'robots', content: 'index, follow' }],

    // JSON-LD: Organization
    [
      'script',
      { type: 'application/ld+json' },
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Nav0',
        url: siteUrl,
        logo: `${siteUrl}/logo.webp`,
        description: 'An open-source, privacy-focused web browser project.',
        sameAs: ['https://github.com/nav0-org/nav0-browser'],
      }),
    ],

    // JSON-LD: WebSite
    [
      'script',
      { type: 'application/ld+json' },
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteName,
        url: siteUrl,
        description: siteDescription,
        publisher: {
          '@type': 'Organization',
          name: 'Nav0',
          url: siteUrl,
        },
      }),
    ],
  ],

  themeConfig: {
    logo: '/logo.webp',
    siteTitle: 'Nav0',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Install', link: '/install' },
      { text: 'Blog', link: '/blog/' },
      { text: 'Release Notes', link: '/releases/' },
      {
        text: 'Links',
        items: [
          { text: 'FAQ', link: '/faq' },
          { text: 'Privacy Policy', link: '/privacy-policy' },
          { text: 'Terms of Use', link: '/terms-of-use' },
          { text: 'Disclaimer', link: '/disclaimer' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Features', link: '/guide/features' },
          ],
        },
        {
          text: 'Feature Guides',
          items: [
            { text: 'Ad Blocker', link: '/guide/ad-blocker' },
            { text: 'Privacy & Tracking Protection', link: '/guide/privacy-protection' },
            { text: 'Private Browsing', link: '/guide/private-browsing' },
            { text: 'Tab Management', link: '/guide/tab-management' },
            { text: 'Keyboard Shortcuts', link: '/guide/keyboard-shortcuts' },
          ],
        },
        {
          text: 'Un-features',
          items: [{ text: "What Nav0 Doesn't Do", link: '/guide/un-features' }],
        },
        {
          text: 'Core Principles',
          items: [
            { text: 'Privacy', link: '/guide/privacy' },
            { text: 'Philosophy', link: '/guide/philosophy' },
          ],
        },
        {
          text: 'Community',
          items: [{ text: 'Contributing', link: '/guide/contributing' }],
        },
      ],
      '/blog/': getBlogSidebar(),
      '/releases/': getReleaseSidebar(),
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/nav0-org/nav0-browser' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright Ketan Patil',
    },

    search: {
      provider: 'local',
    },
  },

  transformPageData(pageData) {
    const canonicalUrl = `${siteUrl}/${pageData.relativePath}`
      .replace(/index\.md$/, '')
      .replace(/\.md$/, '');

    pageData.frontmatter.head ??= [];
    pageData.frontmatter.head.push(
      ['link', { rel: 'canonical', href: canonicalUrl }],
      ['meta', { property: 'og:url', content: canonicalUrl }]
    );

    if (pageData.relativePath === 'blog/index.md') {
      pageData.frontmatter.pageClass = 'blog-list-page';
    } else if (pageData.relativePath.startsWith('blog/')) {
      pageData.frontmatter.pageClass = 'blog-post-page';
      pageData.frontmatter.sidebar = false;
      pageData.frontmatter.aside = false;
    }

    // Inject SoftwareApplication schema only on relevant pages
    const softwareAppPages = ['index.md', 'install.md', 'guide/features.md'];
    if (softwareAppPages.includes(pageData.relativePath)) {
      pageData.frontmatter.head.push([
        'script',
        { type: 'application/ld+json' },
        JSON.stringify(softwareAppSchema),
      ]);
    }

    // Inject BreadcrumbList JSON-LD for all content pages
    const segments = pageData.relativePath.replace(/\.md$/, '').split('/');
    const isIndex = segments[segments.length - 1] === 'index';
    const section = segments.length > 1 ? segments[0] : null;
    const pageTitle = pageData.frontmatter.title || pageData.title || segments[segments.length - 1];

    const breadcrumbItems: Array<{
      '@type': string;
      position: number;
      name: string;
      item?: string;
    }> = [{ '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl }];

    if (section && sectionNames[section]) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: sectionNames[section].name,
        item: `${siteUrl}${sectionNames[section].link}`,
      });

      if (!isIndex) {
        breadcrumbItems.push({
          '@type': 'ListItem',
          position: 3,
          name: pageTitle,
        });
      }
    } else if (pageData.relativePath !== 'index.md') {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: pageTitle,
      });
    }

    if (breadcrumbItems.length > 1) {
      pageData.frontmatter.head.push([
        'script',
        { type: 'application/ld+json' },
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: breadcrumbItems,
        }),
      ]);
    }

    // Inject dateModified into Article JSON-LD for blog posts
    if (pageData.relativePath.startsWith('blog/') && pageData.frontmatter.date) {
      const dateStr =
        typeof pageData.frontmatter.date === 'string'
          ? pageData.frontmatter.date
          : new Date(pageData.frontmatter.date).toISOString().split('T')[0];

      for (const entry of pageData.frontmatter.head) {
        if (
          Array.isArray(entry) &&
          entry[0] === 'script' &&
          entry[1]?.type === 'application/ld+json' &&
          typeof entry[2] === 'string'
        ) {
          try {
            const jsonLd = JSON.parse(entry[2]);
            if (jsonLd['@type'] === 'Article' && !jsonLd.dateModified) {
              jsonLd.dateModified = jsonLd.datePublished || dateStr;
              entry[2] = JSON.stringify(jsonLd);
            }
          } catch {
            // Skip malformed JSON-LD entries
          }
        }
      }
    }
  },
});
