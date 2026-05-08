<script setup lang="ts">
interface Props {
  /** padding scale */
  padding?: 'sm' | 'md' | 'lg'
  /** make the card a clickable link */
  href?: string
  /** disable hover lift */
  flat?: boolean
}

withDefaults(defineProps<Props>(), {
  padding: 'md',
  flat: false
})
</script>

<template>
  <component
    :is="href ? 'a' : 'div'"
    :href="href"
    class="nav0-glass-card"
    :class="[
      `is-padding-${padding}`,
      { 'is-link': href, 'is-flat': flat }
    ]"
  >
    <slot />
  </component>
</template>

<style scoped>
.nav0-glass-card {
  display: block;
  position: relative;
  background: var(--nav0-glass-bg);
  border: 1px solid var(--nav0-glass-border);
  border-radius: var(--nav0-radius-lg);
  -webkit-backdrop-filter: saturate(150%) blur(12px);
          backdrop-filter: saturate(150%) blur(12px);
  box-shadow: var(--nav0-glass-shadow);
  transition: transform var(--nav0-dur-base) var(--nav0-ease),
              border-color var(--nav0-dur-base) var(--nav0-ease),
              box-shadow var(--nav0-dur-base) var(--nav0-ease);
  text-decoration: none;
  color: inherit;
}

.is-padding-sm { padding: 1.25rem; }
.is-padding-md { padding: 1.75rem; }
.is-padding-lg { padding: 2.5rem; }

.is-link {
  cursor: pointer;
}

.is-link:hover:not(.is-flat) {
  transform: translateY(-2px);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 24px 48px -12px rgba(99, 102, 241, 0.18),
              0 8px 16px -8px rgba(15, 15, 20, 0.08);
}

/* subtle inner top highlight on dark mode */
.dark .nav0-glass-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.04) 0%,
    transparent 30%
  );
}
</style>
