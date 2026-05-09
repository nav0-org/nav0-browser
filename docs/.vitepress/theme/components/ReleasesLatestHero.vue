<script setup lang="ts">
import { data as releases } from '../releases.data';

const { latest } = releases;
</script>

<template>
  <div class="rel-latest-hero" v-if="latest">
    <div class="rel-latest-hero-inner">
      <div class="rel-latest-hero-main">
        <div class="rel-latest-tag">
          <span class="rel-latest-pulse" aria-hidden="true"></span>
          Latest · {{ latest.dateLong }}
        </div>
        <div class="rel-latest-version">{{ latest.version }}</div>
        <p class="rel-latest-headline">
          <slot>The most recent shipped change.</slot>
        </p>
        <div class="rel-latest-cta-row">
          <a class="rel-latest-cta-primary" :href="latest.url">Read full notes</a>
          <a class="rel-latest-cta-secondary" href="/install">Download Nav0</a>
        </div>
      </div>
      <div class="rel-latest-hero-summary" v-if="$slots.summary">
        <h4>What's in this one</h4>
        <slot name="summary" />
      </div>
    </div>
  </div>
</template>
