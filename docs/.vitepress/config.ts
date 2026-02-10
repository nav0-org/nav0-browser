import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'nav0',
  description: 'A minimal, privacy-focused web browser',

  head: [
    ['meta', { name: 'theme-color', content: '#1a1a1a' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'nav0 - Minimal Privacy Browser' }],
    ['meta', { name: 'og:description', content: 'A minimal, privacy-focused web browser built on Electron. No data collection. No bloat. Just browsing.' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Blog', link: '/blog/' },
      { text: 'Privacy', link: '/guide/privacy' },
      {
        text: 'Links',
        items: [
          { text: 'GitHub', link: 'https://github.com/nav0-org/nav0-browser' },
          { text: 'Releases', link: 'https://github.com/nav0-org/nav0-browser/releases' }
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
            { text: 'Your Browser Is Watching You', link: '/blog/your-browser-is-watching-you' }
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
  }
})
