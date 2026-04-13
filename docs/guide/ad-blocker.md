---
title: "Nav0 Ad Blocker — Built-In Ad & Tracker Blocking"
description: "Nav0's built-in ad blocker blocks ads, trackers, and video ads at the network level with zero configuration. No extensions required. Learn how it works."
head:
  - - meta
    - property: og:type
      content: article
  - - meta
    - property: article:section
      content: Features
  - - script
    - type: application/ld+json
    - |
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Does Nav0 have a built-in ad blocker?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Nav0 includes a built-in ad blocker that is enabled by default. It blocks ads, trackers, and video ads at the network level using four filter lists: EasyList, EasyPrivacy, Peter Lowe's Ad Server List, and Fanboy's Annoyances. No browser extension is required."
            }
          },
          {
            "@type": "Question",
            "name": "How does Nav0 block ads without an extension?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Nav0 intercepts network requests at the browser level before they reach the page. It checks every request against known ad and tracker domains, blocks matching URL patterns, removes ad-related page elements with cosmetic filtering, and injects a mock IMA SDK to suppress video ads. All processing happens locally on your device."
            }
          },
          {
            "@type": "Question",
            "name": "Can I disable the ad blocker for specific websites?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Nav0 supports a per-site whitelist. You can add any domain to the allowed list in Settings > Privacy > Ad Blocker, and the ad blocker will be disabled for that site while remaining active everywhere else."
            }
          },
          {
            "@type": "Question",
            "name": "Does the Nav0 ad blocker work on YouTube and streaming sites?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Nav0 uses smart streaming site detection. On sites like YouTube, Netflix, Spotify, and Twitch, CSS and JavaScript injection are skipped to avoid breaking the player, but network-level domain blocking still applies. This balances ad reduction with site compatibility."
            }
          },
          {
            "@type": "Question",
            "name": "What filter lists does Nav0 use?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Nav0 ships with four filter lists: EasyList (standard ad-blocking rules), EasyPrivacy (tracking protection rules), Peter Lowe's Ad Server List (lightweight domain-level blocking), and Fanboy's Annoyances (cookie notices, social widgets, and popups — disabled by default). You can enable or disable each list individually."
            }
          }
        ]
      }
  - - script
    - type: application/ld+json
    - |
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "How to Configure Nav0's Built-In Ad Blocker",
        "description": "Configure Nav0's ad blocker to manage filter lists and whitelist specific sites. No extension required.",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Open ad blocker settings",
            "text": "Go to Settings, then Privacy, then Ad Blocker to access all ad blocker configuration options."
          },
          {
            "@type": "HowToStep",
            "name": "Toggle filter lists",
            "text": "Enable or disable individual filter lists: EasyList (ads), EasyPrivacy (trackers), Peter Lowe's list (domains), and Fanboy's Annoyances (cookie banners and popups)."
          },
          {
            "@type": "HowToStep",
            "name": "Whitelist specific sites",
            "text": "Add domains to the Allowed Sites list to disable the ad blocker for sites that break or require ad scripts to function."
          }
        ]
      }
---

# Ad Blocker

Nav0 includes a built-in ad blocker that is enabled by default. It blocks ads, trackers, and video ads at the network level — no extension required, no configuration needed, no data sent anywhere.

## How It Works

Nav0's ad blocker operates at four levels, all running locally on your device:

### 1. Network-Level Domain Blocking

Every network request is checked against a curated list of known ad and tracking domains. Requests to these domains are blocked before they reach the page. This covers major ad networks including Google Ads, Facebook/Meta pixels, Amazon Ads, Adobe/Demdex, Criteo, and dozens more.

The domain list is maintained directly in Nav0's source code — fully auditable, no remote fetching of rules at runtime.

### 2. URL Pattern Matching

Beyond domain blocking, Nav0 matches URL patterns commonly associated with ad delivery. This catches ads served from first-party domains that wouldn't be caught by domain blocking alone.

### 3. Cosmetic Filtering

After a page loads, Nav0 removes ad-related HTML elements from the page using CSS selectors. This cleans up visual remnants like empty ad containers, sticky ad banners, and placeholder frames that remain after network blocking.

### 4. Video Ad Blocking

Nav0 injects a mock Google IMA SDK (Interactive Media Ads) early in the page lifecycle. This intercepts the ad loading pipeline that many video players use, preventing pre-roll, mid-roll, and companion video ads from loading.

## Filter Lists

Nav0 ships with four built-in filter lists. Each can be enabled or disabled individually in Settings.

| Filter List | Purpose | Default |
|-------------|---------|---------|
| **EasyList** | Standard ad-blocking rules — the most widely used ad filter list | Enabled |
| **EasyPrivacy** | Tracking protection rules — blocks analytics and tracking scripts | Enabled |
| **Peter Lowe's Ad Server List** | Lightweight domain-level blocking — minimal overhead, broad coverage | Enabled |
| **Fanboy's Annoyances** | Cookie consent banners, social widgets, and newsletter popups | Disabled |

All lists are well-established, community-maintained, and open source.

## Streaming Site Compatibility

Aggressive ad blocking can break video players on streaming sites. Nav0 handles this with smart detection: on sites like YouTube, Netflix, Spotify, Twitch, Hulu, Disney+, Vimeo, Crunchyroll, and Apple TV+, CSS and JavaScript ad-blocking injection is skipped entirely to avoid interfering with the player.

Network-level domain blocking still applies on these sites, so tracker and analytics requests are blocked — but the video player itself is left untouched.

**Full list of streaming sites with smart exceptions:**

YouTube, Spotify, Netflix, Hulu, Disney+, Twitch, Vimeo, Dailymotion, Crunchyroll, Prime Video, Peacock, Apple Music, and Apple TV+.

## Per-Site Whitelist

Some sites break or degrade when ads are blocked — login walls, paywalls, or functionality that depends on ad-adjacent scripts. Nav0 lets you whitelist specific domains:

1. Open **Settings** → **Privacy** → **Ad Blocker**
2. Add the domain to the **Allowed Sites** list
3. The ad blocker is fully disabled for that domain

The whitelist applies immediately to all open tabs on the whitelisted domain.

## Configuration

The ad blocker is managed in **Settings** → **Privacy** → **Ad Blocker**:

- **Enable/Disable** — Turn the ad blocker on or off globally
- **Filter Lists** — Toggle individual filter lists
- **Allowed Sites** — Per-site whitelist

All settings are stored locally. No ad-blocking preferences leave your device.

## What We Don't Do

- **No "acceptable ads" program** — We don't whitelist ads from paying advertisers
- **No remote rule fetching** — Filter lists are bundled with the browser, not downloaded at runtime
- **No ad-block detection bypassing** — We don't engage in arms races with anti-ad-block scripts
- **No analytics on blocked ads** — We don't count or report what was blocked

## Frequently Asked Questions

### Does the ad blocker slow down browsing?

No — it typically speeds it up. By blocking ad network requests before they execute, pages load faster and use less bandwidth. The blocking happens at the network level before any rendering occurs.

### Can I use browser extensions for ad blocking instead?

Nav0 does not currently support browser extensions. The built-in ad blocker is designed to provide strong ad and tracker blocking without the complexity and security risks of extension APIs.

### How often are the filter lists updated?

Filter lists are updated with each Nav0 release. Because blocking happens at both the domain and pattern level, the lists remain effective between updates.

### Does the ad blocker work in private browsing?

Yes. The ad blocker is active in both normal and private browsing windows with the same configuration.

---

*See also: [Privacy & Tracking Protection](/guide/privacy-protection) · [Features Overview](/guide/features) · [Private Browsing](/guide/private-browsing)*
