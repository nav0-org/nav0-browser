<template>
  <div class="blog-section">
    <h2>From the Blog</h2>
    <p class="section-subtitle">Thoughts on privacy, browsers, and the open web.</p>

    <div class="blog-cards">
      <a v-for="post in latestPosts" :key="post.url" :href="post.url" class="blog-card">
        <span class="blog-tag">{{ post.tag }}</span>
        <h3>{{ post.title }}</h3>
        <p>{{ post.excerpt }}</p>
        <span class="blog-meta"
          >By {{ post.author }} &middot; {{ post.date }} &middot; {{ post.readTime }}</span
        >
      </a>
    </div>

    <div class="blog-view-all">
      <a href="/blog/">View all posts &rarr;</a>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { data as posts } from '../posts.data';

const latestPosts = computed(() => posts.slice(0, 6));
</script>
