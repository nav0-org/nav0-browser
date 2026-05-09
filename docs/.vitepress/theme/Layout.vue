<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import { useData } from 'vitepress';
import { computed } from 'vue';
import BlogPostHero from './components/BlogPostHero.vue';
import BlogPostMetaRail from './components/BlogPostMetaRail.vue';
import ReleaseDetailHero from './components/ReleaseDetailHero.vue';
import ReleaseDetailSidebar from './components/ReleaseDetailSidebar.vue';
import LegalPageHero from './components/LegalPageHero.vue';
import LegalPageTOC from './components/LegalPageTOC.vue';

const { Layout } = DefaultTheme;
const { page } = useData();

const isBlogPost = computed(
  () => page.value.relativePath.startsWith('blog/') && page.value.relativePath !== 'blog/index.md'
);
const isReleaseDetail = computed(() => {
  const path = page.value.relativePath || '';
  return path.startsWith('releases/') && path !== 'releases/index.md';
});
const isLegalPage = computed(() => {
  const path = page.value.relativePath || '';
  return path === 'disclaimer.md' || path === 'terms-of-use.md' || path === 'privacy-policy.md';
});
const isGuidePage = computed(() => {
  const path = page.value.relativePath || '';
  return path.startsWith('guide/');
});
const showDocHero = computed(() => isLegalPage.value || isGuidePage.value);
</script>

<template>
  <div class="nav0-bg">
    <div class="nav0-bg-pattern"></div>
    <div class="nav0-bg-vignette"></div>
    <Layout>
      <template #doc-top>
        <BlogPostHero v-if="isBlogPost" />
        <LegalPageHero v-if="showDocHero" />
      </template>
      <template #doc-before>
        <BlogPostMetaRail v-if="isBlogPost" />
        <LegalPageTOC v-if="showDocHero" />
      </template>
      <template v-if="isReleaseDetail" #page-top>
        <ReleaseDetailHero />
      </template>
      <template v-if="isReleaseDetail" #page-bottom>
        <ReleaseDetailSidebar />
      </template>
    </Layout>
  </div>
</template>
