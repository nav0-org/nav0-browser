<script setup>
import DefaultTheme from 'vitepress/theme';
import { useData } from 'vitepress';
import { computed } from 'vue';
import BlogPostHero from './components/BlogPostHero.vue';

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
      <template v-if="isBlogPost" #doc-before>
        <BlogPostHero />
      </template>
    </Layout>
  </div>
</template>
