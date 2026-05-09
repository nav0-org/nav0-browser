<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';

const { frontmatter } = useData();

const eyebrow = computed(() => frontmatter.value.eyebrow as string | undefined);
const title = computed(() => {
  const t = frontmatter.value.title as string | undefined;
  // Strip any " — ..." subtitle suffix that pages use for SEO titles.
  return (t || '').split('—')[0].trim();
});
const tagline = computed(() => frontmatter.value.tagline as string | undefined);
const effective = computed(() => frontmatter.value.effective as string | undefined);
const lastUpdated = computed(() => frontmatter.value.lastUpdated as string | undefined);
const version = computed(() => frontmatter.value.version as string | undefined);
const versionIcon = computed(() => (frontmatter.value.versionIcon as string) || 'file');
</script>

<template>
  <section class="lp-hero">
    <div class="lp-hero-inner">
      <div v-if="eyebrow" class="lp-eyebrow">{{ eyebrow }}</div>
      <h1 v-if="title" class="lp-title">{{ title }}</h1>
      <p v-if="tagline" class="lp-tagline">{{ tagline }}</p>
      <div v-if="effective || lastUpdated || version" class="lp-meta-row">
        <span v-if="effective" class="lp-pill">
          <svg
            class="lp-pill-ico"
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <strong>Effective</strong>
          <span class="lp-pill-mono">{{ effective }}</span>
        </span>
        <span v-if="lastUpdated" class="lp-pill">
          <svg
            class="lp-pill-ico"
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path
              d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
            ></path>
          </svg>
          <strong>Last updated</strong>
          <span class="lp-pill-mono">{{ lastUpdated }}</span>
        </span>
        <span v-if="version" class="lp-pill">
          <svg
            v-if="versionIcon === 'alert'"
            class="lp-pill-ico"
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <svg
            v-else
            class="lp-pill-ico"
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <span class="lp-pill-mono">{{ version }}</span>
        </span>
      </div>
    </div>
  </section>
</template>
