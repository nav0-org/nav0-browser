<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'

interface Props {
  /** stagger child elements instead of revealing the wrapper itself */
  stagger?: boolean
  /** how much of the element must be visible before triggering (0–1) */
  threshold?: number
  /** how far below viewport before triggering — negative pulls trigger up */
  rootMargin?: string
  /** delay in ms before adding is-visible class */
  delay?: number
  /** custom tag */
  as?: string
}

const props = withDefaults(defineProps<Props>(), {
  stagger: false,
  threshold: 0.15,
  rootMargin: '0px 0px -10% 0px',
  delay: 0,
  as: 'div'
})

const el = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!el.value) return

  // ssr / no IO support — show immediately
  if (typeof IntersectionObserver === 'undefined') {
    el.value.classList.add('is-visible')
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (props.delay) {
            setTimeout(() => entry.target.classList.add('is-visible'), props.delay)
          } else {
            entry.target.classList.add('is-visible')
          }
          observer?.unobserve(entry.target)
        }
      })
    },
    { threshold: props.threshold, rootMargin: props.rootMargin }
  )

  observer.observe(el.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <component
    :is="as"
    ref="el"
    :class="stagger ? 'nav0-stagger' : 'nav0-reveal'"
  >
    <slot />
  </component>
</template>
