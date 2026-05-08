<script setup lang="ts">
import { useData } from 'vitepress';
import { computed } from 'vue';

const { frontmatter } = useData();

const version = computed(() => (frontmatter.value.title as string) || '');
</script>

<template>
  <aside class="rel-detail-side">
    <div class="rel-detail-quick-download">
      <h5>Quick download</h5>
      <div class="rel-detail-download-row">
        <span class="rel-detail-download-name">macOS</span>
        <a href="/install#macos">.dmg</a>
      </div>
      <div class="rel-detail-download-row">
        <span class="rel-detail-download-name">Linux</span>
        <a href="/install#linux">.deb</a>
      </div>
      <div class="rel-detail-download-row">
        <span class="rel-detail-download-name">Windows</span>
        <a href="/install#windows">.exe</a>
      </div>
      <div class="rel-detail-download-row">
        <span class="rel-detail-download-name">Source</span>
        <a
          :href="`https://github.com/nav0-org/nav0-browser/archive/refs/tags/${version}.tar.gz`"
          >.tar.gz</a
        >
      </div>
    </div>

    <div class="rel-detail-side-section">
      <h5>All releases</h5>
      <p class="rel-detail-side-link">
        <a href="/releases/">‹ Back to all releases</a>
      </p>
    </div>
  </aside>
</template>
