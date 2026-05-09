<script setup lang="ts">
import { computed, ref } from 'vue';
import { useData } from 'vitepress';
import { data as posts } from '../posts.data';

const { page } = useData();
const copied = ref(false);

const post = computed(() => {
  const slug = page.value.relativePath.replace(/^blog\//, '').replace(/\.md$/, '');
  return posts.find((p) => p.slug === slug);
});

async function copyLink() {
  try {
    const url = window.location.origin + window.location.pathname;
    await navigator.clipboard?.writeText(url);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch {
    // No telemetry per Nav0 privacy principles
  }
}
</script>

<template>
  <aside v-if="post" class="bp-meta-rail">
    <div class="bp-meta-card">
      <div class="bp-meta-row">
        <span class="bp-meta-k">Author</span>
        <span class="bp-meta-v">{{ post.author }}</span>
      </div>
      <div class="bp-meta-row">
        <span class="bp-meta-k">Topic</span>
        <span class="bp-meta-v">{{ post.category }}</span>
      </div>
      <div class="bp-meta-row">
        <span class="bp-meta-k">Length</span>
        <span class="bp-meta-v">{{ post.wordCount }}</span>
      </div>
      <div class="bp-meta-row">
        <span class="bp-meta-k">Updated</span>
        <span class="bp-meta-v">{{ post.date }}</span>
      </div>
    </div>
    <h4 class="bp-meta-section">Share</h4>
    <button class="bp-share-btn" type="button" @click="copyLink">
      {{ copied ? 'Copied' : 'Copy link' }}
    </button>
  </aside>
</template>
