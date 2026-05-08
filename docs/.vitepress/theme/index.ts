import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import Layout from './Layout.vue';

// New nav0 theme styles — order matters: tokens → base → components → animations.
import './styles/vars.css';
import './styles/base.css';
import './styles/components.css';
import './styles/animations.css';

// Page-specific overrides that the new theme tokens don't cover (downloads,
// release-detail badge classes referenced from inside markdown, etc).
import './custom.css';

// New nav0 theme components.
import HomeHero from './components/HomeHero.vue';
import HomeFeatures from './components/HomeFeatures.vue';
import HomeShowcase from './components/HomeShowcase.vue';
import BlogIndex from './components/BlogIndex.vue';
import ReleaseList from './components/ReleaseList.vue';
import GlassCard from './components/GlassCard.vue';
import PillButton from './components/PillButton.vue';
import ScrollReveal from './components/ScrollReveal.vue';

// Existing components still in use elsewhere.
import DownloadsPage from './components/DownloadsPage.vue';

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('HomeHero', HomeHero);
    app.component('HomeFeatures', HomeFeatures);
    app.component('HomeShowcase', HomeShowcase);
    app.component('BlogIndex', BlogIndex);
    app.component('ReleaseList', ReleaseList);
    app.component('GlassCard', GlassCard);
    app.component('PillButton', PillButton);
    app.component('ScrollReveal', ScrollReveal);
    app.component('DownloadsPage', DownloadsPage);
  },
} satisfies Theme;
