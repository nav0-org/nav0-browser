<script setup lang="ts">
import { computed, ref } from 'vue';
import { marked } from 'marked';
import { faqData } from '../faq.data';

marked.setOptions({ gfm: true, breaks: false });

const categoryIcons: Record<string, string> = {
  General:
    '<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>',
  Privacy:
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
  Comparisons:
    '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline>',
  Features:
    '<path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6 7 18.2l1.9-5.8L4 8.8h6.1L12 3z"></path>',
  Project:
    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
};
const fallbackIcon =
  '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>';

function iconFor(name: string): string {
  return categoryIcons[name] || fallbackIcon;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const renderedFaq = computed(() =>
  faqData.map((cat) => ({
    ...cat,
    slug: slug(cat.name),
    questions: cat.questions.map((q) => ({
      q: q.q,
      a: marked.parse(q.a) as string,
    })),
  }))
);

const activeCat = ref<string>(renderedFaq.value[0]?.slug || '');
const search = ref('');

const filteredFaq = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) {
    return renderedFaq.value.filter((c) => c.slug === activeCat.value);
  }
  return renderedFaq.value
    .map((cat) => ({
      ...cat,
      questions: cat.questions.filter(
        (q) =>
          q.q.toLowerCase().includes(term) ||
          q.a.toLowerCase().includes(term)
      ),
    }))
    .filter((c) => c.questions.length > 0);
});

const isSearching = computed(() => search.value.trim().length > 0);

const totalCount = computed(() =>
  filteredFaq.value.reduce((acc, c) => acc + c.questions.length, 0)
);

function selectCat(slugId: string) {
  activeCat.value = slugId;
  search.value = '';
  if (typeof window !== 'undefined') {
    history.replaceState(null, '', `#${slugId}`);
  }
}

if (typeof window !== 'undefined') {
  const initial = location.hash.replace('#', '');
  if (initial && renderedFaq.value.some((c) => c.slug === initial)) {
    activeCat.value = initial;
  }
}
</script>

<template>
  <div class="faq-page-v2">
    <!-- HERO -->
    <section class="faq-hero">
      <div class="faq-hero-inner">
        <div class="faq-eyebrow">Help</div>
        <h1 class="faq-title">Frequently asked&nbsp;questions.</h1>
        <p class="faq-tagline">
          Everything we get asked, in one place. {{ renderedFaq.length }} sections,
          {{ renderedFaq.reduce((acc, c) => acc + c.questions.length, 0) }} answers — privacy,
          installation, features, and the project.
        </p>
      </div>
    </section>

    <div class="faq-shell">
      <!-- LEFT: CATEGORIES -->
      <aside class="faq-side">
        <div class="faq-side-label">Categories</div>
        <ul class="faq-cats">
          <li v-for="cat in renderedFaq" :key="cat.slug">
            <a
              :href="`#${cat.slug}`"
              :class="['faq-cat', { 'is-active': activeCat === cat.slug && !isSearching }]"
              @click.prevent="selectCat(cat.slug)"
            >
              <svg
                class="faq-cat-ico"
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
                v-html="iconFor(cat.name)"
              />
              <span class="faq-cat-name">{{ cat.name }}</span>
              <span class="faq-cat-count">{{ cat.questions.length }}</span>
            </a>
          </li>
        </ul>
      </aside>

      <!-- RIGHT: MAIN -->
      <main class="faq-main">
        <div class="faq-search">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            v-model="search"
            type="search"
            placeholder='Search the FAQ — try "telemetry", "Linux", "fingerprint"…'
            aria-label="Search FAQ"
          />
        </div>

        <div v-if="isSearching && totalCount === 0" class="faq-empty">
          No questions match your search. Try a different keyword.
        </div>

        <section
          v-for="(cat, i) in filteredFaq"
          :key="cat.slug"
          :id="cat.slug"
          class="faq-section"
        >
          <header class="faq-section-head">
            <span class="faq-section-num">{{ String(i + 1).padStart(2, '0') }}</span>
            <h2 class="faq-section-title">{{ cat.name }}</h2>
            <span class="faq-section-meta">
              {{ cat.questions.length }} question{{ cat.questions.length === 1 ? '' : 's' }}
            </span>
          </header>

          <details v-for="(q, idx) in cat.questions" :key="q.q" class="faq-item">
            <summary>
              <span class="faq-q-tag">{{ String(idx + 1).padStart(2, '0') }}</span>
              <span class="faq-q-text">{{ q.q }}</span>
              <svg
                class="faq-q-chev"
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </summary>
            <div class="faq-answer" v-html="q.a" />
          </details>
        </section>

        <div class="faq-foothint">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            class="faq-foothint-ico"
          >
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            ></path>
          </svg>
          <div>
            <h3>Didn't find your answer?</h3>
            <p>Open a discussion on GitHub or read the full guide.</p>
          </div>
          <a class="faq-foothint-btn" href="/guide/getting-started">Read the guide</a>
        </div>
      </main>
    </div>
  </div>
</template>
