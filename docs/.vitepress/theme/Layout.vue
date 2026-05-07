<script setup>
import DefaultTheme from 'vitepress/theme';
import { useData } from 'vitepress';
import { computed } from 'vue';

const { Layout } = DefaultTheme;
const { page } = useData();
const isGuide = computed(() => page.value.relativePath.startsWith('guide/'));
</script>

<template>
  <div class="nav0-bg" :class="{ 'nav0-guide': isGuide }">
    <div class="nav0-bg-pattern"></div>
    <div class="nav0-bg-vignette"></div>
    <Layout />
  </div>
</template>
