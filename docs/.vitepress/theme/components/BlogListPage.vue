<script setup lang="ts">
import { computed, ref } from 'vue';
import { data as posts } from '../posts.data';

const activeCategory = ref('All');
const copied = ref(false);

const rssUrl = 'https://nav0.org/blog/feed.xml';

const categories = computed(() => {
  const counts: Record<string, number> = {};
  for (const p of posts) {
    counts[p.category] = (counts[p.category] || 0) + 1;
  }
  const order = ['Privacy', 'Comparisons', 'Performance', 'Indie web', 'Engineering'];
  const sorted = Object.entries(counts).sort(([a], [b]) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  return [
    { name: 'All', count: posts.length },
    ...sorted.map(([name, count]) => ({ name, count })),
  ];
});

const filteredPosts = computed(() =>
  activeCategory.value === 'All' ? posts : posts.filter((p) => p.category === activeCategory.value)
);

const featured = computed(() => filteredPosts.value[0]);
const gridPosts = computed(() => filteredPosts.value.slice(1));

const featuredIsIndieRenaissance = computed(
  () => featured.value?.slug === 'the-indie-browser-renaissance'
);

const indieMarks = ['M', 'H', 'L', 'Z', 'O', 'Q', 'S', 'F', 'LF', 'B', 'N0', '+'];

async function copyRss() {
  try {
    await navigator.clipboard?.writeText(rssUrl);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1500);
  } catch {
    // No telemetry per Nav0 privacy principles
  }
}
</script>

<template>
  <div class="bl-page">
    <!-- PAGE HEAD -->
    <section class="bl-page-head">
      <div class="bl-page-eyebrow">Writing</div>
      <h1 class="bl-page-title">Notes from a small <em>browser project.</em></h1>
      <p class="bl-page-sub">
        Thoughts on privacy, browsers, performance, and the open web. Published when there's
        something to say.
      </p>
    </section>

    <div class="bl-shell">
      <!-- FILTERS -->
      <div class="bl-filters">
        <span class="bl-filter-label">Topic</span>
        <button
          v-for="cat in categories"
          :key="cat.name"
          class="bl-chip"
          :class="{ 'is-active': activeCategory === cat.name }"
          @click="activeCategory = cat.name"
        >
          {{ cat.name }} <span class="bl-chip-count">{{ cat.count }}</span>
        </button>
        <div class="bl-search" aria-hidden="true">
          <span>Search posts</span>
          <span class="bl-kbd">/</span>
        </div>
      </div>

      <!-- FEATURED -->
      <a v-if="featured" :href="featured.url" class="bl-featured">
        <div
          class="bl-featured-art"
          :style="
            featuredIsIndieRenaissance
              ? 'background: linear-gradient(135deg, #0071e3 0%, #b347d9 50%, #ff5e7a 100%);'
              : `background: ${featured.artGradient};`
          "
        >
          <div v-if="featuredIsIndieRenaissance" class="bl-featured-marks" aria-hidden="true">
            <div
              v-for="(mark, i) in indieMarks"
              :key="i"
              class="bl-indie-mark"
              :class="{ 'is-us': mark === 'N0' }"
            >
              {{ mark }}
            </div>
          </div>
          <div v-else class="bl-featured-glyph" aria-hidden="true">
            {{ featured.artGlyph }}
          </div>
        </div>
        <div class="bl-featured-body">
          <div class="bl-featured-eyebrow">Featured</div>
          <h2>{{ featured.title }}</h2>
          <p>{{ featured.excerpt }}</p>
          <div class="bl-featured-meta">
            <span class="bl-tag">{{ featured.category }}</span>
            <span class="bl-dot"></span>
            <span>{{ featured.date }}</span>
            <span class="bl-dot"></span>
            <span>{{ featured.readTime }}</span>
            <span class="bl-dot"></span>
            <span>By {{ featured.author }}</span>
          </div>
        </div>
      </a>

      <!-- GRID -->
      <div v-if="gridPosts.length" class="bl-grid">
        <a v-for="post in gridPosts" :key="post.url" :href="post.url" class="bl-post-card">
          <div
            class="bl-post-art"
            :style="`background: ${post.artGradient}; color: ${post.artInk || '#fff'};`"
          >
            <span class="bl-post-glyph">{{ post.artGlyph }}</span>
          </div>
          <div class="bl-post-body">
            <span class="bl-post-tag">{{ post.tag }}</span>
            <h3>{{ post.title }}</h3>
            <p>{{ post.excerpt }}</p>
            <div class="bl-post-foot">
              <span>{{ post.date }}</span>
              <span>{{ post.shortReadTime }}</span>
            </div>
          </div>
        </a>
      </div>

      <!-- SUBSCRIBE -->
      <div class="bl-subscribe">
        <h3>Subscribe to the RSS feed</h3>
        <p>
          No newsletter, no email collection — just an RSS feed that updates when we ship a post. We
          don't even know if you're reading.
        </p>
        <div class="bl-subscribe-form">
          <input class="bl-subscribe-input" type="text" :value="rssUrl" readonly />
          <button class="bl-btn-primary" type="button" @click="copyRss">
            {{ copied ? 'Copied' : 'Copy URL' }}
          </button>
        </div>
        <div class="bl-subscribe-note">
          No tracking pixels. No open-rate analytics. No "what's hot" recommendations.
        </div>
      </div>
    </div>
  </div>
</template>
