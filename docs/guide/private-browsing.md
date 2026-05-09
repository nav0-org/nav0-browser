---
title: 'Nav0 Private Browsing — How Private Mode Works'
description: "Nav0's private browsing mode uses a separate database partition, clears all data on window close, and blocks cross-contamination with normal windows. Learn how it works."
eyebrow: Feature Guide
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
            "name": "How does private browsing work in Nav0?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Nav0's private browsing runs in a completely separate database partition. No history, cookies, cache, or site data from private windows is stored in the normal database. When the private window closes, its entire database is deleted. Private tabs cannot be moved to normal windows, and the tab switcher filters by context."
            }
          },
          {
            "@type": "Question",
            "name": "Is Nav0 private browsing actually private?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Nav0's private mode is more private than most browsers because Nav0 itself collects zero data. There is no telemetry, no sync service, and no account system that could leak your private browsing activity. However, private browsing does not hide your activity from your ISP, network administrator, or the websites you visit. For that, you need a VPN or Tor."
            }
          },
          {
            "@type": "Question",
            "name": "What data is deleted when I close a private window in Nav0?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Everything. When a private window closes, Nav0 deletes the entire private database partition, which includes all browsing history, cookies, cached files, site data, local storage, and session data from that window. Nothing persists."
            }
          },
          {
            "@type": "Question",
            "name": "Can I move tabs between private and normal windows?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No. Private and normal windows are fully isolated. Tabs cannot be moved or dragged between them. The Cmd+O tab switcher only shows tabs matching the current context — private windows see only private tabs, and normal windows see only normal tabs."
            }
          },
          {
            "@type": "Question",
            "name": "Do bookmarks and downloads from private browsing persist?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Downloads persist because downloaded files are saved to your filesystem. Bookmarks created in private mode are saved to the normal bookmark database and persist after the private window closes. Browsing history, cookies, and cache from private mode do not persist."
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
        "name": "How to Use Private Browsing in Nav0",
        "description": "Open a private browsing window in Nav0 that uses a separate database partition and deletes all data when closed.",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Open a private window",
            "text": "Press Cmd+Shift+N on macOS or Ctrl+Shift+N on Windows/Linux. You can also use File menu or the options menu to select New Private Window."
          },
          {
            "@type": "HowToStep",
            "name": "Browse privately",
            "text": "Private windows operate on a separate storage partition. Cookies, history, cache, and local storage are isolated from your normal browsing windows."
          },
          {
            "@type": "HowToStep",
            "name": "Close to delete all data",
            "text": "When you close the last private window, Nav0 deletes the entire private database partition. All history, cookies, cached files, and session data are permanently removed."
          }
        ]
      }
---

# Private Browsing

Nav0's private browsing mode provides a clean, isolated session that leaves no trace when you close the window. Combined with Nav0's zero-telemetry architecture, private browsing in Nav0 is genuinely private — there is no server-side component that could record your activity.

## How to Open a Private Window

- **Keyboard:** Cmd+Shift+N (macOS) or Ctrl+Shift+N (Windows/Linux)
- **Menu:** File → New Private Window
- **Options menu:** Click the menu icon → New Private Window

## How It Works

### Separate Database Partition

Private windows operate on a completely separate storage partition (`persist:private`). This means:

- Private windows have their own cookie jar
- Private windows have their own browsing history database
- Private windows have their own cache
- Private windows have their own local storage and session storage

None of this data is shared with or accessible from normal windows.

### Full Cleanup on Close

When the last private window closes, Nav0 **deletes the entire private database**. This is not a selective cleanup — the entire partition is removed, including:

- All browsing history
- All cookies and site data
- All cached files
- All local storage and session storage
- All service worker registrations

There is no way to recover this data after closing the private window.

### Session Isolation

Private and normal windows are fully isolated from each other:

| Aspect           | Behavior                                                                             |
| ---------------- | ------------------------------------------------------------------------------------ |
| **Cookies**      | Private windows have a separate cookie jar — not shared with normal windows          |
| **History**      | Private browsing history is not recorded in the normal history database              |
| **Cache**        | Separate cache — cached files from normal browsing are not available in private mode |
| **Tab movement** | Tabs cannot be moved or dragged between private and normal windows                   |
| **Tab switcher** | Cmd+O only shows tabs matching the current context (private or normal)               |
| **Permissions**  | Permission decisions in private mode are session-only — not saved                    |

## What Private Browsing Does

- **No history recorded** — Pages visited in private mode are not added to your browsing history
- **Cookies cleared on close** — All cookies from the private session are deleted when the window closes
- **Cache cleared on close** — Cached files do not persist
- **Separate from normal browsing** — Sites you're logged into in normal windows are not logged in in private windows
- **Permission prompts show private indicator** — Permission prompts display a visual indicator that you're in private mode

## What Private Browsing Does Not Do

Private browsing protects against local traces on your device. It does **not** protect against:

- **Your ISP** — Your internet service provider can still see the domains you visit
- **Network administrators** — Your employer or school network can monitor traffic
- **Websites you visit** — Sites can still log your IP address and activity
- **DNS queries** — Your DNS provider can see domain lookups
- **Downloads** — Files you download are saved to your filesystem and persist after closing

For protection against network-level surveillance, you need a VPN or the Tor network. Nav0 supports [proxy configuration](/guide/privacy-protection#proxy-configuration) for routing traffic through external services.

## What Persists After Closing

| Data                 | Persists?                               |
| -------------------- | --------------------------------------- |
| Browsing history     | No                                      |
| Cookies              | No                                      |
| Cache                | No                                      |
| Local storage        | No                                      |
| Session storage      | No                                      |
| Downloaded files     | Yes — saved to your filesystem          |
| Bookmarks created    | Yes — saved to normal bookmark database |
| Permission decisions | No — session-only                       |

## Private Browsing + Nav0's Privacy Features

All of Nav0's privacy features are active in private browsing mode:

- **Ad blocker** — Active with the same configuration as normal browsing
- **Third-party cookie blocking** — Active (default)
- **HTTPS enforcement** — Active
- **User agent spoofing** — Active with the same preset
- **Fingerprinting protection** — Active
- **Popup blocking** — Active with the same policy

Private browsing adds an additional layer on top of these protections, not a replacement for them.

## Compared to Other Browsers

| Feature                      | Nav0              | Chrome              | Firefox             | Brave               |
| ---------------------------- | ----------------- | ------------------- | ------------------- | ------------------- |
| Separate storage partition   | Yes               | Yes                 | Yes                 | Yes                 |
| Full cleanup on close        | Yes               | Yes                 | Yes                 | Yes                 |
| No telemetry in private mode | Yes               | No                  | Partial             | Partial             |
| No sync/account leakage      | Yes (no accounts) | Risk if signed in   | Risk if signed in   | Risk if signed in   |
| No server-side record        | Yes               | No (Google may log) | Depends on settings | Depends on settings |

The key difference: because Nav0 has no accounts, no sync, and no telemetry, there is no server-side component that could inadvertently record your private browsing activity. In browsers with account systems, private mode data can leak through sync services, crash reports, or telemetry — even if the browser claims it doesn't.

## Frequently Asked Questions

### Can I have multiple private windows open at once?

Yes. All private windows share the same private partition, so they share cookies and session state with each other. When the _last_ private window closes, all private data is deleted.

### Are tabs from private windows shown in the Command-K search?

No. Command-K and the Cmd+O tab switcher only show tabs from the current context. When searching from a private window, only private tabs appear. When searching from a normal window, only normal tabs appear.

### Can websites detect that I'm in private browsing?

Some websites attempt to detect private browsing by testing browser APIs that behave differently in private mode (e.g., storage quota limits). Nav0 does not add specific countermeasures against private mode detection beyond what Chromium provides.

### Is private browsing suitable for sensitive activities?

Private browsing is suitable for keeping your browsing history off your local device. For sensitive activities that require network-level anonymity (journalism, activism, whistleblowing), combine Nav0's private mode with a VPN or Tor. Private browsing alone does not provide anonymity.

---

_See also: [Privacy & Tracking Protection](/guide/privacy-protection) · [Ad Blocker](/guide/ad-blocker) · [Features Overview](/guide/features)_
