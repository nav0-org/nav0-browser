<script setup lang="ts">
import ScrollReveal from './ScrollReveal.vue'

interface Release {
  version: string
  date: string
  title?: string
  summary?: string
  url: string
  /** "stable" | "beta" | "rc" — anything else gets neutral styling */
  channel?: string
  highlights?: string[]
}

interface Props {
  releases?: Release[]
  eyebrow?: string
  heading?: string
}

withDefaults(defineProps<Props>(), {
  eyebrow: 'releases',
  heading: 'every version, on the record.',
  releases: () => []
})

const formatDate = (d?: string) => {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    }).toLowerCase()
  } catch {
    return d
  }
}
</script>

<template>
  <article class="nav0-releases">
    <ScrollReveal class="nav0-releases__header">
      <span class="nav0-eyebrow">{{ eyebrow }}</span>
      <h1 class="nav0-releases__heading">{{ heading }}</h1>
    </ScrollReveal>

    <ScrollReveal :stagger="true" as="ol" class="nav0-releases__list">
      <li v-for="(r, i) in releases" :key="r.version" class="nav0-release">
        <a :href="r.url" class="nav0-release__link">
          <div class="nav0-release__rail">
            <div class="nav0-release__dot" :class="{ 'is-latest': i === 0 }" />
            <div v-if="i < releases.length - 1" class="nav0-release__line" />
          </div>

          <div class="nav0-release__body">
            <div class="nav0-release__meta">
              <span class="nav0-release__version">{{ r.version }}</span>
              <span v-if="r.channel" class="nav0-release__channel" :class="`is-${r.channel}`">
                {{ r.channel }}
              </span>
              <span class="nav0-release__date">{{ formatDate(r.date) }}</span>
            </div>

            <h3 v-if="r.title" class="nav0-release__title">{{ r.title }}</h3>
            <p v-if="r.summary" class="nav0-release__summary">{{ r.summary }}</p>

            <ul v-if="r.highlights && r.highlights.length" class="nav0-release__highlights">
              <li v-for="(h, hi) in r.highlights" :key="hi">{{ h }}</li>
            </ul>
          </div>
        </a>
      </li>
    </ScrollReveal>
  </article>
</template>

<style scoped>
.nav0-releases {
  max-width: 880px;
  margin: 0 auto;
  padding: 8rem 1.5rem 6rem;
}

.nav0-releases__header {
  margin-bottom: 4rem;
}

.nav0-releases__heading {
  font-family: var(--nav0-font-display);
  font-size: var(--nav0-fs-h1);
  font-weight: 800;
  letter-spacing: var(--nav0-tracking-display);
  line-height: 1.05;
  margin: 1rem 0 0;
  color: var(--vp-c-text-1);
  text-wrap: balance;
}

.nav0-releases__list {
  list-style: none;
  padding: 0;
  margin: 0;
}

/* -------- release item -------- */
.nav0-release {
  position: relative;
}

.nav0-release__link {
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 1.5rem;
  text-decoration: none;
  color: inherit;
  padding: 1.5rem 1rem 1.5rem 0;
  border-radius: var(--nav0-radius-md);
  transition: background var(--nav0-dur-fast) var(--nav0-ease);
}

.nav0-release__link:hover {
  background: var(--vp-c-bg-soft);
}

.nav0-release__link:hover .nav0-release__title {
  color: var(--vp-c-brand-1);
}

/* rail (timeline column) */
.nav0-release__rail {
  position: relative;
  width: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.nav0-release__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--vp-c-bg);
  border: 2px solid var(--vp-c-text-3);
  margin-top: 6px;
  flex: 0 0 auto;
  z-index: 1;
}

.nav0-release__dot.is-latest {
  background: var(--nav0-indigo);
  border-color: var(--nav0-indigo);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.16);
}

.nav0-release__line {
  position: absolute;
  top: 22px;
  bottom: -2rem;
  width: 1px;
  background: linear-gradient(180deg, var(--vp-c-divider), transparent 90%);
}

/* body */
.nav0-release__body {
  min-width: 0;
  padding-bottom: 0.5rem;
}

.nav0-release__meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.625rem;
  flex-wrap: wrap;
}

.nav0-release__version {
  font-family: var(--nav0-font-mono);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  padding: 0.25rem 0.5rem;
  border-radius: var(--nav0-radius-sm);
  border: 1px solid var(--vp-c-border);
}

.nav0-release__channel {
  font-family: var(--nav0-font-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: var(--nav0-tracking-eyebrow);
  text-transform: lowercase;
  padding: 0.25rem 0.5rem;
  border-radius: var(--nav0-radius-sm);
  border: 1px solid;
}

.nav0-release__channel.is-stable {
  background: rgba(16, 185, 129, 0.08);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.24);
}
.nav0-release__channel.is-beta {
  background: rgba(245, 158, 11, 0.08);
  color: #d97706;
  border-color: rgba(245, 158, 11, 0.24);
}
.nav0-release__channel.is-rc {
  background: rgba(99, 102, 241, 0.08);
  color: var(--vp-c-brand-1);
  border-color: rgba(99, 102, 241, 0.24);
}
.dark .nav0-release__channel.is-beta { color: #fbbf24; }

.nav0-release__date {
  font-family: var(--nav0-font-mono);
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  margin-left: auto;
}

.nav0-release__title {
  font-family: var(--nav0-font-display);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: var(--nav0-tracking-tight);
  line-height: 1.25;
  margin: 0 0 0.5rem 0;
  color: var(--vp-c-text-1);
  transition: color var(--nav0-dur-fast) var(--nav0-ease);
}

.nav0-release__summary {
  font-family: var(--nav0-font-body);
  font-size: 0.9375rem;
  line-height: 1.55;
  color: var(--vp-c-text-2);
  margin: 0 0 1rem 0;
}

.nav0-release__highlights {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.nav0-release__highlights li {
  font-family: var(--nav0-font-mono);
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  padding: 0.25rem 0.625rem;
  border-radius: var(--nav0-radius-sm);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
}

/* responsive */
@media (max-width: 640px) {
  .nav0-releases {
    padding: 6rem 1.25rem 4rem;
  }
  .nav0-release__date {
    margin-left: 0;
    width: 100%;
  }
}
</style>
