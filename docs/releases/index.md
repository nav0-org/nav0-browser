---
layout: page
sidebar: false
aside: false
title: 'Release Notes — Nav0 Browser'
description: "Release notes and changelog for Nav0 Browser. See what's new in every release — features, fixes, and improvements."
---

<script setup>
const releases = [
  {
    version: 'v0.2.6',
    date: '2026-05-06',
    url: '/releases/v0.2.6',
    channel: 'stable',
    summary:
      'Fixed packaging breakage from the Electron 41 upgrade, restored Google sign-in by refreshing Firefox UA cap and Chrome preset, and softened the new-tab gradient background.',
  },
  {
    version: 'v0.2.5',
    date: '2026-05-05',
    url: '/releases/v0.2.5',
    channel: 'stable',
    summary:
      'Time-based greetings and a pastel-gradient new-tab page, fixed WebContents cleanup on window close, a streamlined Command-K, the new compass logo across the app, and an Electron 41 upgrade.',
  },
  {
    version: 'v0.2.4',
    date: '2026-04-23',
    url: '/releases/v0.2.4',
    channel: 'stable',
    summary:
      'Settings page redesign, favicons next to origins in Site Permissions, and a new linting/formatting/pre-commit-hook tooling stack.',
  },
  {
    version: 'v0.2.3',
    date: '2026-04-21',
    url: '/releases/v0.2.3',
    channel: 'stable',
    summary:
      'Blocking alert/confirm/prompt and basic-auth overlays, getDisplayMedia screen sharing with a dedicated picker, localhost and .local-style URL handling, main-process crash hardening, and a graceful installer prompt when Nav0 is already running.',
  },
  {
    version: 'v0.2.2',
    date: '2026-04-17',
    url: '/releases/v0.2.2',
    channel: 'stable',
    summary:
      'Cloudflare Turnstile compatibility, Chrome version pinning to Electron\'s real Chromium, and Google sign-in and Gmail fixes via Firefox UA swap and a minimal window.chrome.runtime stub.',
  },
  {
    version: 'v0.2.1',
    date: '2026-04-14',
    url: '/releases/v0.2.1',
    channel: 'stable',
    summary:
      'Permissions settings page, configurable downloads location, "On startup" options, session restore for non-private windows, expanded website categories, and assorted settings and startup bug fixes.',
  },
  {
    version: 'v0.2.0',
    date: '2026-04-12',
    url: '/releases/v0.2.0',
    channel: 'stable',
    summary:
      'Downloads page redesign with cross-session resume, history page with time tracking and analytics, bookmarks page with reading queue/reference split, favicon fetching via net.fetch, and Chrome default user agent.',
  },
  {
    version: 'v0.1.2',
    date: '2026-04-04',
    url: '/releases/v0.1.2',
    channel: 'stable',
    summary:
      'Renamed application from nav0-browser to Nav0 across package identity, installers, CI pipeline, download page, performance tests, and documentation.',
  },
  {
    version: 'v0.1.1',
    date: '2026-04-03',
    url: '/releases/v0.1.1',
    channel: 'stable',
    summary:
      'Browser notifications, Firefox user agent default, built-in Developer Tools, streaming site compatibility fixes, external protocol handlers, and hard reload fix.',
  },
  {
    version: 'v0.1.0',
    date: '2026-03-29',
    url: '/releases/v0.1.0',
    channel: 'stable',
    summary:
      'Renderer process consolidation (8→2 views), tab hibernation, per-tab find-in-page state, Web Share API support, merged title bar, and UI polish across the board.',
  },
  {
    version: 'v0.0.9',
    date: '2026-03-19',
    url: '/releases/v0.0.9',
    channel: 'stable',
    summary:
      'SSL certificate indicator overlay, fullscreen exit fixes, drag-and-drop tabs between windows, and installer graceful quit prompt.',
  },
  {
    version: 'v0.0.8',
    date: '2026-03-15',
    url: '/releases/v0.0.8',
    channel: 'stable',
    summary:
      'Tab context menu, pinning, Cmd+O switcher, popup blocking, hard reload, SSL warning page, offline page, in-app issue reporting, customizable user agent, print support, and HTTPS enforcement.',
  },
  {
    version: 'v0.0.7',
    date: '2026-03-07',
    url: '/releases/v0.0.7',
    channel: 'stable',
    summary:
      'Dark mode toggle for any website, recently closed tabs with full window restoration, stability fixes for tab/window lifecycle crashes, and navbar FOUC resolution.',
  },
  {
    version: 'v0.0.6',
    date: '2026-03-03',
    url: '/releases/v0.0.6',
    channel: 'stable',
    summary:
      'Ad blocker, download manager with pause/resume, Find in Page, Reader Mode, PDF Reader, browser settings engine, and site permissions.',
  },
  {
    version: 'v0.0.5-alpha',
    date: '2026-03-01',
    url: '/releases/v0.0.5-alpha',
    channel: 'alpha',
    summary:
      'New Nav0 compass logo and rebrand. Bug fixes for fullscreen, Command+K overlay, and auto-launch after macOS install.',
  },
  {
    version: 'v0.0.4',
    date: '2026-03-01',
    url: '/releases/v0.0.4',
    channel: 'stable',
    summary: 'macOS curl install script, Gatekeeper bypass, and startup crash fix.',
  },
  {
    version: 'v0.0.3-alpha',
    date: '2026-02-25',
    url: '/releases/v0.0.3-alpha',
    channel: 'alpha',
    summary: 'Sync package.json version with release input before building.',
  },
  {
    version: 'v0.0.2-alpha',
    date: '2026-02-25',
    url: '/releases/v0.0.2-alpha',
    channel: 'alpha',
    summary: 'macOS stability fixes and Homebrew Cask distribution.',
  },
  {
    version: 'v0.0.1-alpha',
    date: '2026-02-12',
    url: '/releases/v0.0.1-alpha',
    channel: 'alpha',
    summary:
      'First alpha release — Electron-based browser with Chromium engine, Command-K search, tab management, bookmarks, and download manager.',
  },
];
</script>

<ReleaseList
  :releases="releases"
  eyebrow="releases"
  heading="every version, on the record."
/>
