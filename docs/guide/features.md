---
title: "Nav0 Browser Features — Privacy, Security & Performance"
description: "Explore Nav0's features: ad blocking, tracker blocking, fingerprint protection, HTTPS upgrades, dark mode, tab management, reader mode, PDF reader, local bookmarks, sandboxing, and more. Only essential browsing features, nothing more."
---

# Features

Nav0 includes only the features essential for a clean browsing experience. Nothing more.

## Core Features

### Tab Management

Full-featured tab handling:

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

Search any page with Ctrl+F / Cmd+F.

### Reader Mode

Distraction-free reading powered by Readability.js — strip away clutter and focus on the content.

### PDF Reader

Open PDFs inline in browser tabs. Also available via File > Open PDF (Ctrl+Shift+O).

### Dark Mode

Apply dark CSS to any website:

- Dark mode toggle in the browser navbar
- Improved coverage for sites like LinkedIn and Reddit
- Persists across back/forward navigation

### Print Page

Print from the File menu, Options menu, or right-click context menu.

### Hard Reload

Cmd+Shift+R clears the site's cache and performs a fresh reload.

## Privacy Features

### Ad Blocker

Built-in ad blocking:

- Domain blocking and URL pattern matching
- Cosmetic filtering
- Video ad blocking with IMA SDK mock and early script injection

### Tracking Protection

Built-in protection against common trackers:

- Block third-party cookies by default
- Fingerprinting protection
- Referrer trimming
- No tracking of your tracking protection usage

### Popup Blocking

Per-site popup controls:

- Smart-allow policy with a 60-second window
- Popup flood protection — prevents sites from opening too many popups at once

### Private Browsing

Enhanced private mode:

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

Choose from presets or enter a custom user agent string. Changes apply to all open tabs immediately.

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

Granular permission system with custom in-browser UI for camera, microphone, location, and more.

### Geolocation

IP-based geolocation fallback for Linux — no Google location services required.

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

- Default search engine
- Start page
- Download location
- Cookie policy
- JavaScript enable/disable per site
- User agent string
- Dark mode per site

### Settings We Don't Include

- Telemetry opt-out (there's nothing to opt out of)
- Data sharing preferences (we don't share data)
- Personalization options (nothing is personalized)

## Performance

### Resource Usage

Nav0 is designed to be light:

- Minimal background processes
- No pre-loading of "suggested" content
- No idle network requests
- Efficient memory management

### Startup Time

Fast launch:

- No account check on startup
- No sync on startup
- No news/feed loading
- Just the browser, ready to go

## Developer Features

For web developers:

- Full Chrome DevTools
- Console, Network, Elements panels
- Local storage inspection
- No additional "developer clouds" or services
