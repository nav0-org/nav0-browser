import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import Layout from './Layout.vue';
import FeatureCapsules from './components/FeatureCapsules.vue';
import BlogList from './components/BlogList.vue';
import BlogListPage from './components/BlogListPage.vue';
import BlogPostHero from './components/BlogPostHero.vue';
import BlogPostMetaRail from './components/BlogPostMetaRail.vue';
import HomeContent from './components/HomeContent.vue';
import DownloadsPage from './components/DownloadsPage.vue';
import NewHome from './components/NewHome.vue';
import ReleasesStats from './components/ReleasesStats.vue';
import ReleasesLatestHero from './components/ReleasesLatestHero.vue';
import './tokens.css';
import './custom.css';

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('FeatureCapsules', FeatureCapsules);
    app.component('BlogList', BlogList);
    app.component('BlogListPage', BlogListPage);
    app.component('BlogPostHero', BlogPostHero);
    app.component('BlogPostMetaRail', BlogPostMetaRail);
    app.component('HomeContent', HomeContent);
    app.component('DownloadsPage', DownloadsPage);
    app.component('NewHome', NewHome);
    app.component('ReleasesStats', ReleasesStats);
    app.component('ReleasesLatestHero', ReleasesLatestHero);
  },
} satisfies Theme;
