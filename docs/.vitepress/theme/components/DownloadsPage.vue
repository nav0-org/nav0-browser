<script setup>
import { ref, onMounted } from 'vue'
import packageJson from '../../../../package.json'

const version = ref(packageJson.version)
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('https://api.github.com/repos/nav0-org/nav0-browser/releases/latest')
    if (res.ok) {
      const data = await res.json()
      // tag_name is like "v0.0.9", strip the leading "v"
      const tag = data.tag_name || ''
      version.value = tag.startsWith('v') ? tag.slice(1) : tag
    }
  } catch {
    // keep fallback version from package.json
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="install-page">
    <div class="install-hero">
      <h1>Install nav0</h1>
      <p class="install-subtitle">
        Install nav0 on macOS, Windows, or Linux.
      </p>
      <p class="install-version" v-if="!loading">Latest release: <strong>v{{ version }}</strong></p>
    </div>

    <div class="install-section">
      <h2>macOS</h2>
      <p>Run this command in Terminal to install nav0:</p>
      <div class="code-block">
        <code>curl -fsSL https://raw.githubusercontent.com/nav0-org/nav0-browser/main/install.sh | bash</code>
      </div>
      <p class="install-note">
        Downloads the latest release, installs to /Applications, and handles macOS Gatekeeper automatically.
      </p>
      <!-- Homebrew option temporarily hidden
      <p>Or install with <a href="https://brew.sh" target="_blank" rel="noopener">Homebrew</a>:</p>
      <div class="code-block">
        <code>brew install --cask nav0-org/nav0/nav0-browser</code>
      </div>
      <p class="install-note">
        Requires Homebrew. To update nav0, run <code>brew upgrade --cask nav0-browser</code>.
      </p>
      -->
    </div>

    <div class="install-section">
      <h2>Windows</h2>
      <div class="download-links">
        <a class="download-btn" :href="`https://github.com/nav0-org/nav0-browser/releases/download/v${version}/nav0-browser-${version}%20Setup.exe`">
          <span class="download-label">Windows x64</span>
          <span class="download-format">.exe installer</span>
        </a>
      </div>
    </div>

    <div class="install-section">
      <h2>Linux</h2>
      <div class="download-links">
        <a class="download-btn" :href="`https://github.com/nav0-org/nav0-browser/releases/download/v${version}/nav0-browser_${version}_amd64.deb`">
          <span class="download-label">Debian / Ubuntu</span>
          <span class="download-format">.deb package</span>
        </a>
        <a class="download-btn" :href="`https://github.com/nav0-org/nav0-browser/releases/download/v${version}/nav0-browser-${version}-1.x86_64.rpm`">
          <span class="download-label">Fedora / RHEL</span>
          <span class="download-format">.rpm package</span>
        </a>
      </div>
    </div>

    <div class="install-section">
      <h2>Build from Source</h2>
      <p>nav0 can be built from source on Windows, macOS, and Linux. This is recommended for maximum trust.</p>
      <div class="code-block">
        <code>git clone https://github.com/nav0-org/nav0-browser.git</code>
        <code>cd nav0-browser</code>
        <code>npm install</code>
        <code>npm run make</code>
      </div>
      <p class="install-note">
        Requires <a href="https://nodejs.org" target="_blank" rel="noopener">Node.js</a> 22+ and npm.
        The built app will be in the <code>out/</code> directory.
      </p>
    </div>

    <div class="install-footer">
      <p>
        nav0 is open-source under the
        <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener">MIT License</a>.
        View the source on <a href="https://github.com/nav0-org/nav0-browser" target="_blank" rel="noopener">GitHub</a>.
      </p>
    </div>
  </div>
</template>

<style scoped>
.install-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.install-hero {
  text-align: center;
  margin-bottom: 3rem;
}

.install-hero h1 {
  font-size: 2.2rem;
  margin-bottom: 0.5rem;
}

.install-subtitle {
  font-size: 1.1rem;
  color: var(--vp-c-text-2);
}

.install-version {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  margin-top: 0.5rem;
}

.install-section {
  margin-bottom: 2.5rem;
}

.install-section h2 {
  font-size: 1.4rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 0.5rem;
}

.code-block {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin: 1rem 0;
  overflow-x: auto;
}

.code-block code {
  display: block;
  font-family: var(--vp-font-family-mono);
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--vp-c-text-1);
  background: none;
  padding: 0;
}

.install-note {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.install-note code {
  font-size: 0.85rem;
  background: var(--vp-c-bg-soft);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.download-links {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin: 1rem 0;
}

.download-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 1.5rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  text-decoration: none;
  color: var(--vp-c-text-1);
  transition: border-color 0.25s, background-color 0.25s;
  min-width: 180px;
}

.download-btn:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-mute);
}

.download-label {
  font-weight: 600;
  font-size: 0.95rem;
}

.download-format {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  margin-top: 0.25rem;
}

.install-footer {
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--vp-c-divider);
  text-align: center;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}
</style>
