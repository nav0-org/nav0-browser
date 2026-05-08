<script setup lang="ts">
import ScrollReveal from './ScrollReveal.vue'

interface Stat {
  value: string
  label: string
}

interface Props {
  eyebrow?: string
  heading?: string
  body?: string
  stats?: Stat[]
  /** dark or light background */
  variant?: 'dark' | 'light'
}

withDefaults(defineProps<Props>(), {
  eyebrow: 'benchmarks',
  heading: 'lighter than chrome.\nfaster than the rest.',
  body: 'measured on the same workload, the same machine, the same fifteen tabs. nav0 strips the layers chrome carries by default — telemetry, sync, extension hosts — and what\'s left is a browser that holds.',
  variant: 'dark',
  stats: () => [
    { value: '48.5%', label: 'less memory' },
    { value: '86.3%', label: 'less idle cpu' },
    { value: '0',     label: 'background pings' },
    { value: '<2s',   label: 'cold start' }
  ]
})
</script>

<template>
  <section class="nav0-showcase" :class="[`v-${variant}`]">
    <div class="nav0-showcase__bg" aria-hidden="true">
      <div class="nav0-showcase__mesh" />
    </div>

    <div class="nav0-showcase__inner">
      <ScrollReveal class="nav0-showcase__header">
        <span class="nav0-eyebrow">{{ eyebrow }}</span>
        <h2 class="nav0-showcase__heading">
          <span v-for="(line, i) in heading.split('\n')" :key="i">{{ line }}</span>
        </h2>
        <p class="nav0-showcase__body">{{ body }}</p>
      </ScrollReveal>

      <ScrollReveal :stagger="true" class="nav0-showcase__stats">
        <div v-for="(stat, i) in stats" :key="i" class="nav0-stat">
          <div class="nav0-stat__value">{{ stat.value }}</div>
          <div class="nav0-stat__label">{{ stat.label }}</div>
        </div>
      </ScrollReveal>

      <!-- image slot for product screenshot -->
      <ScrollReveal class="nav0-showcase__media">
        <slot name="media">
          <!-- default: stylised mock browser frame -->
          <div class="nav0-mock">
            <div class="nav0-mock__chrome">
              <div class="nav0-mock__dots">
                <span /><span /><span />
              </div>
              <div class="nav0-mock__urlbar">nav0://blank</div>
            </div>
            <div class="nav0-mock__canvas">
              <div class="nav0-mock__canvas-glow" />
              <span class="nav0-mock__placeholder">your screenshot here</span>
            </div>
          </div>
        </slot>
      </ScrollReveal>
    </div>
  </section>
</template>

<style scoped>
.nav0-showcase {
  position: relative;
  padding: var(--nav0-space-3xl) 1.5rem;
  overflow: hidden;
  isolation: isolate;
}

/* dark variant — full bleed */
.v-dark {
  background: #050507;
  color: #f5f5f7;
}

.v-light {
  background: var(--vp-c-bg-alt);
}

.nav0-showcase__bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}

.nav0-showcase__mesh {
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(50% 50% at 30% 20%, rgba(99, 102, 241, 0.32), transparent 60%),
    radial-gradient(40% 60% at 80% 70%, rgba(239, 68, 68, 0.14), transparent 60%);
  filter: blur(60px);
  animation: nav0-mesh-drift 24s var(--nav0-ease) infinite;
}

.nav0-showcase__inner {
  position: relative;
  max-width: 1280px;
  margin: 0 auto;
}

/* -------- header -------- */
.nav0-showcase__header {
  max-width: 760px;
  margin: 0 auto 4rem;
  text-align: center;
}

.v-dark .nav0-eyebrow {
  color: rgba(245, 245, 247, 0.5);
}

.nav0-showcase__heading {
  font-family: var(--nav0-font-display);
  font-size: var(--nav0-fs-h1);
  font-weight: 800;
  letter-spacing: var(--nav0-tracking-display);
  line-height: 1.05;
  margin: 1.25rem 0 1.5rem;
  text-wrap: balance;
}

.nav0-showcase__heading span { display: block; }
.nav0-showcase__heading span:nth-child(2) {
  background: linear-gradient(120deg, #818cf8 0%, #a5b4fc 60%, #c7d2fe 100%);
  -webkit-background-clip: text;
          background-clip: text;
  -webkit-text-fill-color: transparent;
}

.v-light .nav0-showcase__heading span:nth-child(2) {
  background: linear-gradient(120deg, var(--nav0-indigo) 0%, var(--nav0-indigo-2) 100%);
  -webkit-background-clip: text;
          background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav0-showcase__body {
  font-family: var(--nav0-font-body);
  font-size: 1.1875rem;
  line-height: 1.55;
  font-weight: 400;
  letter-spacing: -0.005em;
  color: rgba(245, 245, 247, 0.72);
  text-wrap: balance;
}

.v-light .nav0-showcase__body { color: var(--vp-c-text-2); }

/* -------- stats -------- */
.nav0-showcase__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 2rem;
  margin: 4rem 0 5rem;
  padding: 2.5rem;
  border-radius: var(--nav0-radius-xl);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
}

.v-light .nav0-showcase__stats {
  background: rgba(15, 15, 20, 0.02);
  border-color: rgba(15, 15, 20, 0.08);
}

.nav0-stat {
  text-align: left;
}

.nav0-stat__value {
  font-family: var(--nav0-font-display);
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  letter-spacing: var(--nav0-tracking-display);
  line-height: 1;
  background: linear-gradient(180deg, #f5f5f7 0%, rgba(245, 245, 247, 0.6) 100%);
  -webkit-background-clip: text;
          background-clip: text;
  -webkit-text-fill-color: transparent;
}

.v-light .nav0-stat__value {
  background: linear-gradient(180deg, var(--vp-c-text-1) 0%, var(--vp-c-text-2) 100%);
  -webkit-background-clip: text;
          background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav0-stat__label {
  font-family: var(--nav0-font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: var(--nav0-tracking-eyebrow);
  text-transform: lowercase;
  color: rgba(245, 245, 247, 0.5);
  margin-top: 0.5rem;
}

.v-light .nav0-stat__label { color: var(--vp-c-text-3); }

/* -------- mock browser frame fallback -------- */
.nav0-showcase__media {
  display: flex;
  justify-content: center;
}

.nav0-mock {
  width: 100%;
  max-width: 960px;
  border-radius: var(--nav0-radius-lg);
  overflow: hidden;
  background: #0a0a0e;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.06) inset,
    0 60px 120px -20px rgba(0, 0, 0, 0.6),
    0 24px 60px -10px rgba(99, 102, 241, 0.3);
}

.v-light .nav0-mock {
  background: #fff;
  border-color: rgba(15, 15, 20, 0.08);
  box-shadow:
    0 60px 120px -20px rgba(15, 15, 20, 0.18),
    0 24px 60px -10px rgba(99, 102, 241, 0.18);
}

.nav0-mock__chrome {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
}

.v-light .nav0-mock__chrome {
  border-bottom-color: rgba(15, 15, 20, 0.06);
  background: rgba(15, 15, 20, 0.02);
}

.nav0-mock__dots {
  display: flex;
  gap: 0.4rem;
}

.nav0-mock__dots span {
  width: 11px; height: 11px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
}

.v-light .nav0-mock__dots span { background: rgba(15, 15, 20, 0.18); }

.nav0-mock__urlbar {
  flex: 1;
  font-family: var(--nav0-font-mono);
  font-size: 0.75rem;
  color: rgba(245, 245, 247, 0.5);
  background: rgba(255, 255, 255, 0.04);
  padding: 0.4rem 0.75rem;
  border-radius: var(--nav0-radius-sm);
  text-align: center;
}

.v-light .nav0-mock__urlbar {
  color: var(--vp-c-text-3);
  background: rgba(15, 15, 20, 0.04);
}

.nav0-mock__canvas {
  position: relative;
  aspect-ratio: 16 / 10;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.nav0-mock__canvas-glow {
  position: absolute;
  inset: -20%;
  background: radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.18), transparent 60%);
  filter: blur(40px);
}

.nav0-mock__placeholder {
  position: relative;
  font-family: var(--nav0-font-mono);
  font-size: 0.875rem;
  color: rgba(245, 245, 247, 0.3);
  letter-spacing: -0.01em;
}

.v-light .nav0-mock__placeholder { color: var(--vp-c-text-3); }

/* responsive */
@media (max-width: 640px) {
  .nav0-showcase {
    padding: 5rem 1.25rem;
  }
  .nav0-showcase__stats {
    padding: 1.5rem;
  }
}
</style>
