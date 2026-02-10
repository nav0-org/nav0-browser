import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import HeroImage from './components/HeroImage.vue'
import FeatureCapsules from './components/FeatureCapsules.vue'
import BlogList from './components/BlogList.vue'
import HomeContent from './components/HomeContent.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('HeroImage', HeroImage)
    app.component('FeatureCapsules', FeatureCapsules)
    app.component('BlogList', BlogList)
    app.component('HomeContent', HomeContent)
  }
} satisfies Theme
