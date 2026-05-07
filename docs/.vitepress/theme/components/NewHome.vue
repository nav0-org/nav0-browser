<template>
  <div class="nv-home">
    <!-- HERO -->
    <section class="nv-hero">
      <div class="nv-hero-inner">
        <h1 class="nv-display">
          <span class="grad">Browse.</span><br />
          <em>Nothing more.</em>
        </h1>
        <p class="nv-hero-sub">
          A minimal, privacy-focused web browser. Zero telemetry. No bloat. No AI gimmicks.
        </p>
        <div class="nv-cta-row">
          <a class="nv-btn nv-btn--primary nv-btn--lg" href="/install">Download</a>
          <a class="nv-btn nv-btn--ghost" href="https://github.com/nav0-org/nav0-browser"
            >View on GitHub</a
          >
        </div>
      </div>

      <div class="nv-hero-stage">
        <div class="nv-hero-stage-inner">
          <div class="nv-hero-stage-glow" />
          <Nav0BrowserMock />
        </div>
      </div>

      <div class="nv-hero-meta">
        <div class="nv-hero-meta-card">
          <div class="k">Memory</div>
          <div class="v">&minus;45%<small>vs Chrome</small></div>
        </div>
        <div class="nv-hero-meta-card">
          <div class="k">CPU at idle</div>
          <div class="v">&minus;77%<small>vs Chrome</small></div>
        </div>
        <div class="nv-hero-meta-card">
          <div class="k">Telemetry</div>
          <div class="v">0<small>requests</small></div>
        </div>
        <div class="nv-hero-meta-card">
          <div class="k">Accounts</div>
          <div class="v">0<small>required</small></div>
        </div>
      </div>
    </section>

    <!-- PILLARS -->
    <section class="nv-block nv-tinted" id="features">
      <div class="nv-wrap">
        <div class="nv-section-eyebrow">Six pillars</div>
        <h2 class="nv-section-title">
          A browser built on <em class="accent">fewer ideas,</em> executed properly.
        </h2>
        <p class="nv-section-sub">
          Every feature earns its keep. Anything that doesn't, isn't here.
        </p>
        <div class="nv-pillars">
          <div v-for="(p, i) in pillars" :key="p.id" class="nv-pillar">
            <div class="nv-pillar-icon" :class="`tone-${i + 1}`">
              <component :is="p.icon" />
            </div>
            <h3 class="nv-pillar-title">{{ p.title }}</h3>
            <p class="nv-pillar-body">{{ p.body }}</p>
            <div class="nv-pillar-glyph">
              <span>{{ p.metric }}</span>
              <span class="arrow"><IconArrowRight /></span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- PACKAGE -->
    <section class="nv-block" id="package">
      <div class="nv-wrap">
        <div class="nv-section-eyebrow">The complete package</div>
        <h2 class="nv-section-title">Everything you need. <em>Nothing you don't.</em></h2>
        <p class="nv-section-sub">Two lists. One short, one shorter. Both deliberate.</p>
      </div>
    </section>

    <!-- PERF -->
    <section class="nv-block nv-tinted" id="perf">
      <div class="nv-wrap">
        <div class="nv-section-eyebrow">Benchmarks</div>
        <h2 class="nv-section-title">Lighter, by design. <em>Measured, not promised.</em></h2>
        <p class="nv-section-sub">Same hardware. Same five tabs. Half the appetite.</p>
        <div class="nv-perf-hero">
          <div class="nv-perf-card">
            <div class="nv-perf-label">Memory used</div>
            <h3 class="nv-perf-stat">&minus;45%</h3>
            <div class="nv-perf-headline">Less RAM, more headroom</div>
            <p class="nv-perf-detail">
              Nav0 holds five typical tabs in roughly half the RAM Chrome wants for the same
              workload.
            </p>
            <div class="nv-perf-bar-row">
              <span class="nv-perf-name">Nav0</span>
              <span class="nv-perf-track"
                ><span class="nv-perf-fill nav0" style="width: 55%" /></span
              >
              <span class="nv-perf-num">612 MB</span>
            </div>
            <div class="nv-perf-bar-row">
              <span class="nv-perf-name">Chrome</span>
              <span class="nv-perf-track"
                ><span class="nv-perf-fill chrome" style="width: 100%" /></span
              >
              <span class="nv-perf-num">1,115 MB</span>
            </div>
          </div>
          <div class="nv-perf-card warm">
            <div class="nv-perf-label">CPU at idle</div>
            <h3 class="nv-perf-stat">&minus;77%</h3>
            <div class="nv-perf-headline">Idle means idle</div>
            <p class="nv-perf-detail">
              No background sync. No recommendation engine. No idle network requests. Just an idle
              browser.
            </p>
            <div class="nv-perf-bar-row">
              <span class="nv-perf-name">Nav0</span>
              <span class="nv-perf-track"
                ><span class="nv-perf-fill warm" style="width: 23%" /></span
              >
              <span class="nv-perf-num">0.9%</span>
            </div>
            <div class="nv-perf-bar-row">
              <span class="nv-perf-name">Chrome</span>
              <span class="nv-perf-track"
                ><span class="nv-perf-fill chrome" style="width: 100%" /></span
              >
              <span class="nv-perf-num">3.9%</span>
            </div>
          </div>
        </div>
        <div class="nv-perf-foot">
          <span>M1 MacBook Pro · 5 tabs · 30-minute session ·&nbsp;</span>
          <a href="/blog/nav0-vs-chrome-performance-benchmark">Read the full report ›</a>
        </div>
      </div>
    </section>

    <!-- MANIFESTO -->
    <section class="nv-block" id="manifesto">
      <div class="nv-wrap">
        <div class="nv-manifesto-grid">
          <div class="nv-manifesto-body">
            <div class="nv-section-eyebrow nv-eyebrow-left">Why Nav0</div>
            <h2 class="nv-section-title nv-title-left">
              The browser became a <em>data harvesting machine.</em>
            </h2>
            <p>
              What started as a simple tool to view web pages turned into a billboard: AI
              assistants you didn't ask for, news feeds you didn't subscribe to, accounts you
              didn't sign up for, telemetry you can't see.
            </p>
            <p>
              <em>Nav0 takes a different approach.</em> It does one thing: lets you browse the web.
              No assistants. No phoning home. No clutter. No accounts. Browse. Bookmark. Done.
            </p>
            <div class="nv-signature">— Nav0 Team · 2026</div>
          </div>
          <aside class="nv-definition-card">
            <div class="nv-word">Nav0</div>
            <div class="nv-ipa">/ˈnav nɔːt/ · noun</div>
            <p>
              From <strong>navigate</strong> + <strong>nought</strong> (zero, nothing). A browser
              that collects nought, ships nought extra, and otherwise gets out of the way.
            </p>
            <div class="nv-pronounce">
              <strong>Pronounce it:</strong> "Nav Nought." Because your browser should collect
              nought.
            </div>
          </aside>
        </div>
      </div>
    </section>

    <!-- BLOG -->
    <section class="nv-block nv-tinted" id="blog">
      <div class="nv-wrap">
        <div class="nv-section-eyebrow">From the blog</div>
        <h2 class="nv-section-title">Thoughts on privacy, browsers, <em>and the open web.</em></h2>
        <div class="nv-blog-grid">
          <a
            v-for="(p, i) in featuredPosts"
            :key="p.url || i"
            :href="p.url"
            class="nv-post"
            :class="{ feat: i === 0 }"
          >
            <span class="nv-post-tag">{{ p.tag }}</span>
            <h3 class="nv-post-title">{{ p.title }}</h3>
            <p class="nv-post-excerpt">{{ p.excerpt }}</p>
            <div class="nv-post-foot">
              <span>{{ p.date }}</span>
              <span>{{ p.readTime }}</span>
            </div>
          </a>
        </div>
        <div class="nv-blog-cta">
          <a class="nv-btn nv-btn--secondary" href="/blog/">View all posts</a>
        </div>
      </div>
    </section>

    <!-- ENDCAP -->
    <section class="nv-endcap" id="install">
      <div class="nv-endcap-inner">
        <div class="nv-wrap">
          <div class="nv-section-eyebrow nv-endcap-eyebrow">Ready when you are</div>
          <h2 class="nv-endcap-title">Take back your browsing experience.</h2>
          <p class="nv-endcap-sub">
            Free. Open source. No account.
          </p>
          <div class="nv-download-row">
            <a class="nv-btn nv-btn--primary nv-btn--lg" href="/install">Download for macOS</a>
            <a class="nv-btn nv-btn--secondary nv-btn--lg" href="/install">Linux .deb</a>
            <a class="nv-btn nv-btn--secondary nv-btn--lg" href="/install">Windows .exe</a>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, h } from 'vue';
import { data as posts } from '../posts.data';
import Nav0BrowserMock from './Nav0BrowserMock.vue';

const Icon = (paths, opts = {}) =>
  () =>
    h(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        width: 20,
        height: 20,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': opts.strokeWidth || 1.75,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true',
      },
      paths.map((d) =>
        d.tag === 'circle'
          ? h('circle', { cx: d.cx, cy: d.cy, r: d.r })
          : d.tag === 'line'
          ? h('line', { x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2 })
          : d.tag === 'polyline'
          ? h('polyline', { points: d.points })
          : h('path', { d: d.d })
      )
    );

const IconShield = Icon([
  { tag: 'path', d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
]);
const IconZap = Icon([
  { tag: 'path', d: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z' },
]);
const IconFeather = Icon([
  { tag: 'path', d: 'M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z' },
  { tag: 'line', x1: 16, y1: 8, x2: 2, y2: 22 },
  { tag: 'line', x1: 17.5, y1: 15, x2: 9, y2: 15 },
]);
const IconLock = Icon([
  { tag: 'path', d: 'M5 11h14v10H5z' },
  { tag: 'path', d: 'M7 11V7a5 5 0 0 1 10 0v4' },
]);
const IconWifiOff = Icon([
  { tag: 'line', x1: 1, y1: 1, x2: 23, y2: 23 },
  { tag: 'path', d: 'M16.72 11.06A10.94 10.94 0 0 1 19 12.55' },
  { tag: 'path', d: 'M5 12.55a10.94 10.94 0 0 1 5.17-2.39' },
  { tag: 'path', d: 'M10.71 5.05A16 16 0 0 1 22.58 9' },
  { tag: 'path', d: 'M1.42 9a15.91 15.91 0 0 1 4.7-2.88' },
  { tag: 'path', d: 'M8.53 16.11a6 6 0 0 1 6.95 0' },
  { tag: 'line', x1: 12, y1: 20, x2: 12.01, y2: 20 },
]);
const IconGitBranch = Icon([
  { tag: 'line', x1: 6, y1: 3, x2: 6, y2: 15 },
  { tag: 'circle', cx: 18, cy: 6, r: 3 },
  { tag: 'circle', cx: 6, cy: 18, r: 3 },
  { tag: 'path', d: 'M18 9a9 9 0 0 1-9 9' },
]);
const IconArrowRight = Icon(
  [
    { tag: 'line', x1: 5, y1: 12, x2: 19, y2: 12 },
    { tag: 'polyline', points: '12 5 19 12 12 19' },
  ],
  { strokeWidth: 2 }
);

const pillars = [
  {
    id: 'lightweight',
    icon: IconZap,
    title: 'Lightweight',
    body: 'Built for speed and efficiency. Minimal system resources, fast startup, no idle network chatter.',
    metric: '~120 MB cold start',
  },
  {
    id: 'privacy',
    icon: IconShield,
    title: 'Privacy First',
    body: "Your data stays yours. No telemetry, no tracking, no analytics. We don't know who you are, and we like it that way.",
    metric: '0 phone-home requests',
  },
  {
    id: 'no-ai',
    icon: IconFeather,
    title: 'No AI Bloat',
    body: 'No forced assistants, no chatbots, no "smart" features you never asked for. Just a browser that browses.',
    metric: '0 LLMs onboard',
  },
  {
    id: 'safe',
    icon: IconLock,
    title: 'Safe Browsing',
    body: 'Built-in protection against malicious sites and downloads. Local-only blocklists. Security without surveillance.',
    metric: 'Local blocklists',
  },
  {
    id: 'open',
    icon: IconGitBranch,
    title: 'Open Source',
    body: "Fully transparent. Audit it, fork it, contribute. Your browser should have nothing to hide — ours doesn’t.",
    metric: 'MIT licensed',
  },
  {
    id: 'modern',
    icon: IconWifiOff,
    title: 'Modern Engine',
    body: 'Powered by Electron and Chromium for compatibility with the modern web while respecting your privacy.',
    metric: 'Chromium 130',
  },
];

const featuredPosts = computed(() => posts.slice(0, 5));
</script>

<style scoped>
.nv-home {
  --nv-bg: var(--vp-c-bg);
  --nv-bg-muted: var(--vp-c-bg-soft);
  --nv-bg-soft: var(--vp-c-bg-elv);
  --nv-bg-card: var(--vp-c-bg);
  --nv-ink: var(--vp-c-text-1);
  --nv-ink-2: var(--vp-c-text-2);
  --nv-ink-3: var(--vp-c-text-3);
  --nv-ink-4: var(--vp-c-text-3);
  --nv-rule: var(--vp-c-divider);
  --nv-rule-soft: var(--vp-c-divider);
  --nv-accent: #0071e3;
  --nv-accent-hover: #0077ed;
  --nv-accent-soft: rgba(0, 113, 227, 0.08);
  --nv-good: #1f8b4c;
  --nv-bad: #c43c3c;
  --nv-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.04);
  --nv-shadow-md: 0 4px 16px rgba(0, 0, 0, 0.06), 0 24px 48px -12px rgba(0, 0, 0, 0.1);
  --nv-shadow-lg: 0 12px 24px rgba(0, 0, 0, 0.08), 0 40px 80px -16px rgba(0, 0, 0, 0.18);
  --nv-sans:
    'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Helvetica,
    Arial, sans-serif;
  --nv-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;

  font-family: var(--nv-sans);
  font-size: 17px;
  line-height: 1.47;
  letter-spacing: -0.003em;
  color: var(--nv-ink);
  -webkit-font-smoothing: antialiased;
}

:global(html.dark) .nv-home {
  --nv-accent: #2997ff;
  --nv-accent-hover: #4ea7ff;
  --nv-accent-soft: rgba(41, 151, 255, 0.12);
  --nv-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3);
  --nv-shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4), 0 24px 48px -12px rgba(0, 0, 0, 0.6);
  --nv-shadow-lg: 0 12px 24px rgba(0, 0, 0, 0.5), 0 40px 80px -16px rgba(0, 0, 0, 0.7);
}

.nv-home :deep(*) {
  box-sizing: border-box;
}

.nv-wrap {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 24px;
}

/* ====== BUTTONS ====== */
.nv-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 18px;
  height: 40px;
  font-family: var(--nv-sans);
  font-size: 15px;
  font-weight: 500;
  text-decoration: none;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  letter-spacing: -0.01em;
  transition:
    background 160ms ease,
    color 160ms ease,
    transform 80ms ease,
    box-shadow 160ms ease;
  white-space: nowrap;
}
.nv-btn--primary {
  background: var(--nv-accent);
  color: #fff;
}
.nv-btn--primary:hover {
  background: var(--nv-accent-hover);
  color: #fff;
}
.nv-btn--ghost {
  background: transparent;
  color: var(--nv-accent);
  padding: 0;
  height: auto;
}
.nv-btn--ghost:hover {
  color: var(--nv-accent-hover);
}
.nv-btn--ghost::after {
  content: ' ›';
  transition: transform 160ms;
}
.nv-btn--ghost:hover::after {
  transform: translateX(2px);
}
.nv-btn--secondary {
  background: var(--nv-bg-card);
  color: var(--nv-ink);
  border: 1px solid var(--nv-rule);
}
.nv-btn--secondary:hover {
  background: var(--nv-bg-muted);
}
.nv-btn--lg {
  height: 48px;
  padding: 0 26px;
  font-size: 17px;
}

/* ====== HERO ====== */
.nv-hero {
  text-align: center;
  padding: 72px 0 0;
  background: var(--nv-bg);
  position: relative;
  overflow: hidden;
}
.nv-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 800px 600px at 50% -100px,
    var(--nv-accent-soft) 0%,
    transparent 70%
  );
  pointer-events: none;
}
.nv-hero-inner {
  position: relative;
  z-index: 1;
}

.nv-display {
  font-family: var(--nv-sans);
  font-weight: 700;
  font-size: clamp(48px, 8vw, 96px);
  line-height: 1.05;
  letter-spacing: -0.04em;
  margin: 0 auto 18px;
  max-width: 14ch;
  color: var(--nv-ink);
}

.nv-display .grad {
  background: linear-gradient(180deg, var(--nv-ink) 0%, var(--nv-ink-2) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.nv-display em {
  font-style: normal;
  background: linear-gradient(120deg, var(--nv-accent) 0%, #b347d9 50%, #ff5e7a 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.nv-hero-sub {
  font-family: var(--nv-sans);
  font-size: clamp(20px, 2.2vw, 24px);
  color: var(--nv-ink-2);
  max-width: 32ch;
  margin: 0 auto 28px;
  line-height: 1.35;
  letter-spacing: -0.012em;
  font-weight: 400;
}

.nv-cta-row {
  display: flex;
  gap: 18px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 56px;
}

.nv-hero-stage {
  position: relative;
  padding: 0 24px 96px;
  margin-top: 24px;
}
.nv-hero-stage-inner {
  max-width: 1080px;
  margin: 0 auto;
  position: relative;
}
.nv-hero-stage-glow {
  position: absolute;
  inset: -8% -4% -4%;
  background: radial-gradient(
    ellipse 60% 60% at 50% 50%,
    var(--nv-accent-soft) 0%,
    transparent 70%
  );
  filter: blur(40px);
  pointer-events: none;
  z-index: 0;
}

/* ====== HERO META TILES ====== */
.nv-hero-meta {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  max-width: 1080px;
  margin: 0 auto 96px;
  padding: 0 24px;
}
.nv-hero-meta-card {
  background: var(--nv-bg-card);
  border: 1px solid var(--nv-rule-soft);
  border-radius: 18px;
  padding: 22px 24px;
  text-align: left;
  box-shadow: var(--nv-shadow-sm);
}
.nv-hero-meta-card .k {
  font-size: 12px;
  color: var(--nv-ink-3);
  margin-bottom: 6px;
  font-weight: 500;
  letter-spacing: -0.005em;
}
.nv-hero-meta-card .v {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--nv-ink);
  line-height: 1;
}
.nv-hero-meta-card .v small {
  font-size: 13px;
  font-weight: 500;
  color: var(--nv-ink-3);
  margin-left: 6px;
  letter-spacing: -0.01em;
}

/* ====== SECTION CHROME ====== */
.nv-block {
  padding: 120px 0;
  position: relative;
}
.nv-block.nv-tinted {
  background: var(--nv-bg-muted);
}

.nv-section-eyebrow {
  font-size: 14px;
  font-weight: 600;
  color: var(--nv-accent);
  text-align: center;
  margin-bottom: 12px;
  letter-spacing: -0.005em;
}
.nv-section-eyebrow.nv-eyebrow-left {
  text-align: left;
  margin-bottom: 16px;
}

.nv-section-title {
  font-family: var(--nv-sans);
  font-weight: 700;
  font-size: clamp(36px, 5vw, 64px);
  line-height: 1.06;
  letter-spacing: -0.035em;
  margin: 0 auto 20px;
  max-width: 18ch;
  text-align: center;
  color: var(--nv-ink);
  border-top: none;
  padding-top: 0;
}
.nv-section-title.nv-title-left {
  text-align: left;
  margin: 0 0 32px;
  max-width: none;
}
.nv-section-title em {
  font-style: normal;
  color: var(--nv-ink-3);
}
.nv-section-title em.accent {
  background: linear-gradient(120deg, var(--nv-accent) 0%, #b347d9 50%, #ff5e7a 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.nv-section-sub {
  font-family: var(--nv-sans);
  font-size: 21px;
  color: var(--nv-ink-2);
  max-width: 44ch;
  margin: 0 auto 64px;
  text-align: center;
  line-height: 1.4;
  font-weight: 400;
  letter-spacing: -0.012em;
}

/* ====== PILLARS ====== */
.nv-pillars {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.nv-pillar {
  background: var(--nv-bg-card);
  border: 1px solid var(--nv-rule-soft);
  border-radius: 22px;
  padding: 32px;
  transition:
    transform 240ms ease,
    box-shadow 240ms ease,
    border-color 240ms ease;
  display: flex;
  flex-direction: column;
  min-height: 280px;
  box-shadow: var(--nv-shadow-sm);
}
.nv-pillar:hover {
  transform: translateY(-4px);
  box-shadow: var(--nv-shadow-md);
}
.nv-pillar-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  margin-bottom: 22px;
  background: var(--nv-accent-soft);
  color: var(--nv-accent);
}
.nv-pillar-icon.tone-2 {
  background: rgba(180, 71, 217, 0.1);
  color: #b347d9;
}
.nv-pillar-icon.tone-3 {
  background: rgba(255, 94, 122, 0.1);
  color: #ff5e7a;
}
.nv-pillar-icon.tone-4 {
  background: rgba(31, 139, 76, 0.1);
  color: var(--nv-good);
}
.nv-pillar-icon.tone-5 {
  background: rgba(255, 140, 32, 0.12);
  color: #ff8c20;
}
.nv-pillar-icon.tone-6 {
  background: rgba(0, 180, 200, 0.1);
  color: #00b4c8;
}
.nv-pillar-title {
  font-family: var(--nv-sans);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.022em;
  margin: 0 0 10px;
  color: var(--nv-ink);
  border-top: none;
  padding-top: 0;
}
.nv-pillar-body {
  font-family: var(--nv-sans);
  font-size: 16px;
  color: var(--nv-ink-2);
  line-height: 1.5;
  margin: 0;
  letter-spacing: -0.005em;
}
.nv-pillar-glyph {
  margin-top: auto;
  padding-top: 22px;
  font-family: var(--nv-mono);
  font-size: 12px;
  color: var(--nv-ink-3);
  display: flex;
  justify-content: space-between;
  align-items: center;
  letter-spacing: 0.01em;
}
.nv-pillar-glyph .arrow {
  color: var(--nv-accent);
  opacity: 0;
  transform: translateX(-4px);
  transition:
    opacity 200ms,
    transform 200ms;
  display: inline-flex;
}
.nv-pillar:hover .nv-pillar-glyph .arrow {
  opacity: 1;
  transform: translateX(0);
}

/* ====== PERF ====== */
.nv-perf-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.nv-perf-card {
  background: var(--nv-bg-card);
  border: 1px solid var(--nv-rule-soft);
  border-radius: 22px;
  padding: 48px;
  box-shadow: var(--nv-shadow-sm);
  overflow: hidden;
  position: relative;
}
.nv-perf-stat {
  font-family: var(--nv-sans);
  font-size: clamp(96px, 12vw, 168px);
  line-height: 0.92;
  font-weight: 800;
  letter-spacing: -0.05em;
  margin: 0 0 16px;
  background: linear-gradient(135deg, var(--nv-accent) 0%, #b347d9 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  border-top: none;
  padding-top: 0;
}
.nv-perf-card.warm .nv-perf-stat {
  background: linear-gradient(135deg, #ff8c20 0%, #ff5e7a 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.nv-perf-label {
  font-family: var(--nv-sans);
  font-size: 13px;
  font-weight: 600;
  color: var(--nv-ink-3);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.nv-perf-headline {
  font-family: var(--nv-sans);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.022em;
  margin: 0 0 12px;
  color: var(--nv-ink);
}
.nv-perf-detail {
  font-family: var(--nv-sans);
  font-size: 16px;
  color: var(--nv-ink-2);
  margin: 0 0 24px;
  max-width: 38ch;
  line-height: 1.5;
  letter-spacing: -0.005em;
}
.nv-perf-bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--nv-mono);
  font-size: 12px;
  color: var(--nv-ink-3);
  margin: 6px 0;
}
.nv-perf-name {
  width: 60px;
  color: var(--nv-ink);
  font-weight: 500;
}
.nv-perf-track {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: var(--nv-rule-soft);
  overflow: hidden;
}
.nv-perf-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
}
.nv-perf-fill.nav0 {
  background: linear-gradient(90deg, var(--nv-accent), #b347d9);
}
.nv-perf-fill.warm {
  background: linear-gradient(90deg, #ff8c20, #ff5e7a);
}
.nv-perf-fill.chrome {
  background: var(--nv-ink-4);
}
.nv-perf-num {
  width: 72px;
  text-align: right;
  color: var(--nv-ink-2);
}
.nv-perf-foot {
  display: flex;
  justify-content: center;
  margin-top: 32px;
  font-size: 13px;
  color: var(--nv-ink-3);
  flex-wrap: wrap;
}
.nv-perf-foot a {
  color: var(--nv-accent);
  text-decoration: none;
}

/* ====== MANIFESTO ====== */
.nv-manifesto-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 64px;
  align-items: start;
}
.nv-manifesto-body p {
  font-family: var(--nv-sans);
  font-size: 28px;
  line-height: 1.32;
  letter-spacing: -0.022em;
  margin: 0 0 22px;
  font-weight: 500;
  color: var(--nv-ink);
}
.nv-manifesto-body p em {
  color: var(--nv-ink-3);
  font-style: normal;
}
.nv-signature {
  font-family: var(--nv-sans);
  font-size: 13px;
  color: var(--nv-ink-3);
  margin-top: 28px;
  font-weight: 500;
}
.nv-definition-card {
  background: var(--nv-bg-card);
  border: 1px solid var(--nv-rule-soft);
  border-radius: 22px;
  padding: 32px;
  box-shadow: var(--nv-shadow-sm);
  position: sticky;
  top: 80px;
}
.nv-word {
  font-family: var(--nv-sans);
  font-size: 56px;
  font-weight: 700;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, var(--nv-accent) 0%, #b347d9 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: 4px;
  line-height: 1;
}
.nv-ipa {
  font-family: var(--nv-mono);
  font-size: 13px;
  color: var(--nv-ink-3);
  margin-bottom: 18px;
}
.nv-definition-card p {
  font-family: var(--nv-sans);
  font-size: 15px;
  color: var(--nv-ink-2);
  line-height: 1.55;
  margin: 0 0 14px;
  letter-spacing: -0.005em;
}
.nv-pronounce {
  margin-top: 20px;
  padding: 14px 16px;
  background: var(--nv-bg-muted);
  border-radius: 12px;
  font-family: var(--nv-sans);
  font-size: 14px;
  color: var(--nv-ink);
}
.nv-pronounce strong {
  color: var(--nv-accent);
}

/* ====== BLOG ====== */
.nv-blog-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 16px;
}
.nv-post {
  background: var(--nv-bg-card);
  border: 1px solid var(--nv-rule-soft);
  border-radius: 22px;
  padding: 28px;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  min-height: 280px;
  box-shadow: var(--nv-shadow-sm);
  transition:
    transform 220ms ease,
    box-shadow 220ms ease;
}
.nv-post:hover {
  transform: translateY(-3px);
  box-shadow: var(--nv-shadow-md);
  text-decoration: none;
}
.nv-post.feat {
  grid-row: span 2;
  background: linear-gradient(160deg, var(--nv-bg-card) 0%, var(--nv-bg-muted) 100%);
}
.nv-post-tag {
  align-self: flex-start;
  font-family: var(--nv-sans);
  font-size: 12px;
  font-weight: 600;
  color: var(--nv-accent);
  background: var(--nv-accent-soft);
  padding: 4px 10px;
  border-radius: 999px;
  margin-bottom: 18px;
  letter-spacing: -0.005em;
}
.nv-post-title {
  font-family: var(--nv-sans);
  font-size: 20px;
  line-height: 1.25;
  font-weight: 600;
  letter-spacing: -0.022em;
  margin: 0 0 10px;
  color: var(--nv-ink);
  border-top: none;
  padding-top: 0;
}
.nv-post.feat .nv-post-title {
  font-size: 32px;
  line-height: 1.15;
  letter-spacing: -0.03em;
}
.nv-post-excerpt {
  font-family: var(--nv-sans);
  font-size: 14px;
  color: var(--nv-ink-2);
  line-height: 1.5;
  margin: 0;
  letter-spacing: -0.005em;
}
.nv-post-foot {
  margin-top: auto;
  padding-top: 20px;
  display: flex;
  justify-content: space-between;
  font-family: var(--nv-sans);
  font-size: 12px;
  color: var(--nv-ink-3);
}
.nv-blog-cta {
  margin-top: 40px;
  display: flex;
  justify-content: center;
}

/* ====== ENDCAP ====== */
.nv-endcap {
  background: linear-gradient(180deg, #060607 0%, #1a1a1f 100%);
  color: #f5f5f7;
  padding: 120px 0;
  position: relative;
  overflow: hidden;
}
.nv-endcap::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 600px 400px at 20% 0%, rgba(0, 113, 227, 0.18) 0%, transparent 60%),
    radial-gradient(ellipse 600px 400px at 80% 100%, rgba(180, 71, 217, 0.18) 0%, transparent 60%);
  pointer-events: none;
}
.nv-endcap-inner {
  position: relative;
}
.nv-endcap-eyebrow {
  color: #7da9ff;
}
.nv-endcap-title {
  font-family: var(--nv-sans);
  font-weight: 700;
  font-size: clamp(48px, 7vw, 88px);
  line-height: 1.05;
  letter-spacing: -0.035em;
  margin: 0 auto 18px;
  text-align: center;
  max-width: 16ch;
  background: linear-gradient(180deg, #ffffff 0%, #c8c8cd 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  border-top: none;
  padding-top: 0;
}
.nv-endcap-sub {
  font-family: var(--nv-sans);
  font-size: 21px;
  color: #a1a1a6;
  margin: 0 auto 40px;
  text-align: center;
  max-width: 48ch;
  line-height: 1.4;
  letter-spacing: -0.012em;
}
.nv-download-row {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
.nv-endcap .nv-btn--primary {
  background: #fff;
  color: #060607;
}
.nv-endcap .nv-btn--primary:hover {
  background: #f5f5f7;
  color: #060607;
}
.nv-endcap .nv-btn--secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #f5f5f7;
  border: 1px solid rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(20px);
}
.nv-endcap .nv-btn--secondary:hover {
  background: rgba(255, 255, 255, 0.12);
}

@media (max-width: 960px) {
  .nv-pillars {
    grid-template-columns: 1fr 1fr;
  }
  .nv-perf-hero,
  .nv-manifesto-grid,
  .nv-hero-meta {
    grid-template-columns: 1fr 1fr;
  }
  .nv-blog-grid {
    grid-template-columns: 1fr 1fr;
  }
  .nv-post.feat {
    grid-row: auto;
    grid-column: span 2;
  }
  .nv-definition-card {
    position: static;
  }
}

@media (max-width: 640px) {
  .nv-pillars,
  .nv-perf-hero,
  .nv-manifesto-grid,
  .nv-hero-meta,
  .nv-blog-grid {
    grid-template-columns: 1fr;
  }
  .nv-post.feat {
    grid-column: auto;
  }
  .nv-block {
    padding: 80px 0;
  }
  .nv-perf-card {
    padding: 32px;
  }
  .nv-manifesto-grid {
    gap: 32px;
  }
}
</style>
