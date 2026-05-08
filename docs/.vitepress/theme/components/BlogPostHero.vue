<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { data as posts } from '../posts.data';

const { page, frontmatter } = useData();

const post = computed(() => {
  const slug = page.value.relativePath.replace(/^blog\//, '').replace(/\.md$/, '');
  return posts.find((p) => p.slug === slug);
});

const title = computed(() => frontmatter.value.title || post.value?.title || '');
const category = computed(() => post.value?.category || '');
const longDate = computed(() => post.value?.longDate || '');
const readTime = computed(() => post.value?.readTime || '');
const author = computed(() => post.value?.author || 'Nav0 Team');

// Short crumb — drop the colon-suffix subtitle that many posts use
const breadcrumbTitle = computed(() => title.value.split(':')[0].trim());
</script>

<template>
  <section v-if="post" class="bp-hero">
    <div class="bp-hero-inner">
      <div class="bp-breadcrumb">
        <a href="/">Nav0</a>
        <span class="bp-sep">›</span>
        <a href="/blog/">Blog</a>
        <span class="bp-sep">›</span>
        <span>{{ breadcrumbTitle }}</span>
      </div>
      <div class="bp-eyebrow">
        <span class="bp-tag">{{ category }}</span>
      </div>
      <h1 class="bp-headline">{{ title }}</h1>
      <div class="bp-byline">
        <span class="bp-author">
          <span class="bp-avatar">N0</span>
          {{ author }}
        </span>
        <span class="bp-dot"></span>
        <span>{{ longDate }}</span>
        <span class="bp-dot"></span>
        <span>{{ readTime }}</span>
      </div>
    </div>
  </section>
</template>
