<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PillButton from './PillButton.vue'

interface Props {
  /** small label above headline */
  eyebrow?: string
  /** main display headline. supports a 2-line break with \n */
  headline?: string
  /** support paragraph below headline */
  tagline?: string
  /** primary cta */
  ctaText?: string
  ctaHref?: string
  /** secondary cta */
  altCtaText?: string
  altCtaHref?: string
  /** show the compass mark */
  showCompass?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  eyebrow: 'nav0 // v0.1',
  headline: 'a browser\nyou actually own.',
  tagline: 'minimal, private, control-first. no telemetry, no nudges, no extension store theatre — just a browser that gets out of your way.',
  ctaText: 'download for mac',
  ctaHref: '/download',
  altCtaText: 'read the philosophy',
  altCtaHref: '/blog',
  showCompass: true
})

// split headline into words for stagger animation on mount
const headlineLines = props.headline.split('\n')

const heroRef = ref<HTMLElement | null>(null)
const mounted = ref(false)

onMounted(() => {
  // small tick before adding the loaded class for transition
  requestAnimationFrame(() => { mounted.value = true })
})
</script>

<template>
  <section ref="heroRef" class="nav0-hero" :class="{ 'is-loaded': mounted }">
    <!-- ambient gradient mesh background -->
    <div class="nav0-hero__mesh" aria-hidden="true">
      <div class="nav0-hero__mesh-blob nav0-hero__mesh-blob--1" />
      <div class="nav0-hero__mesh-blob nav0-hero__mesh-blob--2" />
      <div class="nav0-hero__mesh-blob nav0-hero__mesh-blob--3" />
    </div>

    <!-- subtle grid overlay -->
    <div class="nav0-hero__grid" aria-hidden="true" />

    <div class="nav0-hero__inner">
      <div class="nav0-hero__content">
        <span class="nav0-hero__eyebrow nav0-eyebrow">{{ eyebrow }}</span>

        <h1 class="nav0-hero__headline">
          <span
            v-for="(line, i) in headlineLines"
            :key="i"
            class="nav0-hero__line"
            :style="{ '--line-delay': `${i * 80}ms` }"
          >
            {{ line }}
          </span>
        </h1>

        <p class="nav0-hero__tagline">{{ tagline }}</p>

        <div class="nav0-hero__ctas">
          <PillButton :href="ctaHref" variant="primary" size="lg">
            {{ ctaText }}
          </PillButton>
          <PillButton :href="altCtaHref" variant="ghost" size="lg" :arrow="true">
            {{ altCtaText }}
          </PillButton>
        </div>
      </div>

      <!-- compass mark (decorative) -->
      <div v-if="showCompass" class="nav0-hero__compass" aria-hidden="true">
        <svg viewBox="0 0 256 256" width="100%" height="100%">
          <!-- broken elliptical ring -->
          <g transform="rotate(-22 128 128)">
            <ellipse
              cx="128" cy="128"
              rx="92" ry="92"
              fill="none"
              stroke="var(--vp-c-text-3)"
              stroke-width="3"
              stroke-dasharray="3 5"
              opacity="0.4"
            />
            <ellipse
              cx="128" cy="128"
              rx="78" ry="78"
              fill="none"
              stroke="#bacbde"
              stroke-width="14"
              opacity="0.7"
            />
            <!-- north red needle -->
            <polygon points="128,40 138,128 128,118 118,128" fill="var(--nav0-red)" />
            <!-- south indigo needle -->
            <polygon points="128,216 118,128 128,138 138,128" fill="var(--nav0-indigo)" />
            <!-- pivot -->
            <circle cx="128" cy="128" r="9" fill="#64748b" opacity="0.5" />
            <circle cx="128" cy="128" r="4" fill="#0a0a0a" />
          </g>
        </svg>
      </div>
    </div>

    <!-- scroll hint -->
    <div class="nav0-hero__scroll-hint" aria-hidden="true">
      <span class="nav0-eyebrow">scroll</span>
      <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
        <path d="M7 0v18M1 13l6 6 6-6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  </section>
</template>

<style scoped>
.nav0-hero {
  position: relative;
  min-height: calc(100vh - 64px);
  padding: 7rem 1.5rem 6rem;
  display: flex;
  align-items: center;
  overflow: hidden;
  isolation: isolate;
}

/* -------- background mesh -------- */
.nav0-hero__mesh {
  position: absolute;
  inset: -10%;
  pointer-events: none;
  z-index: -2;
  filter: blur(40px);
}

.nav0-hero__mesh-blob {
  position: absolute;
  border-radius: 50%;
  opacity: 0.6;
  animation: nav0-mesh-drift 18s var(--nav0-ease) infinite;
}

.nav0-hero__mesh-blob--1 {
  width: 50vw; height: 50vw;
  top: -10%; left: -8%;
  background: radial-gradient(circle, rgba(99,102,241,0.4), transparent 70%);
}
.nav0-hero__mesh-blob--2 {
  width: 40vw; height: 40vw;
  top: 10%; right: -10%;
  background: radial-gradient(circle, rgba(239,68,68,0.18), transparent 70%);
  animation-delay: -6s;
}
.nav0-hero__mesh-blob--3 {
  width: 55vw; height: 55vw;
  bottom: -25%; left: 30%;
  background: radial-gradient(circle, rgba(99,102,241,0.22), transparent 70%);
  animation-delay: -12s;
}

.dark .nav0-hero__mesh-blob--1 { background: radial-gradient(circle, rgba(99,102,241,0.32), transparent 70%); }
.dark .nav0-hero__mesh-blob--2 { background: radial-gradient(circle, rgba(239,68,68,0.14), transparent 70%); }
.dark .nav0-hero__mesh-blob--3 { background: radial-gradient(circle, rgba(129,140,248,0.22), transparent 70%); }

/* -------- subtle grid overlay -------- */
.nav0-hero__grid {
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image:
    linear-gradient(rgba(15,15,20,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15,15,20,0.04) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 30%, black 0%, transparent 80%);
  -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 30%, black 0%, transparent 80%);
}

.dark .nav0-hero__grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
}

/* -------- inner layout -------- */
.nav0-hero__inner {
  position: relative;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  align-items: center;
  gap: 4rem;
}

.nav0-hero__content { max-width: 720px; }

/* -------- eyebrow -------- */
.nav0-hero__eyebrow {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity var(--nav0-dur-base) var(--nav0-ease),
              transform var(--nav0-dur-base) var(--nav0-ease);
  margin-bottom: 1.5rem;
}
.is-loaded .nav0-hero__eyebrow {
  opacity: 1;
  transform: translateY(0);
}

/* -------- headline -------- */
.nav0-hero__headline {
  font-family: var(--nav0-font-display);
  font-size: var(--nav0-fs-display);
  font-weight: 800;
  line-height: 0.98;
  letter-spacing: var(--nav0-tracking-display);
  margin: 0 0 2rem 0;
  text-wrap: balance;
}

.nav0-hero__line {
  display: block;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity var(--nav0-dur-slow) var(--nav0-ease),
              transform var(--nav0-dur-slow) var(--nav0-ease);
  transition-delay: calc(var(--line-delay, 0ms) + 100ms);

  background: linear-gradient(180deg, var(--vp-c-text-1) 0%, var(--vp-c-text-2) 130%);
  -webkit-background-clip: text;
          background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav0-hero__line:nth-child(2) {
  background: linear-gradient(120deg, var(--nav0-indigo) 0%, var(--nav0-indigo-2) 60%, var(--nav0-indigo-3) 100%);
  -webkit-background-clip: text;
          background-clip: text;
  -webkit-text-fill-color: transparent;
}

.is-loaded .nav0-hero__line {
  opacity: 1;
  transform: translateY(0);
}

/* -------- tagline -------- */
.nav0-hero__tagline {
  font-family: var(--nav0-font-body);
  font-size: 1.1875rem;
  line-height: 1.55;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--vp-c-text-2);
  max-width: 540px;
  margin: 0 0 2.5rem 0;

  opacity: 0;
  transform: translateY(12px);
  transition: opacity var(--nav0-dur-slow) var(--nav0-ease) 380ms,
              transform var(--nav0-dur-slow) var(--nav0-ease) 380ms;
}
.is-loaded .nav0-hero__tagline {
  opacity: 1;
  transform: translateY(0);
}

/* -------- ctas -------- */
.nav0-hero__ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;

  opacity: 0;
  transform: translateY(8px);
  transition: opacity var(--nav0-dur-slow) var(--nav0-ease) 480ms,
              transform var(--nav0-dur-slow) var(--nav0-ease) 480ms;
}
.is-loaded .nav0-hero__ctas {
  opacity: 1;
  transform: translateY(0);
}

/* -------- compass mark -------- */
.nav0-hero__compass {
  width: min(420px, 80%);
  aspect-ratio: 1;
  margin-left: auto;
  opacity: 0;
  transform: scale(0.92) rotate(-6deg);
  transition: opacity 1s var(--nav0-ease) 200ms,
              transform 1s var(--nav0-ease) 200ms;
  filter: drop-shadow(0 30px 60px rgba(99, 102, 241, 0.18));
}
.is-loaded .nav0-hero__compass {
  opacity: 1;
  transform: scale(1) rotate(0deg);
}

/* -------- scroll hint -------- */
.nav0-hero__scroll-hint {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--vp-c-text-3);
  opacity: 0;
  transition: opacity 600ms var(--nav0-ease) 1s;
  animation: nav0-fade-in 600ms var(--nav0-ease) 1s forwards;
}
.is-loaded .nav0-hero__scroll-hint {
  opacity: 0.7;
  animation: nav0-bob 2.6s ease-in-out 1.6s infinite;
}

@keyframes nav0-bob {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50%      { transform: translateX(-50%) translateY(6px); }
}

/* -------- responsive -------- */
@media (max-width: 960px) {
  .nav0-hero__inner {
    grid-template-columns: 1fr;
    gap: 3rem;
  }
  .nav0-hero__compass {
    grid-row: 1;
    width: 200px;
    margin: 0;
  }
  .nav0-hero__content { grid-row: 2; }
}

@media (max-width: 640px) {
  .nav0-hero {
    padding: 5rem 1.25rem 4rem;
    min-height: auto;
  }
  .nav0-hero__scroll-hint { display: none; }
  .nav0-hero__compass { width: 160px; }
}
</style>
