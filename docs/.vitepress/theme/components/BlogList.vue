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
]
</script>
