<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useData, useRoute } from 'vitepress';

interface Header {
  level: number;
  title: string;
  link?: string;
  slug?: string;
  anchor?: string;
}

const { page } = useData();
const route = useRoute();

const topHeaders = computed<Header[]>(() => {
  const all = (page.value.headers || []) as Header[];
  return all.filter((h) => h.level === 2);
});

const activeId = ref('');

function slugFor(h: Header): string {
  return (h.link || '').replace(/^#/, '') || h.slug || h.anchor || '';
}

function updateActive() {
  const ids = topHeaders.value.map(slugFor).filter(Boolean);
  if (!ids.length) return;
  const offset = 120;
  let current = ids[0];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.getBoundingClientRect().top - offset <= 0) {
      current = id;
    }
  }
  activeId.value = current;
}

let observer: IntersectionObserver | null = null;

function setupObserver() {
  if (typeof window === 'undefined') return;
  const ids = topHeaders.value.map(slugFor).filter(Boolean);
  observer?.disconnect();
  observer = new IntersectionObserver(() => updateActive(), {
    rootMargin: '-120px 0px -60% 0px',
    threshold: 0,
  });
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  }
}

onMounted(() => {
  setupObserver();
  window.addEventListener('scroll', updateActive, { passive: true });
  updateActive();
});

onUnmounted(() => {
  observer?.disconnect();
  window.removeEventListener('scroll', updateActive);
});

// Re-run when route changes (since component may be reused across legal pages).
import { watch } from 'vue';
watch(
  () => route.path,
  () => {
    setTimeout(() => {
      setupObserver();
      updateActive();
    }, 0);
  }
);
</script>

<template>
  <aside v-if="topHeaders.length" class="lp-toc">
    <div class="lp-toc-label">Contents</div>
    <ol class="lp-toc-list">
      <li v-for="(h, i) in topHeaders" :key="slugFor(h)">
        <a
          :href="`#${slugFor(h)}`"
          :class="['lp-toc-link', { 'is-active': activeId === slugFor(h) }]"
        >
          <span class="lp-toc-num">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="lp-toc-text">{{ h.title }}</span>
        </a>
      </li>
    </ol>
  </aside>
</template>
