<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import packageJson from '../../../../package.json';

const version = ref(packageJson.version);
const releasedAt = ref<string | null>(null);
const loading = ref(true);

const macCommand =
  'curl -fsSL https://raw.githubusercontent.com/nav0-org/nav0-browser/main/install.sh | bash';
const buildCommand =
  'git clone https://github.com/nav0-org/nav0-browser.git\ncd nav0-browser\nnpm install\nnpm run make';

const debHref = computed(
  () =>
    `https://github.com/nav0-org/nav0-browser/releases/download/v${version.value}/Nav0_${version.value}_amd64.deb`
);
const rpmHref = computed(
  () =>
    `https://github.com/nav0-org/nav0-browser/releases/download/v${version.value}/Nav0-${version.value}-1.x86_64.rpm`
);
const winHref = computed(
  () =>
    `https://github.com/nav0-org/nav0-browser/releases/download/v${version.value}/Nav0-${version.value}.Setup.exe`
);
const releaseHref = computed(
  () => `https://github.com/nav0-org/nav0-browser/releases/tag/v${version.value}`
);

onMounted(async () => {
  try {
    const res = await fetch('https://api.github.com/repos/nav0-org/nav0-browser/releases/latest');
    if (res.ok) {
      const data = await res.json();
      const tag = data.tag_name || '';
      version.value = tag.startsWith('v') ? tag.slice(1) : tag;
      if (data.published_at) {
        releasedAt.value = new Date(data.published_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    }
  } catch {
    // keep fallback version from package.json
  } finally {
    loading.value = false;
  }
});

const curlCopied = ref(false);
const buildCopied = ref(false);
async function copyText(text: string, target: 'curl' | 'build') {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    if (target === 'curl') {
      curlCopied.value = true;
      setTimeout(() => (curlCopied.value = false), 1800);
    } else {
      buildCopied.value = true;
      setTimeout(() => (buildCopied.value = false), 1800);
    }
  } catch {
    // No telemetry/logging per Nav0 privacy principles
  }
}
</script>

<template>
  <div class="install-page-v2">
    <!-- HERO -->
    <section class="install-hero">
      <div class="install-hero-inner">
        <div class="install-pill" v-if="!loading">
          <span class="install-pill-dot"></span>
          Nav0 v{{ version }}<template v-if="releasedAt"> · Released {{ releasedAt }}</template>
        </div>
        <h1 class="install-h1">Install Nav0 in <em>about a minute.</em></h1>
        <p class="install-lead">
          macOS, Windows, Linux. Free. Open source. No account, no email, no telemetry.
        </p>
      </div>
    </section>

    <div class="install-shell">
      <!-- THREE PLATFORM TILES -->
      <div class="ip-platforms">
        <a href="#mac" class="ip-tile ip-tile--mac">
          <div class="ip-tile-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
              />
            </svg>
          </div>
          <h3 class="ip-tile-name">macOS</h3>
        </a>
        <a href="#win" class="ip-tile ip-tile--win">
          <div class="ip-tile-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M3 5.6L10.5 4.6V11.5H3V5.6M3 12.5H10.5V19.4L3 18.4V12.5M11.4 4.4L21 3V11.5H11.4V4.4M11.4 12.5H21V21L11.4 19.6V12.5Z"
              />
            </svg>
          </div>
          <h3 class="ip-tile-name">Windows</h3>
        </a>
        <a href="#lin" class="ip-tile ip-tile--lin">
          <div class="ip-tile-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M12.5 2C8.5 2 7 6 7.5 8.5c.4 2.1 0 2.7-.7 3.7C5.5 14 4 16 4 18c0 2 1.5 3 3 3 1 0 1.7-.5 2-1 .3.5 1 1 2 1h3c1 0 1.7-.5 2-1 .3.5 1 1 2 1 1.5 0 3-1 3-3 0-2-1.5-4-2.8-5.8-.7-1-1.1-1.6-.7-3.7C17.5 6 16 2 12.5 2zm-1.7 3.6c.5 0 .9.5.9 1.1s-.4 1.1-.9 1.1c-.5 0-.9-.5-.9-1.1s.4-1.1.9-1.1zm3.4 0c.5 0 .9.5.9 1.1s-.4 1.1-.9 1.1c-.5 0-.9-.5-.9-1.1s.4-1.1.9-1.1zm-1.7 3.5c1 0 2 .8 2 1.7 0 .5-.7.9-2 .9s-2-.4-2-.9c0-.9 1-1.7 2-1.7z"
              />
            </svg>
          </div>
          <h3 class="ip-tile-name">Linux</h3>
        </a>
      </div>

      <!-- macOS section -->
      <section id="mac" class="ip-mac-card">
        <div class="ip-mac-head">
          <div class="ip-mac-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
              />
            </svg>
          </div>
          <div>
            <h3>Install on macOS</h3>
            <div class="ip-mac-sub">Run this in Terminal — that's it.</div>
          </div>
        </div>

        <!-- Terminal -->
        <div class="ip-terminal">
          <div class="ip-terminal-bar">
            <div class="ip-lights">
              <span class="ip-light ip-light-r"></span>
              <span class="ip-light ip-light-y"></span>
              <span class="ip-light ip-light-g"></span>
            </div>
            <div class="ip-terminal-title">~ — bash</div>
            <button
              class="ip-copy-btn"
              :class="{ 'is-copied': curlCopied }"
              type="button"
              @click="copyText(macCommand, 'curl')"
            >
              <svg
                v-if="!curlCopied"
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              {{ curlCopied ? 'Copied' : 'Copy' }}
            </button>
          </div>
          <div class="ip-terminal-body">
            <div>
              <span class="ip-prompt">$ </span><span class="ip-cmd"
                >curl <span class="ip-flag">-fsSL</span>
                <span class="ip-url"
                  >https://raw.githubusercontent.com/nav0-org/nav0-browser/main/install.sh</span
                >
                <span class="ip-pipe">|</span> bash</span
              >
            </div>
            <span class="ip-out"
              >→ Fetching latest release (v{{ version }})…&nbsp;&nbsp;<span class="ip-ok">✓</span></span
            >
            <span class="ip-out"
              >→ Installing to /Applications/Nav0.app …&nbsp;&nbsp;<span class="ip-ok">✓</span></span
            >
            <span class="ip-out"
              >→ Clearing Gatekeeper quarantine attribute …&nbsp;&nbsp;<span class="ip-ok"
                >✓</span
              ></span
            >
            <span class="ip-out"
              >→ Done. Launch with: <span style="color: #f5f5f7">open -a Nav0</span></span
            >
          </div>
        </div>

        <div class="ip-desc-row">
          <div class="ip-desc-item">
            <div class="ip-desc-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </div>
            <div>
              <div class="ip-desc-title">Latest release</div>
              <div class="ip-desc-text">
                Always pulls v{{ version }} from GitHub. No third-party CDN.
              </div>
            </div>
          </div>
          <div class="ip-desc-item">
            <div class="ip-desc-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M6 14l-1.5 1.5A2.121 2.121 0 0 0 6 19h12a2.121 2.121 0 0 0 1.5-3.5L18 14M3 8l9-6 9 6v6H3V8z"
                ></path>
              </svg>
            </div>
            <div>
              <div class="ip-desc-title">Installs to /Applications</div>
              <div class="ip-desc-text">
                Standard Mac app location. Drag to Trash to uninstall.
              </div>
            </div>
          </div>
          <div class="ip-desc-item">
            <div class="ip-desc-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <polyline points="9 12 11 14 15 10"></polyline>
              </svg>
            </div>
            <div>
              <div class="ip-desc-title">Handles Gatekeeper</div>
              <div class="ip-desc-text">
                Auto-clears the quarantine attribute. No right-click → Open dance.
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Windows -->
      <section id="win" class="ip-section">
        <h2 class="ip-section-h2">Windows</h2>
        <p class="ip-section-lead">
          A single x64 installer for Windows 10 and 11. No telemetry, no first-run sign-up, no
          Bing.
        </p>
        <a class="ip-dl-card" :href="winHref">
          <div class="ip-dl-icon">
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
          <div>
            <h4>Nav0-{{ version }}.Setup.exe</h4>
            <p>x64 · Win 10 / 11 · MSI installer</p>
          </div>
        </a>
      </section>

      <!-- Linux -->
      <section id="lin" class="ip-section">
        <h2 class="ip-section-h2">Linux</h2>
        <p class="ip-section-lead">
          Native packages for Debian-family and RHEL-family distros.
        </p>
        <div class="ip-dl-row">
          <a class="ip-dl-card" :href="debHref">
            <div class="ip-dl-icon">
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </div>
            <div>
              <h4>Nav0_{{ version }}_amd64.deb</h4>
              <p>Debian, Ubuntu, Mint, Pop!_OS · <code>sudo dpkg -i Nav0_{{ version }}_amd64.deb</code></p>
            </div>
          </a>
          <a class="ip-dl-card" :href="rpmHref">
            <div class="ip-dl-icon">
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </div>
            <div>
              <h4>Nav0-{{ version }}-1.x86_64.rpm</h4>
              <p>Fedora, RHEL, openSUSE · <code>sudo rpm -i Nav0-{{ version }}-1.x86_64.rpm</code></p>
            </div>
          </a>
        </div>
      </section>

      <!-- Build from source -->
      <section id="source" class="ip-section">
        <h2 class="ip-section-h2">Build from source</h2>
        <p class="ip-section-lead">
          For maximum trust, or if you'd like to hack on Nav0. Clone, install, run. All three
          platforms are supported.
        </p>
        <div class="ip-source-build">
          <div class="ip-source-grid">
            <div>
              <h3>Why build it yourself?</h3>
              <p>
                You don't have to take our word for it. Reproducing the binaries from source is the
                strongest privacy guarantee we can offer.
              </p>
              <ul class="ip-req-list">
                <li>
                  <span class="ip-req-ico">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <code>node</code> 22.0 or newer
                </li>
                <li>
                  <span class="ip-req-ico">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <code>npm</code> 10+
                </li>
                <li>
                  <span class="ip-req-ico">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  ~3 GB free disk
                </li>
                <li>
                  <span class="ip-req-ico">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  Roughly 4 minutes on an M1
                </li>
              </ul>
            </div>
            <div>
              <div class="ip-terminal">
                <div class="ip-terminal-bar">
                  <div class="ip-lights">
                    <span class="ip-light ip-light-r"></span>
                    <span class="ip-light ip-light-y"></span>
                    <span class="ip-light ip-light-g"></span>
                  </div>
                  <div class="ip-terminal-title">~/projects — bash</div>
                  <button
                    class="ip-copy-btn"
                    :class="{ 'is-copied': buildCopied }"
                    type="button"
                    @click="copyText(buildCommand, 'build')"
                  >
                    <svg
                      v-if="!buildCopied"
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path
                        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                      ></path>
                    </svg>
                    <svg
                      v-else
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    {{ buildCopied ? 'Copied' : 'Copy' }}
                  </button>
                </div>
                <div class="ip-terminal-body">
                  <div>
                    <span class="ip-prompt">$ </span><span class="ip-cmd"
                      >git clone
                      <span class="ip-url"
                        >https://github.com/nav0-org/nav0-browser.git</span
                      ></span
                    >
                  </div>
                  <div><span class="ip-prompt">$ </span><span class="ip-cmd">cd nav0-browser</span></div>
                  <div><span class="ip-prompt">$ </span><span class="ip-cmd">npm install</span></div>
                  <div><span class="ip-prompt">$ </span><span class="ip-cmd">npm run make</span></div>
                  <span class="ip-out"
                    >→ Built artifact at
                    <span style="color: #f5f5f7">out/Nav0-darwin-arm64/Nav0.app</span></span
                  >
                </div>
              </div>
              <p class="ip-source-foot">
                The built app lands in the <code>out/</code> directory. See the
                <a :href="releaseHref">release notes</a> for cross-compilation flags.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- License strip -->
      <section class="ip-license">
        <div class="ip-license-lhs">
          <h3>Open source under the MIT License</h3>
          <p>
            Nav0 is built in the open by Ketan Patil and a handful of contributors. Read, fork, or
            send a patch.
          </p>
        </div>
        <div class="ip-license-rhs">
          <a class="ip-btn" href="https://github.com/nav0-org/nav0-browser">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-1.93c-3.2.7-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.17a10.93 10.93 0 0 1 5.74 0c2.19-1.48 3.15-1.17 3.15-1.17.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.37-5.25 5.65.41.36.78 1.06.78 2.13v3.16c0 .31.21.66.79.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"
              />
            </svg>
            View source
          </a>
          <a class="ip-btn" href="https://opensource.org/licenses/MIT">
            <svg
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
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            MIT License
          </a>
        </div>
      </section>
    </div>
  </div>
</template>
