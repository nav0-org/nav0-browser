<template>
  <div class="hero-mockup-wrapper">
    <img src="/hero-light.webp" alt="nav0 browser" class="hero-mockup light-only" />
    <img src="/hero-dark.webp" alt="nav0 browser" class="hero-mockup dark-only" />
  </div>
</template>

<style scoped>
.hero-mockup-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.dark-only {
  display: none;
}

:global(.dark) .dark-only {
  display: block;
}

:global(.dark) .light-only {
  display: none;
}
</style>
