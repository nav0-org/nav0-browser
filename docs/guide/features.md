---
title: "Nav0 Browser Features — Privacy, Security & Performance"
description: "Explore Nav0's features: built-in ad blocker, reader mode, PDF viewer, tab pinning, private browsing, and more — with zero telemetry and no bloat."
---

# Features

Nav0 includes only the features essential for a clean browsing experience. Nothing more.

## Core Features

### Tab Management

Full-featured tab handling. [Read the full Tab Management guide →](/guide/tab-management)

- Open unlimited tabs
- Tab preview on hover
- Drag to reorder
- Close with middle-click
- Restore recently closed tabs (including full window restoration)
- Tab context menu — right-click for Reload, Close, Duplicate, Mute/Unmute, and Close Other Tabs
- Tab pinning — keep tabs compact and persistent
- Move tabs between windows, or into a new window
- Drag and drop tabs between windows from the Cmd+O tab switcher
- Scrollable tab strip — tabs scroll horizontally with a minimum readable width
- Loading spinner in the favicon area while pages load
- New tabs open in the background without stealing focus
- Tab hibernation — tabs inactive for 72+ hours are automatically suspended to save memory

### Cmd+O Tab Switcher

Quick overlay to search and switch between open tabs:

- Filtered by private/non-private context
- Drag and drop tabs across windows

### Command-K Search

Unified search across the browser:

- Search bookmarks, history, downloads, and the web from one place
- Open tab search with switch-to-tab action
- Keyboard navigation with Escape and Tab support

### Bookmarks

Local bookmark storage:

- Add bookmarks with one click
- Organize with folders
- Import/export standard formats (HTML)
- No cloud sync—your bookmarks stay on your device

### History

Browse your history privately:

- Local storage only
- Easy clearing (by time range or all)
- Search within history
- No history sent anywhere

### Downloads

Full download management:

- Choose download location
- Pause, resume, and cancel downloads
- Cross-session download resume — paused downloads survive browser restarts
- Download progress bar with click-to-open
- Downloads icon with circular progress indicator in the navbar
- File size display on the Downloads page
- Clear download history
- No scanning uploads to external servers

## Browsing & Reading

### Find in Page

Search any page with Ctrl+F / Cmd+F:

- Case-sensitive, regex, and whole word matching
- Navigate between matches with match counter

### Reader Mode

Distraction-free reading powered by Readability.js — strip away clutter and focus on the content.

### PDF Reader

Open PDFs inline in browser tabs. Also available via File > Open PDF (Ctrl+Shift+O).

### Print Page

Print from the File menu, Options menu, or right-click context menu.

### Hard Reload

Cmd+Shift+R clears the site's cache and performs a fresh reload.

### Browser Notifications

Desktop notifications with per-site permission control — no external notification services involved.

### External Protocol Links

Handles mailto:, tel:, and other external protocol links (Slack, Zoom, Discord, etc.) by opening them in the appropriate app.

### Web Share API

Native share support for web pages that use navigator.share.

## Privacy Features

### Ad Blocker

Built-in ad blocking. [Read the full Ad Blocker guide →](/guide/ad-blocker)

- Domain blocking and URL pattern matching
- Cosmetic filtering
- Video ad blocking with IMA SDK mock and early script injection
- Four built-in filter lists: EasyList, EasyPrivacy, Peter Lowe's Ad Server List, and Fanboy's Annoyances
- Per-site whitelist — disable ad blocking for specific sites
- Streaming site compatibility — smart exceptions for YouTube, Netflix, Spotify, and other streaming services

### Tracking Protection

Built-in protection against common trackers. [Read the full Privacy & Tracking Protection guide →](/guide/privacy-protection)

- Block third-party cookies by default
- Three cookie modes: block third-party (default), block with per-domain exceptions, or allow all
- Clear cookies on close option
- Fingerprinting protection
- Referrer trimming
- No tracking of your tracking protection usage

### Popup Blocking

Per-site popup controls:

- Smart-allow policy with a 60-second window
- Popup flood protection — prevents sites from opening too many popups at once

### Private Browsing

Enhanced private mode. [Read the full Private Browsing guide →](/guide/private-browsing)

- No history saved
- Cookies cleared on close
- No cached data persists
- Truly private—we can't see it either

### HTTPS Enforcement

Automatic security:

- HTTP URLs are automatically upgraded to HTTPS
- Clear warnings for insecure sites
- No phoning home to check URLs

### Customizable User Agent

Mask your browser identity. [See all presets →](/guide/privacy-protection#user-agent-spoofing)

- Eight presets: Chrome, Safari, Firefox, and Edge across platforms — Firefox is the default
- Custom user agent string option
- Changes apply to all open tabs immediately

## Security Features

### SSL Certificate Indicator

Click the lock icon in the address bar to view certificate details:

- Clean overlay panel with certificate information
- Icon reflects whether the connection is secure, insecure, or has no certificate info
- Overlay closes on click-outside or Escape

### SSL/Security Warning Page

Interstitial warning for unsafe connections with a 24-hour bypass expiry.

### Custom Error & Offline Pages

- Friendly error page when navigation fails
- Dedicated offline page when there is no internet connection

### Safe Browsing

Protection without surveillance:

- Local blocklists for known malicious sites
- Warning pages for suspicious downloads
- No URL checking against remote servers
- Updates via standard release channels

### Sandboxing

Chromium's security model:

- Process isolation per tab
- Restricted file system access
- Memory protection

### Regular Updates

Stay secure:

- Security patches from upstream Chromium
- Transparent changelog
- No forced updates—you control when

## Browser Settings & Permissions

### Settings & Preferences Engine

Full settings UI with enforcement — configure the browser to work the way you want.

### Site Permission Handling

Granular permission system with custom in-browser UI for camera, microphone, location, and more:

- Flood protection — blocks rapid permission spam from sites
- Blocks sensitive permissions on insecure (HTTP) connections
- Private browsing indicators on permission prompts

### Geolocation

IP-based geolocation fallback for Linux — no Google location services required.

## Network & Proxy

### Proxy Configuration

Full proxy support. [See details →](/guide/privacy-protection#proxy-configuration)

- Direct connection, system proxy, or manual configuration
- HTTP, HTTPS, SOCKS4, and SOCKS5 proxy protocols
- PAC (Proxy Auto-Config) URL support
- Configurable bypass rules for local addresses

### Data Retention & Auto-Delete

Control how long your data is kept. [See details →](/guide/privacy-protection#data-retention-auto-delete)

- Configurable retention periods for history, downloads, cookies, cache, and autofill
- Auto-delete scheduler runs in the background
- Clear-on-close options for history, cookies, and cache
- Manual clear by time range: last hour, 24 hours, 7 days, 30 days, or all time

## In-App Issue Reporting

Submit bug reports directly from the browser with image attachments. Screenshots are resized and compressed client-side before upload.

## What's Intentionally Missing

We deliberately exclude:

| Feature | Why It's Missing |
|---------|------------------|
| AI Assistant | Unnecessary complexity, often cloud-dependent |
| News Feed | Distraction, usually ad-driven |
| Sync Service | Requires accounts, cloud storage |
| Rewards/Crypto | Not a browser's job |
| Built-in VPN | Usually upsells, trust issues |
| Reading List | Use bookmarks |
| Collections | Use bookmark folders |

## Customization

### Settings You Control

- Default search engine (6 built-in: Google, DuckDuckGo, Bing, Brave Search, Startpage, Ecosia — or add your own)
- [Keyboard shortcuts](/guide/keyboard-shortcuts) (22 remappable shortcuts)
- Proxy configuration
- Data retention periods and auto-delete schedules
- Cookie policy
- User agent string
- Download location
- Start page

### Settings We Don't Include

- Telemetry opt-out (there's nothing to opt out of)
- Data sharing preferences (we don't share data)
- Personalization options (nothing is personalized)

## Performance

### Tab Hibernation

Tabs inactive for 72+ hours are automatically suspended, freeing memory while preserving your session. Tabs reload on demand when you return to them.

### Lightweight by Design

- No pre-loading of suggested content
- No idle network requests or background sync
- No account checks or news feeds on startup
- Fast cold start — just the browser, ready to go

## Developer Features

For web developers:

- Full Chrome DevTools
- Console, Network, Elements panels
- Local storage inspection
- No additional "developer clouds" or services
