<template>
  <div class="nv-browser" role="region" aria-label="Nav0 browser preview">
    <div class="nv-br-titlebar">
      <div class="nv-br-dots">
        <span class="nv-br-dot" />
        <span class="nv-br-dot" />
        <span class="nv-br-dot" />
      </div>
      <div class="nv-br-tabs">
        <div
          v-for="t in tabs"
          :key="t.id"
          class="nv-br-tab"
          :class="{ 'is-active': t.id === activeId }"
          :title="t.label"
          @click="activeId = t.id"
        >
          <span class="nv-br-tab-fav" />
          <span class="nv-br-tab-label">{{ t.label }}</span>
          <span class="nv-br-tab-x" @click.stop="closeTab(t.id)">&#x2715;</span>
        </div>
        <div class="nv-br-tab nv-br-tab-add" @click="addTab">+</div>
      </div>
      <div class="nv-br-meta">v{{ version }}</div>
    </div>

    <div class="nv-br-toolbar">
      <div class="nv-br-controls">
        <button type="button" class="nv-br-ctl" title="back">&#x2039;</button>
        <button type="button" class="nv-br-ctl" title="forward">&#x203A;</button>
        <button type="button" class="nv-br-ctl" title="reload">&#x21BB;</button>
      </div>
      <div class="nv-br-url">
        <span class="nv-br-url-lock">&#x2713;</span>
        <span class="nv-br-url-host">{{ activePage.url.host }}</span>
        <span class="nv-br-url-path">{{ activePage.url.path }}</span>
      </div>
      <div class="nv-br-actions">
        <button type="button" class="nv-br-ctl" title="bookmark">&#x2606;</button>
        <button type="button" class="nv-br-ctl" title="downloads">&#x2913;</button>
        <button type="button" class="nv-br-ctl" title="menu">&#x2630;</button>
      </div>
    </div>

    <div class="nv-br-body">
      <div class="nv-br-page" :class="`is-${surface}`">
        <div class="nv-br-page-inner">
          <div class="nv-br-eyebrow">{{ activePage.eyebrow }}</div>
          <h2 class="nv-br-headline">{{ activePage.title }}</h2>
          <p v-for="(line, i) in activePage.body" :key="i" class="nv-br-para">{{ line }}</p>
          <div class="nv-br-bars">
            <div class="nv-br-bar w90" />
            <div class="nv-br-bar w70" />
            <div class="nv-br-bar w50" />
          </div>
          <div class="nv-br-foot-pills">
            <span>NO TRACKERS</span>
            <span>·</span>
            <span>NO TELEMETRY</span>
            <span>·</span>
            <span>NO AI</span>
          </div>
        </div>
      </div>
      <div class="nv-br-statusbar">
        <span class="nv-net-meter">
          <span class="nv-net-dot" :class="{ bad: tracker !== 'on' }" />
          {{ tracker === 'on' ? 'Tracker blocking on' : 'Tracker blocking off' }}
        </span>
        <span>{{ activePage.requests }} requests · {{ activePage.blocked }} blocked</span>
        <span class="nv-net-right">0 background tasks</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const PAGES = {
  home: {
    url: { host: 'nav0.org', path: '' },
    eyebrow: 'nav0.org',
    title: 'Browse. Nothing more.',
    body: [
      'The browser ships with what you need. Nothing else.',
      'Open a tab. Read a thing. Close a tab.',
    ],
    requests: 4,
    blocked: 12,
  },
  docs: {
    url: { host: 'nav0.org', path: '/guide' },
    eyebrow: 'nav0.org/guide',
    title: 'Getting started — a 90 second tour',
    body: [
      'Install. Pick a search engine. Import bookmarks if you like.',
      'There is no account. There is no sync. That is the point.',
    ],
    requests: 2,
    blocked: 0,
  },
  search: {
    url: { host: 'duckduckgo.com', path: '/?q=is+my+browser+selling+me' },
    eyebrow: 'duckduckgo.com',
    title: 'Search results',
    body: [
      'Probably yes. But not this one.',
      'Try comparing memory usage with Activity Monitor open.',
    ],
    requests: 7,
    blocked: 19,
  },
};

const tabs = ref([
  { id: 't1', label: 'Nav0 — home', page: 'home' },
  { id: 't2', label: 'Getting started', page: 'docs' },
  { id: 't3', label: 'is my browser selling me', page: 'search' },
]);
const activeId = ref('t1');
const surface = ref('light');
const tracker = ref('on');
const version = '0.2.6';

const activePage = computed(() => {
  const tab = tabs.value.find((t) => t.id === activeId.value) || tabs.value[0];
  return PAGES[tab.page] || PAGES.home;
});

function closeTab(id) {
  const idx = tabs.value.findIndex((t) => t.id === id);
  if (idx === -1 || tabs.value.length <= 1) return;
  tabs.value.splice(idx, 1);
  if (activeId.value === id) activeId.value = tabs.value[0].id;
}

function addTab() {
  const id = 't' + Math.random().toString(36).slice(2, 6);
  tabs.value.push({ id, label: 'new tab', page: 'home' });
  activeId.value = id;
}
</script>

<style scoped>
.nv-browser {
  position: relative;
  z-index: 1;
  background: var(--nv-bg-card);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: var(--nv-shadow-lg);
  border: 1px solid var(--nv-rule-soft);
  user-select: none;
}

.nv-br-titlebar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 12px 16px;
  background: var(--nv-bg-muted);
  border-bottom: 1px solid var(--nv-rule-soft);
}

.nv-br-dots {
  display: flex;
  gap: 8px;
}
.nv-br-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #fc625d;
}
.nv-br-dot:nth-child(2) {
  background: #fdbc40;
}
.nv-br-dot:nth-child(3) {
  background: #34c749;
}

.nv-br-tabs {
  display: flex;
  gap: 4px;
  align-items: center;
  min-height: 28px;
  flex-wrap: wrap;
}

.nv-br-tab {
  padding: 6px 14px 6px 12px;
  font-size: 12px;
  font-family: var(--nv-sans);
  font-weight: 500;
  letter-spacing: -0.01em;
  border-radius: 8px 8px 0 0;
  background: transparent;
  color: var(--nv-ink-3);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition:
    background 120ms,
    color 120ms;
}

.nv-br-tab:hover {
  background: var(--nv-rule-soft);
}

.nv-br-tab.is-active {
  background: var(--nv-bg-card);
  color: var(--nv-ink);
  border: 1px solid var(--nv-rule-soft);
  border-bottom-color: var(--nv-bg-card);
  margin-bottom: -1px;
}

.nv-br-tab-fav {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.3;
  flex-shrink: 0;
}

.nv-br-tab-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nv-br-tab-x {
  color: var(--nv-ink-3);
  font-size: 12px;
  opacity: 0;
  transition: opacity 120ms;
}

.nv-br-tab:hover .nv-br-tab-x {
  opacity: 1;
}

.nv-br-tab-add {
  padding: 6px 12px;
  color: var(--nv-ink-3);
}

.nv-br-meta {
  font-family: var(--nv-mono);
  font-size: 11px;
  color: var(--nv-ink-3);
  letter-spacing: 0.04em;
}

.nv-br-toolbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--nv-rule-soft);
  background: var(--nv-bg-card);
}

.nv-br-controls,
.nv-br-actions {
  display: flex;
  gap: 4px;
}

.nv-br-ctl {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: var(--nv-ink-2);
  display: grid;
  place-items: center;
  font-size: 14px;
  cursor: pointer;
  transition:
    background 120ms,
    color 120ms;
}

.nv-br-ctl:hover {
  background: var(--nv-bg-muted);
  color: var(--nv-ink);
}

.nv-br-url {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  font-family: var(--nv-sans);
  font-size: 13px;
  background: var(--nv-bg-muted);
  color: var(--nv-ink);
  letter-spacing: -0.005em;
  overflow: hidden;
}

.nv-br-url-lock {
  color: var(--nv-good);
  font-size: 11px;
}

.nv-br-url-host {
  color: var(--nv-ink);
  font-weight: 500;
}

.nv-br-url-path {
  color: var(--nv-ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
}

.nv-br-body {
  background: var(--nv-bg);
  height: 380px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.nv-br-page {
  flex: 1;
  overflow: hidden;
  padding: 36px 44px;
  position: relative;
  transition:
    background 240ms,
    color 240ms;
  background: #ffffff;
  color: #1d1d1f;
}

.nv-br-page-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 600px;
  margin: 0 auto;
}

.nv-br-eyebrow {
  font-family: var(--nv-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.55;
}

.nv-br-headline {
  font-family: var(--nv-sans);
  font-weight: 700;
  font-size: 36px;
  line-height: 1.05;
  letter-spacing: -0.035em;
  margin: 0;
}

.nv-br-para {
  margin: 0;
  font-family: var(--nv-sans);
  font-size: 15px;
  line-height: 1.55;
  opacity: 0.78;
  letter-spacing: -0.005em;
}

.nv-br-bars {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nv-br-bar {
  height: 8px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.12;
}
.nv-br-bar.w90 {
  width: 90%;
}
.nv-br-bar.w70 {
  width: 70%;
}
.nv-br-bar.w50 {
  width: 50%;
}

.nv-br-foot-pills {
  margin-top: auto;
  padding-top: 16px;
  display: flex;
  gap: 14px;
  opacity: 0.55;
  font-size: 11px;
  font-family: var(--nv-mono);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.nv-br-statusbar {
  border-top: 1px solid var(--nv-rule-soft);
  padding: 8px 14px;
  font-family: var(--nv-sans);
  font-size: 11px;
  color: var(--nv-ink-3);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  background: var(--nv-bg-card);
  letter-spacing: -0.005em;
}

.nv-net-meter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.nv-net-dot {
  width: 6px;
  height: 6px;
  background: var(--nv-good);
  border-radius: 999px;
}

.nv-net-dot.bad {
  background: var(--nv-bad);
}

.nv-net-right {
  text-align: right;
}

@media (max-width: 640px) {
  .nv-br-page {
    padding: 24px;
  }
  .nv-br-meta {
    display: none;
  }
}
</style>
