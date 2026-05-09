<script setup>
import DefaultTheme from 'vitepress/theme';
import { useData } from 'vitepress';
import { computed } from 'vue';
import BlogPostHero from './components/BlogPostHero.vue';
import BlogPostMetaRail from './components/BlogPostMetaRail.vue';

const { Layout } = DefaultTheme;
const { page } = useData();

const isBlogPost = computed(
  () => page.value.relativePath.startsWith('blog/') && page.value.relativePath !== 'blog/index.md'
);
</script>

<template>
  <div class="nav0-bg">
    <div class="nav0-bg-pattern"></div>
    <div class="nav0-bg-vignette"></div>
    <Layout>
      <template #doc-top>
        <BlogPostHero v-if="isBlogPost" />
      </template>
      <template #doc-before>
        <BlogPostMetaRail v-if="isBlogPost" />
      </template>
    </Layout>
  </div>
</template>
