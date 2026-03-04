---
title: "Release Notes — nav0 Browser"
description: "Release notes and changelog for nav0 Browser. See what's new in every release — features, fixes, and improvements."
---

# Release Notes

What's new in every release of nav0 Browser.

---

<div class="release-note" id="v0.0.6">
  <div class="release-header-row">
    <h2>v0.0.6</h2>
    <span class="release-badge latest">Latest</span>
  </div>
  <div class="release-date-meta">March 3, 2026</div>

  <h3>Ad Blocker</h3>
  <ul>
    <li>Comprehensive ad blocker with domain blocking, URL pattern matching, and cosmetic filtering</li>
    <li>Video ad blocking with IMA SDK mock, play() hook, and early script injection</li>
    <li>Content-aware video detection and broader CSS selectors</li>
  </ul>

  <h3>Downloads</h3>
  <ul>
    <li>Pause, resume, and cancel downloads</li>
    <li>Cross-session download resume — paused downloads survive browser restarts</li>
    <li>Download progress bar with click-to-open</li>
    <li>Downloads icon with circular progress indicator in the navbar</li>
  </ul>

  <h3>New Features</h3>
  <ul>
    <li><strong>Find in Page</strong> — search any page with Ctrl+F / Cmd+F</li>
    <li><strong>Reader Mode</strong> — distraction-free reading powered by Readability.js</li>
    <li><strong>PDF Reader</strong> — open PDFs inline in tabs, plus File &gt; Open PDF (Ctrl+Shift+O)</li>
    <li><strong>Browser Settings &amp; Preferences Engine</strong> — full settings UI with enforcement</li>
    <li><strong>Site Permission Handling</strong> — granular permission system with custom in-browser UI</li>
    <li><strong>Geolocation</strong> — IP-based geolocation fallback for Linux, injected via preload</li>
  </ul>

  <h3>Improvements</h3>
  <ul>
    <li>Updated all icons and logos to new nav0 compass design</li>
    <li>Blog entries are now dynamic on homepage and sidebar</li>
    <li>Fixed styling flash (FOUC) on internal pages</li>
    <li>Disabled Chromium mDNS features that trigger macOS local network dialog</li>
    <li>Fixed Command+K overlay focus, escape key, and icon spacing</li>
  </ul>
</div>

<div class="release-note" id="v0.0.5-alpha">
  <div class="release-header-row">
    <h2>v0.0.5-alpha</h2>
    <span class="release-badge alpha">Alpha</span>
  </div>
  <div class="release-date-meta">March 1, 2026</div>

  <h3>Redesign</h3>
  <ul>
    <li>New nav0 compass logo and rebrand from green to Vercel Black theme</li>
    <li>White background with rounded corners on logo SVGs and icons</li>
    <li>New dark/light mode hero images for the website</li>
    <li>Restyled "A complete package" section to match node-llama-cpp design</li>
  </ul>

  <h3>Bug Fixes</h3>
  <ul>
    <li>Fixed Escape key exiting fullscreen across the browser app</li>
    <li>Fixed hero image aspect ratio appearing flattened</li>
    <li>Fixed dark mode blank page by removing unused HeroImage component</li>
    <li>Fixed CSS flash of unstyled content (FOUC) when opening Command+K overlay</li>
    <li>Fixed crash when toggling Command+K overlay multiple times</li>
    <li>Fixed dark mode hero gradient invisible on dark background</li>
    <li>Fixed hero image overflowing viewport on desktop</li>
  </ul>

  <h3>Improvements</h3>
  <ul>
    <li>Launch nav0 automatically after macOS install script completes</li>
    <li>Added .nojekyll file to prevent Jekyll processing on GitHub Pages</li>
  </ul>
</div>

<div class="release-note" id="v0.0.4">
  <div class="release-header-row">
    <h2>v0.0.4</h2>
  </div>
  <div class="release-date-meta">March 1, 2026</div>

  <h3>New Content</h3>
  <ul>
    <li>New blog post: "The Enshittification of Chrome"</li>
  </ul>

  <h3>macOS Installation</h3>
  <ul>
    <li>Curl install script as the primary macOS install method</li>
    <li>Install script bypasses Gatekeeper quarantine</li>
    <li>Falls back to ~/Desktop when /Applications is not writable</li>
  </ul>

  <h3>Bug Fixes</h3>
  <ul>
    <li>Fixed VitePress ESM build error by adding type:module to docs</li>
    <li>Fixed a crash on startup</li>
  </ul>
</div>

<div class="release-note" id="v0.0.3-alpha">
  <div class="release-header-row">
    <h2>v0.0.3-alpha</h2>
    <span class="release-badge alpha">Alpha</span>
  </div>
  <div class="release-date-meta">February 25, 2026</div>

  <h3>Build &amp; Release</h3>
  <ul>
    <li>Sync package.json version with release input before building</li>
  </ul>
</div>

<div class="release-note" id="v0.0.2-alpha">
  <div class="release-header-row">
    <h2>v0.0.2-alpha</h2>
    <span class="release-badge alpha">Alpha</span>
  </div>
  <div class="release-date-meta">February 25, 2026</div>

  <h3>Bug Fixes</h3>
  <ul>
    <li>Fixed release tag mismatch causing Homebrew update to fail</li>
  </ul>
</div>

<div class="release-note" id="v0.0.2-alpha-initial">
  <div class="release-header-row">
    <h2>0.0.2-alpha</h2>
    <span class="release-badge alpha">Alpha</span>
  </div>
  <div class="release-date-meta">February 24, 2026</div>

  <h3>macOS Stability</h3>
  <ul>
    <li>Fixed macOS crash caused by invalid code signature after Electron fuse flipping</li>
    <li>Removed macOS code signing and notarization from build process</li>
    <li>Switched macOS distribution to Homebrew Cask</li>
  </ul>

  <h3>Downloads &amp; Distribution</h3>
  <ul>
    <li>Downloads page with live GitHub Releases integration</li>
    <li>Direct download links for Windows and Linux on install page</li>
    <li>Hardened build pipeline: fixed injection, upgraded action, dropped nupkg</li>
    <li>Fixed artifact deletion by adding actions:write permission</li>
  </ul>

  <h3>New Content</h3>
  <ul>
    <li>Blog post: "Why Your Browser Wants You to Sign In"</li>
    <li>Blog post: "Browser Extensions Won't Save Your Privacy"</li>
  </ul>
</div>

<div class="release-note" id="v0.0.1-alpha">
  <div class="release-header-row">
    <h2>0.0.1-alpha</h2>
    <span class="release-badge alpha">Alpha</span>
  </div>
  <div class="release-date-meta">February 12, 2026</div>

  <p class="release-intro">The first alpha release of nav0 Browser — a minimal, privacy-focused web browser built on Electron.</p>

  <h3>Core Browser</h3>
  <ul>
    <li>Electron-based browser with Chromium engine</li>
    <li>All AI features removed — clean, minimal browsing experience</li>
    <li>Tab management, local bookmarks, and download manager</li>
    <li>History capture with debounce and duplicate prevention</li>
    <li>Process sandboxing for security</li>
  </ul>

  <h3>Command-K Search</h3>
  <ul>
    <li>Unified search across bookmarks, history, downloads, and the web</li>
    <li>Open tab search with switch-to-tab action</li>
    <li>Keyboard navigation with Escape and Tab support</li>
  </ul>

  <h3>Pagination</h3>
  <ul>
    <li>Infinite scroll pagination and compact layout for history, downloads, and bookmarks</li>
  </ul>

  <h3>Build &amp; Platform</h3>
  <ul>
    <li>Electron build for Windows, macOS, and Linux</li>
    <li>Fixed macOS x64 cross-compile for DMG native modules</li>
    <li>Fixed Windows build with electron-winstaller install script</li>
    <li>GitHub Actions workflow for CI/CD</li>
  </ul>

  <h3>Website</h3>
  <ul>
    <li>VitePress documentation site at nav0.org</li>
    <li>Hero image, blog section, and feature capsules on homepage</li>
    <li>SEO improvements and LLM-friendly metadata</li>
    <li>Seven launch blog posts covering privacy, security, and the open web</li>
  </ul>
</div>
