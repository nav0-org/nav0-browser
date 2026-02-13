<template>
  <div class="downloads-page">
    <!-- Hero section -->
    <div class="downloads-hero">
      <h1>Downloads</h1>
      <p class="downloads-subtitle">
        Get nav0 for your platform. All builds are pulled directly from
        <a :href="releasesUrl" target="_blank" rel="noopener">GitHub Releases</a> — no manual updates needed.
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="downloads-loading">
      <div class="spinner"></div>
      <p>Fetching latest releases…</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="downloads-error">
      <p>{{ error }}</p>
      <a :href="releasesUrl" target="_blank" rel="noopener" class="btn btn-primary">
        View releases on GitHub →
      </a>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Latest release -->
      <div v-if="latestRelease" class="latest-release-section">
        <div class="section-header">
          <h2>Latest Release</h2>
          <span class="version-badge">{{ latestRelease.tag_name }}</span>
          <span v-if="latestRelease.prerelease" class="prerelease-badge">Pre-release</span>
        </div>
        <p class="release-date">
          Released {{ formatDate(latestRelease.published_at) }}
        </p>

        <div class="platform-cards">
          <!-- macOS -->
          <div class="platform-card" :class="{ highlighted: detectedPlatform === 'mac' }">
            <div class="platform-icon">🍎</div>
            <h3>macOS</h3>
            <div class="platform-downloads">
              <a
                v-for="asset in filterAssets(latestRelease.assets, 'mac')"
                :key="asset.id"
                :href="asset.browser_download_url"
                class="btn btn-download"
              >
                {{ formatAssetLabel(asset.name) }}
                <span class="file-size">{{ formatSize(asset.size) }}</span>
              </a>
              <p v-if="filterAssets(latestRelease.assets, 'mac').length === 0" class="no-assets">
                No macOS builds in this release
              </p>
            </div>
          </div>

          <!-- Windows -->
          <div class="platform-card" :class="{ highlighted: detectedPlatform === 'win' }">
            <div class="platform-icon">🪟</div>
            <h3>Windows</h3>
            <div class="platform-downloads">
              <a
                v-for="asset in filterAssets(latestRelease.assets, 'win')"
                :key="asset.id"
                :href="asset.browser_download_url"
                class="btn btn-download"
              >
                {{ formatAssetLabel(asset.name) }}
                <span class="file-size">{{ formatSize(asset.size) }}</span>
              </a>
              <p v-if="filterAssets(latestRelease.assets, 'win').length === 0" class="no-assets">
                No Windows builds in this release
              </p>
            </div>
          </div>

          <!-- Linux -->
          <div class="platform-card" :class="{ highlighted: detectedPlatform === 'linux' }">
            <div class="platform-icon">🐧</div>
            <h3>Linux</h3>
            <div class="platform-downloads">
              <a
                v-for="asset in filterAssets(latestRelease.assets, 'linux')"
                :key="asset.id"
                :href="asset.browser_download_url"
                class="btn btn-download"
              >
                {{ formatAssetLabel(asset.name) }}
                <span class="file-size">{{ formatSize(asset.size) }}</span>
              </a>
              <p v-if="filterAssets(latestRelease.assets, 'linux').length === 0" class="no-assets">
                No Linux builds in this release
              </p>
            </div>
          </div>
        </div>

        <div class="release-links">
          <a :href="latestRelease.html_url" target="_blank" rel="noopener">
            View full release notes on GitHub →
          </a>
        </div>
      </div>

      <!-- Older releases -->
      <div v-if="olderReleases.length > 0" class="older-releases-section">
        <h2>Previous Releases</h2>
        <p class="section-desc">Browse and download older versions of nav0.</p>

        <div class="releases-table">
          <div class="release-row release-header">
            <span class="col-version">Version</span>
            <span class="col-date">Date</span>
            <span class="col-assets">Downloads</span>
            <span class="col-link"></span>
          </div>
          <div
            v-for="release in displayedOlderReleases"
            :key="release.id"
            class="release-row"
          >
            <span class="col-version">
              {{ release.tag_name }}
              <span v-if="release.prerelease" class="prerelease-badge small">pre</span>
            </span>
            <span class="col-date">{{ formatDate(release.published_at) }}</span>
            <span class="col-assets">
              <span class="asset-badges">
                <span v-if="hasAssetFor(release.assets, 'mac')" class="asset-badge">macOS</span>
                <span v-if="hasAssetFor(release.assets, 'win')" class="asset-badge">Windows</span>
                <span v-if="hasAssetFor(release.assets, 'linux')" class="asset-badge">Linux</span>
              </span>
            </span>
            <span class="col-link">
              <a :href="release.html_url" target="_blank" rel="noopener" class="btn btn-small">
                View
              </a>
            </span>
          </div>
        </div>

        <button
          v-if="olderReleases.length > showCount"
          class="btn btn-secondary load-more"
          @click="showCount += 10"
        >
          Show more releases
        </button>
      </div>

      <!-- No releases -->
      <div v-if="!latestRelease && olderReleases.length === 0" class="no-releases">
        <p>No releases found yet. Check back soon or visit GitHub.</p>
        <a :href="releasesUrl" target="_blank" rel="noopener" class="btn btn-primary">
          View on GitHub →
        </a>
      </div>

      <!-- Footer link -->
      <div class="downloads-footer">
        <p>
          All releases are also available on
          <a :href="releasesUrl" target="_blank" rel="noopener">GitHub Releases</a>.
          nav0 is open-source under the
          <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener">MIT License</a>.
        </p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const REPO = 'nav0-org/nav0-browser'
const API_URL = `https://api.github.com/repos/${REPO}/releases`
const releasesUrl = `https://github.com/${REPO}/releases`

const releases = ref([])
const loading = ref(true)
const error = ref(null)
const showCount = ref(10)

const latestRelease = computed(() => {
  return releases.value.find(r => !r.draft) || null
})

const olderReleases = computed(() => {
  const all = releases.value.filter(r => !r.draft)
  return all.length > 1 ? all.slice(1) : []
})

const displayedOlderReleases = computed(() => {
  return olderReleases.value.slice(0, showCount.value)
})

const detectedPlatform = computed(() => {
  if (typeof navigator === 'undefined') return null
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('mac')) return 'mac'
  if (ua.includes('win')) return 'win'
  if (ua.includes('linux')) return 'linux'
  return null
})

function filterAssets(assets, platform) {
  if (!assets) return []
  return assets.filter(a => {
    const name = a.name.toLowerCase()
    // Ignore source archives
    if (name === 'source code (zip)' || name === 'source code (tar.gz)') return false
    switch (platform) {
      case 'mac':
        return name.endsWith('.dmg') || (name.endsWith('.zip') && (name.includes('darwin') || name.includes('mac')))
      case 'win':
        return name.endsWith('.exe') || (name.endsWith('.zip') && name.includes('win'))
      case 'linux':
        return name.endsWith('.deb') || name.endsWith('.rpm') || name.endsWith('.appimage')
      default:
        return false
    }
  })
}

function hasAssetFor(assets, platform) {
  return filterAssets(assets, platform).length > 0
}

function formatAssetLabel(filename) {
  const name = filename.toLowerCase()
  if (name.endsWith('.dmg')) {
    if (name.includes('arm64') || name.includes('aarch64')) return 'Apple Silicon (.dmg)'
    if (name.includes('x64') || name.includes('x86_64') || name.includes('intel')) return 'Intel (.dmg)'
    return '.dmg'
  }
  if (name.endsWith('.zip') && (name.includes('darwin') || name.includes('mac'))) {
    if (name.includes('arm64') || name.includes('aarch64')) return 'Apple Silicon (.zip)'
    if (name.includes('x64') || name.includes('x86_64') || name.includes('intel')) return 'Intel (.zip)'
    return '.zip'
  }
  if (name.endsWith('.exe')) return 'Windows x64 (.exe)'
  if (name.endsWith('.deb')) return 'Debian / Ubuntu (.deb)'
  if (name.endsWith('.rpm')) return 'Fedora / RHEL (.rpm)'
  if (name.endsWith('.appimage')) return 'AppImage'
  return filename
}

function formatSize(bytes) {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

async function fetchReleases() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(API_URL, {
      headers: { Accept: 'application/vnd.github.v3+json' }
    })
    if (!res.ok) {
      if (res.status === 403) {
        throw new Error('GitHub API rate limit reached. Please try again later or visit GitHub directly.')
      }
      throw new Error(`Failed to fetch releases (HTTP ${res.status}).`)
    }
    releases.value = await res.json()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(fetchReleases)
</script>
