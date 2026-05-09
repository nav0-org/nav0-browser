<script setup lang="ts">
import { useData } from 'vitepress';
import { computed } from 'vue';
import { data as releases } from '../releases.data';

const { page, frontmatter } = useData();

const current = computed(() => {
  const url = page.value.relativePath
    .replace(/\.md$/, '')
    .replace(/^/, '/')
    .replace(/^\/+/, '/');
  // The data loader uses cleanUrls (no .html) — match by URL ending
  return (
    releases.all.find((r) => r.url === url || url.endsWith(r.url)) ??
    releases.all.find((r) => r.version === (frontmatter.value.title as string)) ??
    null
  );
});

const isLatest = computed(() => {
  if (!current.value || !releases.latest) return false;
  return current.value.url === releases.latest.url;
});

const isAlpha = computed(() => current.value?.isAlpha ?? false);

const headline = computed(
  () => current.value?.headline || `Release ${current.value?.version ?? ''}.`
);

const tagText = computed(() => {
  if (!current.value) return '';
  if (isAlpha.value) return `Alpha · ${current.value.dateLong}`;
  if (isLatest.value) return `Latest stable · ${current.value.dateLong}`;
  return `Released ${current.value.dateLong}`;
});

const version = computed(
  () => current.value?.version || (frontmatter.value.title as string) || ''
);
</script>

<template>
  <section class="rel-detail-hero" v-if="current">
    <div class="rel-detail-hero-inner">
      <nav class="rel-detail-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Nav0</a>
        <span class="sep">›</span>
        <a href="/releases/">Releases</a>
        <span class="sep">›</span>
        <span class="current">{{ version }}</span>
      </nav>

      <div class="rel-detail-tag" :class="{ 'is-alpha': isAlpha }">
        <span class="rel-detail-pulse" v-if="isLatest" aria-hidden="true"></span>
        {{ tagText }}
      </div>

      <h1 class="rel-detail-version">{{ version }}</h1>

      <p class="rel-detail-headline">{{ headline }}</p>

      <div class="rel-detail-cta-row">
        <a class="rel-detail-cta-primary" href="/install">Download Nav0</a>
        <a class="rel-detail-cta-secondary" href="#" onclick="window.scrollTo({top:document.querySelector('.vp-doc')?.getBoundingClientRect().top+window.scrollY-80,behavior:'smooth'});return false;">
          Read all changes
        </a>
        <a
          class="rel-detail-cta-secondary"
          :href="`https://github.com/nav0-org/nav0-browser/releases/tag/${version}`"
          target="_blank"
          rel="noopener"
        >
          View on GitHub ›
        </a>
      </div>
    </div>
  </section>
</template>
