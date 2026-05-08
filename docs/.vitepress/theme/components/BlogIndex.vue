<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import ScrollReveal from './ScrollReveal.vue'

interface Post {
  title: string
  description?: string
  url: string
  date?: string
  tag?: string
  author?: string
  /** optional cover image URL */
  cover?: string
}

interface Props {
  posts?: Post[]
  eyebrow?: string
  heading?: string
}

const props = withDefaults(defineProps<Props>(), {
  eyebrow: 'writing',
  heading: 'notes from the build.',
  posts: () => []
})

const featured = computed(() => props.posts[0])
const rest = computed(() => props.posts.slice(1))

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
  <article class="nav0-bloglist">
    <ScrollReveal class="nav0-bloglist__header">
      <span class="nav0-eyebrow">{{ eyebrow }}</span>
      <h1 class="nav0-bloglist__heading">{{ heading }}</h1>
    </ScrollReveal>

    <!-- featured -->
    <ScrollReveal v-if="featured" class="nav0-featured">
      <a :href="featured.url" class="nav0-featured__link">
        <div class="nav0-featured__media" v-if="featured.cover">
          <img :src="featured.cover" :alt="featured.title" loading="lazy" />
        </div>
        <div class="nav0-featured__content">
          <div class="nav0-featured__meta">
            <span class="nav0-eyebrow">{{ featured.tag || 'featured' }}</span>
            <span v-if="featured.date" class="nav0-featured__date">{{ formatDate(featured.date) }}</span>
          </div>
          <h2 class="nav0-featured__title">{{ featured.title }}</h2>
          <p v-if="featured.description" class="nav0-featured__desc">{{ featured.description }}</p>
          <span class="nav0-featured__cta">read &rarr;</span>
        </div>
      </a>
    </ScrollReveal>

    <!-- list -->
    <ScrollReveal v-if="rest.length" :stagger="true" class="nav0-bloglist__grid">
      <a v-for="post in rest" :key="post.url" :href="post.url" class="nav0-postcard">
        <div v-if="post.cover" class="nav0-postcard__cover">
          <img :src="post.cover" :alt="post.title" loading="lazy" />
        </div>
        <div class="nav0-postcard__meta">
          <span class="nav0-eyebrow">{{ post.tag || 'post' }}</span>
          <span v-if="post.date" class="nav0-postcard__date">{{ formatDate(post.date) }}</span>
        </div>
        <h3 class="nav0-postcard__title">{{ post.title }}</h3>
        <p v-if="post.description" class="nav0-postcard__desc">{{ post.description }}</p>
      </a>
    </ScrollReveal>
  </article>
</template>

<style scoped>
.nav0-bloglist {
  max-width: 1200px;
  margin: 0 auto;
  padding: 8rem 1.5rem 6rem;
}

.nav0-bloglist__header {
  margin-bottom: 4rem;
  max-width: 720px;
}

.nav0-bloglist__heading {
  font-family: var(--nav0-font-display);
  font-size: var(--nav0-fs-h1);
  font-weight: 800;
  letter-spacing: var(--nav0-tracking-display);
  line-height: 1.05;
  margin: 1rem 0 0;
  color: var(--vp-c-text-1);
  text-wrap: balance;
}

/* -------- featured -------- */
.nav0-featured {
  margin-bottom: 5rem;
}

.nav0-featured__link {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
  text-decoration: none;
  color: inherit;
  padding: 2.5rem;
  border-radius: var(--nav0-radius-xl);
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-soft);
  transition: transform var(--nav0-dur-base) var(--nav0-ease),
              border-color var(--nav0-dur-base) var(--nav0-ease),
              box-shadow var(--nav0-dur-base) var(--nav0-ease);
}

.nav0-featured__link:hover {
  transform: translateY(-2px);
  border-color: var(--vp-c-brand-1);
  box-shadow: var(--nav0-shadow-md);
}

.nav0-featured__media {
  aspect-ratio: 4 / 3;
  border-radius: var(--nav0-radius-lg);
  overflow: hidden;
  background: var(--vp-c-bg-mute);
}

.nav0-featured__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nav0-featured__meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.nav0-featured__date {
  font-family: var(--nav0-font-mono);
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.nav0-featured__title {
  font-family: var(--nav0-font-display);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 700;
  letter-spacing: var(--nav0-tracking-display);
  line-height: 1.1;
  margin: 0 0 1rem 0;
  text-wrap: balance;
}

.nav0-featured__desc {
  font-family: var(--nav0-font-body);
  font-size: 1.0625rem;
  line-height: 1.55;
  color: var(--vp-c-text-2);
  margin: 0 0 1.5rem 0;
}

.nav0-featured__cta {
  font-family: var(--nav0-font-mono);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  text-transform: lowercase;
  letter-spacing: -0.01em;
}

/* -------- list grid -------- */
.nav0-bloglist__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
}

.nav0-postcard {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  padding: 1.75rem;
  border-radius: var(--nav0-radius-lg);
  border: 1px solid transparent;
  transition: transform var(--nav0-dur-base) var(--nav0-ease),
              background var(--nav0-dur-base) var(--nav0-ease),
              border-color var(--nav0-dur-base) var(--nav0-ease);
}

.nav0-postcard:hover {
  transform: translateY(-2px);
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-border);
}

.nav0-postcard__cover {
  aspect-ratio: 16 / 10;
  margin: -0.5rem -0.5rem 1.25rem;
  border-radius: var(--nav0-radius-md);
  overflow: hidden;
  background: var(--vp-c-bg-mute);
}

.nav0-postcard__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nav0-postcard__meta {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.75rem;
}

.nav0-postcard__date {
  font-family: var(--nav0-font-mono);
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.nav0-postcard__title {
  font-family: var(--nav0-font-display);
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: var(--nav0-tracking-tight);
  line-height: 1.2;
  margin: 0 0 0.625rem 0;
  text-wrap: balance;
  color: var(--vp-c-text-1);
}

.nav0-postcard__desc {
  font-family: var(--nav0-font-body);
  font-size: 0.9375rem;
  line-height: 1.55;
  color: var(--vp-c-text-2);
  margin: 0;
}

/* -------- responsive -------- */
@media (max-width: 760px) {
  .nav0-bloglist {
    padding: 6rem 1.25rem 4rem;
  }
  .nav0-featured__link {
    grid-template-columns: 1fr;
    padding: 1.75rem;
    gap: 1.5rem;
  }
  .nav0-bloglist__grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}
</style>
