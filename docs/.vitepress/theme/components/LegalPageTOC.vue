<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick } from 'vue';
import { useRoute } from 'vitepress';

interface TocEntry {
  id: string;
  text: string;
}

const route = useRoute();
const entries = ref<TocEntry[]>([]);
const activeId = ref('');

let observer: IntersectionObserver | null = null;
let scrollHandler: (() => void) | null = null;

function buildEntries() {
  if (typeof document === 'undefined') return;
  const headings = document.querySelectorAll<HTMLHeadingElement>('.vp-doc h2[id]');
  entries.value = Array.from(headings)
    .map((h) => {
      const id = h.id || '';
      // Use innerText so we drop the auto-injected anchor "#" character.
      const text = (h.textContent || '')
        .replace(/^[0-9]+\s+/, '') // drop the CSS-counter "01" prefix if present in textContent
        .replace(/#$/, '')
        .trim();
      return { id, text };
    })
    .filter((e) => e.id && e.text);
}

function updateActive() {
  if (!entries.value.length) return;
  const offset = 120;
  let current = entries.value[0].id;
  for (const e of entries.value) {
    const el = document.getElementById(e.id);
    if (!el) continue;
    if (el.getBoundingClientRect().top - offset <= 0) {
      current = e.id;
    }
  }
  activeId.value = current;
}

function setupObserver() {
  if (typeof window === 'undefined') return;
  observer?.disconnect();
  observer = new IntersectionObserver(() => updateActive(), {
    rootMargin: '-120px 0px -60% 0px',
    threshold: 0,
  });
  for (const e of entries.value) {
    const el = document.getElementById(e.id);
    if (el) observer.observe(el);
  }
}

async function refresh() {
  await nextTick();
  // Double rAF to give VitePress time to render markdown headings.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      buildEntries();
      setupObserver();
      updateActive();
    });
  });
}

onMounted(() => {
  refresh();
  scrollHandler = () => updateActive();
  window.addEventListener('scroll', scrollHandler, { passive: true });
});

onUnmounted(() => {
  observer?.disconnect();
  if (scrollHandler) window.removeEventListener('scroll', scrollHandler);
});

import { watch } from 'vue';
watch(() => route.path, refresh);
</script>

<template>
  <aside v-show="entries.length" class="lp-toc">
    <div class="lp-toc-label">Contents</div>
    <ol class="lp-toc-list">
      <li v-for="(e, i) in entries" :key="e.id">
        <a
          :href="`#${e.id}`"
          :class="['lp-toc-link', { 'is-active': activeId === e.id }]"
        >
          <span class="lp-toc-num">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="lp-toc-text">{{ e.text }}</span>
        </a>
      </li>
    </ol>
  </aside>
</template>
