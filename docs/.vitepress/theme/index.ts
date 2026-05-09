import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import Layout from './Layout.vue';
import FeatureCapsules from './components/FeatureCapsules.vue';
import BlogList from './components/BlogList.vue';
import HomeContent from './components/HomeContent.vue';
import DownloadsPage from './components/DownloadsPage.vue';
import NewHome from './components/NewHome.vue';
import './custom.css';

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('FeatureCapsules', FeatureCapsules);
    app.component('BlogList', BlogList);
    app.component('HomeContent', HomeContent);
    app.component('DownloadsPage', DownloadsPage);
    app.component('NewHome', NewHome);
  },
} satisfies Theme;
