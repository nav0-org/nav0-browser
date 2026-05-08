<script setup lang="ts">
interface Props {
  href?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  external?: boolean
  arrow?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  external: false,
  arrow: false
})
</script>

<template>
  <component
    :is="href ? 'a' : 'button'"
    :href="href"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noopener noreferrer' : undefined"
    class="nav0-pill"
    :class="[`v-${variant}`, `s-${size}`]"
  >
    <slot />
    <svg v-if="arrow" class="nav0-pill__arrow" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M5.5 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </component>
</template>

<style scoped>
.nav0-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--nav0-font-mono);
  font-weight: 500;
  letter-spacing: -0.01em;
  text-transform: lowercase;
  border: 1px solid transparent;
  border-radius: var(--nav0-radius-pill);
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: transform var(--nav0-dur-fast) var(--nav0-ease),
              background-color var(--nav0-dur-fast) var(--nav0-ease),
              border-color var(--nav0-dur-fast) var(--nav0-ease),
              box-shadow var(--nav0-dur-fast) var(--nav0-ease),
              color var(--nav0-dur-fast) var(--nav0-ease);
}

.s-sm { padding: 0.5rem 1.125rem;   font-size: 0.8125rem; }
.s-md { padding: 0.6875rem 1.5rem;  font-size: 0.875rem;  }
.s-lg { padding: 0.875rem 1.875rem; font-size: 0.9375rem; }

.v-primary {
  background: var(--nav0-indigo);
  color: #fff;
  box-shadow: 0 1px 0 rgba(255,255,255,0.18) inset,
              0 6px 16px -6px rgba(99, 102, 241, 0.5);
}
.v-primary:hover {
  background: var(--nav0-indigo-2);
  transform: translateY(-1px);
  box-shadow: 0 1px 0 rgba(255,255,255,0.18) inset,
              0 12px 24px -6px rgba(99, 102, 241, 0.6);
}
.v-primary:active { transform: translateY(0); }

.v-secondary {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-border);
}
.v-secondary:hover {
  border-color: var(--vp-c-text-3);
  transform: translateY(-1px);
}

.v-ghost {
  background: transparent;
  color: var(--vp-c-text-2);
}
.v-ghost:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

.nav0-pill__arrow {
  transition: transform var(--nav0-dur-fast) var(--nav0-ease);
}
.nav0-pill:hover .nav0-pill__arrow {
  transform: translateX(2px);
}
</style>
