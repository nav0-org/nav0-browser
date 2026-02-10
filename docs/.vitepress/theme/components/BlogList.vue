<template>
  <div class="blog-section">
    <h2>From the Blog</h2>
    <p class="section-subtitle">Thoughts on privacy, browsers, and the open web.</p>

    <div class="blog-cards">
      <a v-for="post in posts" :key="post.url" :href="post.url" class="blog-card">
        <span class="blog-tag">{{ post.tag }}</span>
        <h3>{{ post.title }}</h3>
        <p>{{ post.excerpt }}</p>
        <span class="blog-meta">{{ post.date }} &middot; {{ post.readTime }}</span>
      </a>
    </div>

    <div class="blog-view-all">
      <a href="/blog/">View all posts &rarr;</a>
    </div>
  </div>
</template>

<script setup>
const posts = [
  {
    title: 'Your Browser Is Watching You: The Hidden Cost of "Free" Browsing',
    excerpt: 'Modern browsers collect an astonishing amount of data about you. We break down exactly what they track, why it matters, and what you can do about it.',
    tag: 'Privacy',
    date: 'Feb 10, 2026',
    readTime: '8 min read',
    url: '/blog/your-browser-is-watching-you'
  },
  {
    title: 'Stop Forcing AI Into My Browser',
    excerpt: 'Every major browser is cramming AI features into their product. Nobody asked for this. Here\'s why forced AI integration is bad for users, bad for privacy, and bad for the web.',
    tag: 'AI & Bloat',
    date: 'Feb 8, 2026',
    readTime: '7 min read',
    url: '/blog/stop-forcing-ai-into-browsers'
  },
  {
    title: 'Your Browser Doesn\'t Need a Built-In VPN',
    excerpt: 'Browsers are shipping with built-in VPN services and calling it a privacy feature. It\'s not. Here\'s why browser VPNs are security theater and what you should use instead.',
    tag: 'Security',
    date: 'Feb 6, 2026',
    readTime: '7 min read',
    url: '/blog/your-browser-doesnt-need-a-vpn'
  },
  {
    title: 'Big Tech Owns Your Browser',
    excerpt: 'Google, Microsoft, and Apple control how billions of people access the web. When your browser is made by an ad company or a platform gatekeeper, whose interests does it really serve?',
    tag: 'Open Web',
    date: 'Feb 4, 2026',
    readTime: '8 min read',
    url: '/blog/big-tech-owns-your-browser'
  },
]
</script>
