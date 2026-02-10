<template>
  <div class="feature-capsules-section">
    <h2>Everything You Need, Nothing You Don't</h2>
    <p class="section-subtitle">Built-in features that respect your privacy and keep things fast.</p>

    <div class="capsules-grid">
      <span class="capsule capsule-category">Privacy &amp; Security</span>
      <span class="capsule" v-for="item in privacy" :key="item.label">
        <span class="capsule-icon">{{ item.icon }}</span>
        {{ item.label }}
      </span>

      <span class="capsule capsule-category">Browsing Essentials</span>
      <span class="capsule" v-for="item in browsing" :key="item.label">
        <span class="capsule-icon">{{ item.icon }}</span>
        {{ item.label }}
      </span>

      <span class="capsule capsule-category">Performance</span>
      <span class="capsule" v-for="item in performance" :key="item.label">
        <span class="capsule-icon">{{ item.icon }}</span>
        {{ item.label }}
      </span>

      <span class="capsule capsule-category">Developer</span>
      <span class="capsule" v-for="item in developer" :key="item.label">
        <span class="capsule-icon">{{ item.icon }}</span>
        {{ item.label }}
      </span>

      <span class="capsule capsule-category">Intentionally Absent</span>
      <span class="capsule" v-for="item in absent" :key="item.label">
        <span class="capsule-icon">{{ item.icon }}</span>
        {{ item.label }}
      </span>
    </div>
  </div>
</template>

<script setup>
const privacy = [
  { icon: '🔒', label: 'Zero Telemetry' },
  { icon: '🛡️', label: 'Tracker Blocking' },
  { icon: '🍪', label: '3rd-Party Cookie Blocking' },
  { icon: '🔐', label: 'HTTPS Auto-Upgrade' },
  { icon: '👤', label: 'Fingerprint Protection' },
  { icon: '🕵️', label: 'Private Browsing Mode' },
  { icon: '🔗', label: 'Referrer Trimming' },
  { icon: '📋', label: 'Local-Only Blocklists' },
  { icon: '⚠️', label: 'Malicious Site Warnings' },
  { icon: '🏖️', label: 'Process Sandboxing' },
]

const browsing = [
  { icon: '📑', label: 'Tab Management' },
  { icon: '🔖', label: 'Local Bookmarks' },
  { icon: '📂', label: 'Bookmark Folders' },
  { icon: '📜', label: 'Local History' },
  { icon: '⬇️', label: 'Download Manager' },
  { icon: '🔍', label: 'Custom Search Engine' },
  { icon: '🏠', label: 'Configurable Start Page' },
  { icon: '📥', label: 'Bookmark Import/Export' },
]

const performance = [
  { icon: '⚡', label: 'Fast Startup' },
  { icon: '🪶', label: 'Low Memory Usage' },
  { icon: '🔋', label: 'No Background Processes' },
  { icon: '📡', label: 'No Idle Network Requests' },
  { icon: '🚀', label: 'Chromium Engine' },
]

const developer = [
  { icon: '🛠️', label: 'Chrome DevTools' },
  { icon: '🖥️', label: 'Console & Network Panels' },
  { icon: '🗄️', label: 'Local Storage Inspector' },
  { icon: '📐', label: 'Elements Panel' },
]

const absent = [
  { icon: '🚫', label: 'No AI Assistant' },
  { icon: '🚫', label: 'No News Feed' },
  { icon: '🚫', label: 'No Sync / Cloud' },
  { icon: '🚫', label: 'No Crypto / Rewards' },
  { icon: '🚫', label: 'No Built-in VPN' },
  { icon: '🚫', label: 'No Forced Accounts' },
]
</script>
