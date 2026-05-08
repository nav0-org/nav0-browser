<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';
import DefaultTheme from 'vitepress/theme';

const { Layout } = DefaultTheme;

// Adds 'scrolled' class to .VPNav after the user scrolls past 8px so the
// frosted bar gets an opaque tint + border.
let raf = 0;
const onScroll = () => {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    const nav = document.querySelector('.VPNav');
    if (!nav) return;
    if (window.scrollY > 8) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  });
};

onMounted(() => {
  if (typeof window === 'undefined') return;
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
});

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return;
  window.removeEventListener('scroll', onScroll);
  cancelAnimationFrame(raf);
});
</script>

<template>
  <Layout />
</template>
