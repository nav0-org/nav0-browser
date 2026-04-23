---
title: "What Nav0 Doesn't Do — Un-features & Roadmap"
description: 'Transparent list of features Nav0 intentionally omits, would like to build, or is considering — so you know exactly what you are getting.'
---

# What Nav0 Doesn't Do

Nav0 is an honest browser. Part of being honest is being transparent about what we **don't** have. This page tracks features that mainstream browsers (Chrome, Firefox, Safari, Edge, Brave) offer but Nav0 currently does not.

Some are things we'd like to build. Others are things we'll **never** build because they conflict with our philosophy. Both are listed here so users know exactly what they're getting.

## Will Not Implement

These features conflict with Nav0's core principles (privacy-first, minimal, local-only, no telemetry). They're listed here so there's no ambiguity.

| Feature                                          | Why Not                                                          |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| Cloud sync (bookmarks, history, tabs, passwords) | Requires accounts and remote servers. All data stays local.      |
| User accounts / sign-in                          | No accounts, no identity layer, no tracking.                     |
| AI assistant / AI-powered features               | Nav0 is a browser, not an AI product.                            |
| News feed / content recommendations              | Drives engagement, not browsing.                                 |
| Cryptocurrency wallet                            | Out of scope. Use a dedicated wallet.                            |
| Built-in VPN upsell                              | Monetization feature, not a browsing feature.                    |
| Telemetry / analytics                            | Zero data collection means zero data collection.                 |
| Sponsored content / tiles                        | No monetization through user attention.                          |
| Shopping / price comparison tools                | Bloat. Use a dedicated extension or site.                        |
| Social media integrations                        | Not a social platform.                                           |

## Would Like to Build

Features we'd genuinely like to add. Contributions welcome. Ordered roughly by impact.

### Bookmarks

- **Bookmark folders / organization** — Currently a flat list. Need hierarchical folders.
- **Bookmark bar** — Optional toolbar showing bookmarks below the URL bar.
- **Import / export bookmarks** — HTML import/export for migrating from other browsers.
- **Bookmark drag-and-drop reordering** — Reorder bookmarks in the manager.

### Tabs

- **Tab muting** — Click speaker icon to mute a tab. Audio state events are already tracked, UI is missing.
- **Tab grouping** — Group tabs by color/label, collapse groups.
- **Tab preview on hover** — Thumbnail preview when hovering over a tab.
- **Vertical tabs** — Optional vertical tab sidebar layout.
- **Tab search** — Dedicated tab search (partially covered by Command K).

### Session & Startup

- **Restore previous session on startup** — Option to reopen tabs from the last session.
- **Session save / restore** — Save named sessions for later.
- **Startup page options** — Choose between new tab, specific URL, or previous session.

### Profiles

- **Multiple profiles** — Separate browsing contexts (work, personal) with independent data.

### Passwords & Autofill

- **Built-in password manager** — Store and autofill credentials locally (encrypted).
- **Form autofill** — Addresses, payment methods, stored locally.
- **Password generator** — Suggest strong passwords on signup forms.

### Media

- **Picture-in-picture** — Floating video player that stays on top.
- **Tab audio indicator** — Show which tabs are playing audio (partially implemented).

### Accessibility

- **Screen reader optimization** — Full ARIA labeling and keyboard navigation audit.
- **High contrast / color adjustment themes** — Accessibility display modes.
- **Font size / zoom preferences** — Persistent default zoom level per site.

### Page Tools

- **Screenshot tool** — Capture visible area or full page.
- **Page translation** — Translate pages to other languages (privacy-respecting service).
- **QR code for current page** — Quick sharing to mobile.
- **Reading list / Save for later** — Lightweight alternative to bookmarks for temporary saves.

### Appearance

- **Theme support** — Light / dark / system theme selection.
- **Custom CSS for internal pages** — Let users style Nav0's built-in pages.

### Developer

- **View page source** — Ctrl+U to view raw HTML source.
- **Network request log** — Lightweight alternative to full DevTools Network tab.

### Navigation

- **Swipe / gesture navigation** — Trackpad gestures for back/forward.
- **Full-screen mode** — F11 to hide all browser chrome.

### Extensions

- **Basic extension support** — Load unpacked Chrome extensions. This is a large undertaking but frequently requested.

## Under Consideration

Not sure yet whether these fit Nav0's philosophy. Open to community input.

| Feature                          | Concern                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| Spell checker                    | Chromium has one built-in; question is whether to expose controls for it.                     |
| PWA / web app install            | Useful but adds complexity. Might conflict with "minimal."                                    |
| Sidebar panel                    | Could host bookmarks, history, or reading list. Risk of becoming bloat.                       |
| Tab hibernation controls         | Auto-suspend exists (72h), but manual controls could be useful.                               |
| Custom search keyword shortcuts  | e.g., `g query` for Google, `w query` for Wikipedia.                                          |
| RSS feed detection               | Show available feeds for the current page. Aligns with open web values.                       |
| Permissions dashboard            | Centralized view of all granted site permissions.                                             |

## Requesting a Feature

If you'd like to see one of the "Would Like to Build" items, or think something from "Under Consideration" fits Nav0's philosophy, open an issue on [GitHub](https://github.com/nav0-org/nav0-browser/issues) referencing this page. For items that aren't listed here at all, open a PR to add them — or file an issue and we'll discuss.
