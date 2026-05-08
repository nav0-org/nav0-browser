<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import { useData } from 'vitepress';
import { computed } from 'vue';
import ReleaseDetailHero from './components/ReleaseDetailHero.vue';
import ReleaseDetailSidebar from './components/ReleaseDetailSidebar.vue';

const { Layout } = DefaultTheme;
const { page } = useData();

const isReleaseDetail = computed(() => {
  const path = page.value.relativePath || '';
  return path.startsWith('releases/') && path !== 'releases/index.md';
});
</script>

<template>
  <div class="nav0-bg">
    <div class="nav0-bg-pattern"></div>
    <div class="nav0-bg-vignette"></div>
    <Layout>
      <template v-if="isReleaseDetail" #page-top>
        <ReleaseDetailHero />
      </template>
      <template v-if="isReleaseDetail" #page-bottom>
        <ReleaseDetailSidebar />
      </template>
    </Layout>
  </div>
</template>
