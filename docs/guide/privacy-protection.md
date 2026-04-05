---
title: "Nav0 Privacy & Tracking Protection — Cookies, Fingerprinting, HTTPS & Data Retention"
description: "Nav0 blocks third-party cookies, prevents fingerprinting, enforces HTTPS, spoofs user agents, and auto-deletes browsing data. Learn how every layer works."
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
            "name": "How does Nav0 protect my privacy while browsing?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Nav0 protects your privacy through multiple layers: third-party cookie blocking (default), fingerprinting protection, referrer trimming, automatic HTTPS upgrades, user agent spoofing (Firefox UA by default), configurable data retention with auto-delete, and a built-in ad and tracker blocker. All processing happens locally — no data leaves your device."
            }
          },
          {
            "@type": "Question",
            "name": "Does Nav0 block third-party cookies?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, by default. Nav0 offers three cookie modes: block all third-party cookies (default), block with per-domain exceptions for sites that need them, or allow all. You can also block all cookies entirely or enable clear-cookies-on-close."
            }
          },
          {
            "@type": "Question",
            "name": "Does Nav0 automatically delete browsing data?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, if enabled. Nav0 has configurable data retention with auto-delete for browsing history (default 30 days), download history (90 days), cookies (30 days), cached files (30 days), and autofill data (never). An auto-delete scheduler runs every 6 hours. You can also clear data on browser close or manually by time range."
            }
          },
          {
            "@type": "Question",
            "name": "What user agent does Nav0 use by default?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Nav0 defaults to a Firefox user agent matching your operating system. This masks the fact that you're using Nav0/Electron and blends in with Firefox traffic. You can switch to Chrome, Safari, Edge, or a custom string at any time — changes apply immediately to all open tabs."
            }
          },
          {
            "@type": "Question",
            "name": "Does Nav0 support HTTPS-only mode?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Nav0 automatically upgrades HTTP URLs to HTTPS wherever possible. For insecure connections, it shows clear warnings. Localhost connections are exempt. Unlike some browsers, Nav0 does not phone home to check URLs against a remote safe browsing service."
            }
          }
        ]
      }
---

# Privacy & Tracking Protection

Nav0 protects your privacy through multiple independent layers. Each one works without relying on the others, and all processing happens locally on your device. Nothing is sent to Nav0 servers — because there are no Nav0 servers.

## Cookie Controls

Cookies are the most common tracking mechanism on the web. Nav0 gives you granular control over how cookies are handled.

### Three Cookie Modes

| Mode | What It Does | Default |
|------|-------------|---------|
| **Block all third-party** | Blocks cookies from domains other than the one you're visiting | Yes |
| **Block with exceptions** | Blocks third-party cookies but allows specific domains you whitelist | No |
| **Allow all** | No cookie restrictions (not recommended) | No |

The default — blocking all third-party cookies — prevents cross-site tracking while keeping first-party site functionality intact.

### Per-Domain Exceptions

Some sites require third-party cookies to function (e.g., SSO login flows, embedded payment processors). In "block with exceptions" mode, you can whitelist specific domains that need third-party cookie access.

### Additional Cookie Options

- **Block all cookies** — Disables cookies entirely (breaks most sites, but maximum privacy)
- **Clear cookies on close** — All cookies are deleted when you close the browser
- **Cookie count tracking** — Monitor how many cookies are stored across all sites

### Third-Party Detection

Nav0 determines whether a cookie is third-party by comparing the cookie's domain against the page's eTLD+1 (effective top-level domain plus one). This correctly handles multi-part TLDs like `.co.uk`, `.com.au`, and `.co.jp` — so `login.example.co.uk` setting a cookie for `example.co.uk` is correctly treated as first-party.

## Fingerprinting Protection

Browser fingerprinting identifies users by collecting unique combinations of browser properties — screen resolution, installed fonts, WebGL renderer, canvas output, and dozens more. Nav0 reduces your fingerprint surface by:

- Defaulting to a common Firefox user agent (blends in with millions of Firefox users)
- Limiting exposed browser properties
- Running web content in sandboxed processes with restricted API access

## Referrer Trimming

When you click a link, your browser normally sends the full URL of the previous page to the new site. This leaks your browsing path. Nav0 trims referrer headers to reduce this information to the minimum needed for sites to function.

## HTTPS Enforcement

Nav0 automatically upgrades HTTP URLs to HTTPS before the connection is made. If a secure connection isn't available, Nav0 shows a clear warning indicating the connection is unencrypted.

- **Automatic upgrade** — HTTP URLs are rewritten to HTTPS transparently
- **Localhost exception** — Local development servers (`localhost`, `127.0.0.1`) are not upgraded
- **No remote checking** — Nav0 does not send URLs to any remote safe browsing service to verify them

## User Agent Spoofing

Your user agent string tells every website what browser and operating system you're using. Nav0 lets you control this.

### Built-In Presets

| Preset | Description |
|--------|-------------|
| **Firefox on Windows** | Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:138.0) Gecko/20100101 Firefox/138.0 |
| **Firefox on macOS** | Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:138.0) Gecko/20100101 Firefox/138.0 |
| **Firefox on Linux** | Mozilla/5.0 (X11; Linux x86_64; rv:138.0) Gecko/20100101 Firefox/138.0 |
| **Chrome on Windows** | Chrome/136.0.0.0 on Windows 10 |
| **Chrome on macOS** | Chrome/136.0.0.0 on macOS |
| **Safari on macOS** | Safari/605.1.15 (Version 18.4) |
| **Edge on Windows** | Edge/136.0.0.0 on Windows 10 |
| **Custom** | Any user agent string you specify |

**Default:** Nav0 automatically selects the Firefox preset matching your operating system. This masks the Electron/Chromium engine and blends your traffic with the large Firefox user base.

Changes apply immediately to all open tabs — no restart required.

## Data Retention & Auto-Delete

Nav0 lets you control how long your data is kept, with automatic cleanup.

### Configurable Retention Periods

| Data Type | Default Retention | Options |
|-----------|------------------|---------|
| **Browsing history** | 30 days | 1 day – never |
| **Download history** | 90 days | 1 day – never |
| **Cookies & site data** | 30 days | 1 day – never |
| **Cached files** | 30 days | 1 day – never |
| **Autofill data** | Never (keep forever) | 1 day – never |

### Auto-Delete Scheduler

When enabled, an auto-delete scheduler runs every 6 hours in the background, cleaning up data older than your configured retention periods. No manual intervention required.

### Clear on Close

For maximum privacy, you can enable automatic clearing when the browser closes:

- **Clear browsing history on close**
- **Clear cookies on close**
- **Clear cache on close**

Each option is independent — enable any combination.

### Manual Clear

Clear browsing data on demand with time range options:

- Last hour
- Last 24 hours
- Last 7 days
- Last 30 days
- All time

You choose which data types to clear — history, cookies, cache, or any combination.

## Popup Blocking

Popups are a common vector for unwanted content, phishing, and tracking. Nav0 blocks them by default with a smart policy.

### Three Popup Policies

| Policy | Behavior |
|--------|----------|
| **Smart** (default) | Allows popups triggered by user interaction within 60 seconds, blocks unsolicited ones |
| **Block all** | Blocks every popup regardless of context |
| **Allow all** | No popup restrictions |

### Flood Protection

Nav0 limits popups to 3 per 60 seconds per site. If a site exceeds this limit, all further popups from that site are blocked for the remainder of the window. This prevents popup storms that try to overwhelm the user.

### Per-Site Control

You can whitelist or blacklist individual domains for popup behavior, overriding the global policy.

## Proxy Configuration

Route your traffic through a proxy for additional privacy or network requirements.

### Supported Proxy Modes

| Mode | Description |
|------|-------------|
| **Direct** (default) | No proxy — connect directly |
| **System** | Use your operating system's proxy settings |
| **Manual** | Configure HTTP, HTTPS, or SOCKS4/5 proxy with host and port |
| **PAC** | Use a Proxy Auto-Config URL for dynamic proxy routing |

### Additional Options

- **Bypass list** — Specify addresses that should bypass the proxy (default: `localhost, 127.0.0.1`)
- **Bypass internal addresses** — Automatically bypass proxy for local/internal addresses

## What We Don't Do

| Practice | Nav0 |
|----------|------|
| Send URLs to a safe browsing service | No |
| Phone home on startup | No |
| Collect anonymized usage data | No |
| Run background sync | No |
| Pre-fetch suggested content | No |
| Track your tracking protection settings | No |

## Frequently Asked Questions

### How is this different from the Privacy page?

The [Privacy page](/guide/privacy) describes our privacy *policy* — what data we collect (nothing) and our commitments. This page describes the privacy *features* — the technical mechanisms that protect you from third-party tracking while you browse.

### Can I verify these privacy claims?

Yes. Nav0 is fully open source under the MIT license. The cookie policy enforcement, ad blocking, user agent spoofing, and data retention logic are all in the source code and can be audited:

```bash
git clone https://github.com/nav0-org/nav0-browser
# Cookie policy: src/main/settings/settings-enforcer.ts
# Ad blocker: src/main/ad-blocker/ad-block-lists.ts
# User agent: src/types/settings-types.ts
```

### Does Nav0 protect against all forms of tracking?

No browser can prevent all tracking. Nav0 blocks the most common vectors — third-party cookies, known trackers, fingerprinting basics, and referrer leaks. However, advanced fingerprinting techniques, server-side tracking, and first-party analytics are harder to block without breaking sites. For maximum anonymity, consider using Nav0 with a VPN and the Tor network.

### Do these features work in private browsing?

Yes. All privacy features are active in private browsing windows. Private browsing adds additional protections: no history is saved, cookies are cleared on window close, and a separate database partition is used. See [Private Browsing](/guide/private-browsing) for details.

---

*See also: [Ad Blocker](/guide/ad-blocker) · [Private Browsing](/guide/private-browsing) · [Features Overview](/guide/features)*
