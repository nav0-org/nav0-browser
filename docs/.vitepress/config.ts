import { defineConfig } from 'vitepress'

const siteUrl = 'https://nav0.org'
const siteName = 'nav0'
const siteDescription = 'A minimal, privacy-focused web browser. No data collection. No bloat. No AI gimmicks. Just clean, safe browsing.'
const ogImage = `${siteUrl}/og-image.png`

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
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],

    // Theme
    ['meta', { name: 'theme-color', content: '#1a1a1a' }],

    // Open Graph
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: siteName }],
    ['meta', { property: 'og:title', content: 'nav0 — Minimal Privacy Browser' }],
    ['meta', { property: 'og:description', content: siteDescription }],
    ['meta', { property: 'og:image', content: ogImage }],
    ['meta', { property: 'og:url', content: siteUrl }],
    ['meta', { property: 'og:locale', content: 'en_US' }],

    // Twitter Card
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'nav0 — Minimal Privacy Browser' }],
    ['meta', { name: 'twitter:description', content: siteDescription }],
    ['meta', { name: 'twitter:image', content: ogImage }],

    // Additional SEO
    ['meta', { name: 'author', content: 'nav0 Contributors' }],
    ['meta', { name: 'robots', content: 'index, follow' }],

    // JSON-LD: Organization
    ['script', { type: 'application/ld+json' }, JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'nav0',
      url: siteUrl,
      logo: `${siteUrl}/logo.svg`,
      description: 'An open-source, privacy-focused web browser project.',
      sameAs: [
        'https://github.com/nav0-org/nav0-browser'
      ]
    })],

    // JSON-LD: SoftwareApplication
    ['script', { type: 'application/ld+json' }, JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'nav0 Browser',
      description: 'A minimal, privacy-focused web browser built on Electron. No data collection. No bloat. No AI gimmicks.',
      url: siteUrl,
      applicationCategory: 'BrowserApplication',
      operatingSystem: 'Windows, macOS, Linux',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD'
      },
      license: 'https://opensource.org/licenses/MIT',
      isAccessibleForFree: true,
      downloadUrl: 'https://nav0.org/install',
      softwareVersion: '0.1.0',
      author: {
        '@type': 'Organization',
        name: 'nav0',
        url: siteUrl
      },
      featureList: [
        'Zero telemetry',
        'No data collection',
        'Tracker blocking',
        'Third-party cookie blocking',
        'HTTPS auto-upgrade',
        'Fingerprint protection',
        'Private browsing mode',
        'Process sandboxing',
        'Tab management',
        'Local bookmarks',
        'Download manager',
        'Open source',
        'Chromium engine',
        'Chrome DevTools'
      ]
    })],

    // JSON-LD: WebSite
    ['script', { type: 'application/ld+json' }, JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      url: siteUrl,
      description: siteDescription,
      publisher: {
        '@type': 'Organization',
        name: 'nav0',
        url: siteUrl
      }
    })],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'nav0',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Install', link: '/install' },
      { text: 'Blog', link: '/blog/' },
      { text: 'FAQ', link: '/faq' },
      { text: 'Privacy', link: '/guide/privacy' },
      {
        text: 'Links',
        items: [
          { text: 'GitHub', link: 'https://github.com/nav0-org/nav0-browser' }
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Features', link: '/guide/features' }
          ]
        },
        {
          text: 'Core Principles',
          items: [
            { text: 'Privacy', link: '/guide/privacy' },
            { text: 'Philosophy', link: '/guide/philosophy' }
          ]
        },
        {
          text: 'Community',
          items: [
            { text: 'Contributing', link: '/guide/contributing' }
          ]
        }
      ],
      '/blog/': [
        {
          text: 'Blog',
          items: [
            { text: 'All Posts', link: '/blog/' },
            { text: 'Your Browser Is Watching You', link: '/blog/your-browser-is-watching-you' },
            { text: 'Stop Forcing AI Into My Browser', link: '/blog/stop-forcing-ai-into-browsers' },
            { text: 'Your Browser Doesn\'t Need a VPN', link: '/blog/your-browser-doesnt-need-a-vpn' },
            { text: 'Big Tech Owns Your Browser', link: '/blog/big-tech-owns-your-browser' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/nav0-org/nav0-browser' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright nav0 Contributors'
    },

    search: {
      provider: 'local'
    }
  },

  transformPageData(pageData) {
    const canonicalUrl = `${siteUrl}/${pageData.relativePath}`
      .replace(/index\.md$/, '')
      .replace(/\.md$/, '')

    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push(
      ['link', { rel: 'canonical', href: canonicalUrl }],
      ['meta', { property: 'og:url', content: canonicalUrl }]
    )
  }
})
