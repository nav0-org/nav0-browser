<script setup lang="ts">
import { data as releases } from '../releases.data';

const { latest, totalCount, cadenceDays } = releases;

const sinceLabel = (() => {
  if (!releases.all.length) return '';
  const oldest = releases.all[releases.all.length - 1];
  const d = new Date(oldest.date);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
})();
</script>

<template>
  <div class="rel-stats" v-if="latest">
    <div class="rel-stat">
      <div class="rel-stat-key">Latest release</div>
      <div class="rel-stat-value">{{ latest.version }}</div>
      <div class="rel-stat-sub">{{ latest.dateShort }}</div>
    </div>
    <div class="rel-stat">
      <div class="rel-stat-key">Total releases</div>
      <div class="rel-stat-value rel-stat-accent">{{ totalCount }}</div>
      <div class="rel-stat-sub">since {{ sinceLabel }}</div>
    </div>
    <div class="rel-stat" v-if="cadenceDays !== null">
      <div class="rel-stat-key">Cadence</div>
      <div class="rel-stat-value">~{{ cadenceDays }}d</div>
      <div class="rel-stat-sub">avg between ships</div>
    </div>
  </div>
</template>
