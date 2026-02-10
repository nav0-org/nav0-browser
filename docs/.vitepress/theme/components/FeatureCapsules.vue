<template>
  <div class="feature-capsules-section">
    <h2>A complete package</h2>
    <p class="section-subtitle">Everything you need for private, fast browsing</p>

    <div class="capsules-wrapper">
      <div class="capsules-grid">
        <span class="capsule" v-for="item in allFeatures" :key="item">{{ item }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
const allFeatures = [
  'Zero telemetry',
  'Tracker blocking',
  'Third-party cookie blocking',
  'HTTPS auto-upgrade',
  'Fingerprint protection',
  'Private browsing mode',
  'Referrer trimming',
  'Local-only blocklists',
  'Malicious site warnings',
  'Process sandboxing',
  'Tab management',
  'Local bookmarks',
  'Bookmark folders',
  'Bookmark import/export',
  'Local history',
  'Download manager',
  'Custom search engine',
  'Configurable start page',
  'Fast startup',
  'Low memory usage',
  'No background processes',
  'No idle network requests',
  'Chromium engine',
  'Chrome DevTools',
  'Console & Network panels',
  'Local storage inspector',
  'Elements panel',
  'No AI assistant',
  'No news feed',
  'No sync / cloud',
  'No crypto / rewards',
  'No built-in VPN',
  'No forced accounts',
]
</script>
