<script setup lang="ts">
import ScrollReveal from './ScrollReveal.vue'
import GlassCard from './GlassCard.vue'

interface Feature {
  icon?: string         // emoji, single character, or short text glyph
  title: string
  description: string
  link?: string
  /** optional accent dot color */
  accent?: string
}

interface Props {
  eyebrow?: string
  heading?: string
  subheading?: string
  features?: Feature[]
}

withDefaults(defineProps<Props>(), {
  eyebrow: 'principles',
  heading: 'control over compromise.',
  subheading: 'every default in nav0 favors you, not the publisher, the platform, or the ad network.',
  features: () => [
    {
      title: 'no telemetry. period.',
      description: 'no analytics pings, no crash reporters phoning home, no opt-out checkbox buried in settings. nav0 ships with the network closed by default.',
      accent: '#6366f1'
    },
    {
      title: 'permission as a verb.',
      description: 'sites ask. you decide. once. no more death-by-popup, no more silent renewals — every grant is intentional and revocable from a single panel.',
      accent: '#ef4444'
    },
    {
      title: 'reader by default.',
      description: 'paywalls, popovers, autoplay, push-prompts — interruption layers stripped on first paint. read what you came for, not what surrounded it.',
      accent: '#f59e0b'
    },
    {
      title: 'lean by build, not by claim.',
      description: '48% less memory, 86% less idle cpu vs chrome on the same workload. fewer background processes, no extension store theatre, no sync layer.',
      accent: '#10b981'
    },
    {
      title: 'history that\'s yours.',
      description: 'local sqlite. searchable, exportable, deletable. no cloud sync you didn\'t ask for, no "personalised" features built on top of your reading life.',
      accent: '#3b82f6'
    },
    {
      title: 'no extension store.',
      description: 'extensions are vectors. nav0 supports a small, audited set of capabilities — content blocking, reader mode, password import — built into the binary.',
      accent: '#a855f7'
    }
  ]
})
</script>

<template>
  <section class="nav0-features">
    <ScrollReveal as="header" class="nav0-features__header">
      <span class="nav0-eyebrow">{{ eyebrow }}</span>
      <h2 class="nav0-features__heading">{{ heading }}</h2>
      <p class="nav0-features__subheading">{{ subheading }}</p>
    </ScrollReveal>

    <ScrollReveal :stagger="true" class="nav0-features__grid">
      <GlassCard
        v-for="(feature, i) in features"
        :key="i"
        :href="feature.link"
        padding="lg"
      >
        <div class="nav0-feature__accent" :style="{ background: feature.accent || 'var(--nav0-indigo)' }" />
        <h3 class="nav0-feature__title">{{ feature.title }}</h3>
        <p class="nav0-feature__description">{{ feature.description }}</p>
      </GlassCard>
    </ScrollReveal>
  </section>
</template>

<style scoped>
.nav0-features {
  position: relative;
  padding: var(--nav0-space-3xl) 1.5rem;
  max-width: 1280px;
  margin: 0 auto;
}

.nav0-features__header {
  max-width: 720px;
  margin: 0 auto var(--nav0-space-xl);
  text-align: center;
}

.nav0-features__heading {
  font-family: var(--nav0-font-display);
  font-size: var(--nav0-fs-h1);
  font-weight: 800;
  letter-spacing: var(--nav0-tracking-display);
  line-height: 1.05;
  margin: 1rem 0 1.5rem;
  text-wrap: balance;

  background: linear-gradient(180deg, var(--vp-c-text-1) 0%, var(--vp-c-text-2) 110%);
  -webkit-background-clip: text;
          background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav0-features__subheading {
  font-family: var(--nav0-font-body);
  font-size: 1.1875rem;
  line-height: 1.55;
  color: var(--vp-c-text-2);
  text-wrap: balance;
}

/* grid */
.nav0-features__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
}

/* feature card body */
.nav0-feature__accent {
  width: 28px;
  height: 4px;
  border-radius: 999px;
  margin-bottom: 1.25rem;
}

.nav0-feature__title {
  font-family: var(--nav0-font-display);
  font-weight: 700;
  letter-spacing: var(--nav0-tracking-tight);
  font-size: 1.25rem;
  line-height: 1.25;
  margin: 0 0 0.75rem 0;
  color: var(--vp-c-text-1);
}

.nav0-feature__description {
  font-family: var(--nav0-font-body);
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  margin: 0;
}

/* responsive */
@media (max-width: 640px) {
  .nav0-features {
    padding: 5rem 1.25rem;
  }
  .nav0-features__grid {
    grid-template-columns: 1fr;
  }
}
</style>
