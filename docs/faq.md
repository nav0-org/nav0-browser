---
title: "Frequently Asked Questions — nav0 Browser"
description: "Common questions about nav0, the minimal privacy-focused web browser. Learn about features, privacy, platforms, and more."
head:
  - - meta
    - property: og:type
      content: website
  - - script
    - type: application/ld+json
    - |
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is nav0?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "nav0 is a free, open-source, privacy-focused desktop web browser built on Electron and Chromium. The name comes from 'navigate + zero (bloat).' It collects zero telemetry, requires no accounts, and stores all data locally on your device."
            }
          },
          {
            "@type": "Question",
            "name": "What platforms does nav0 support?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "nav0 supports Windows (x64), macOS (Intel x64 and Apple Silicon ARM64), and Linux (x64). On macOS, install via Homebrew: brew install --cask nav0-org/nav0/nav0-browser. On Windows and Linux, download installers from GitHub Releases. On all platforms, you can build from source."
            }
          },
          {
            "@type": "Question",
            "name": "Does nav0 collect any data?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No. Zero. nav0 collects no telemetry, no usage statistics, no crash reports, no browsing data, no personal information, and no device information. There is nothing to opt out of because there is nothing to collect."
            }
          },
          {
            "@type": "Question",
            "name": "Does nav0 require an account?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No. nav0 works fully without any sign-up, sign-in, or registration. There are no accounts, no profiles, and no cloud sync."
            }
          },
          {
            "@type": "Question",
            "name": "Is nav0 open source?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. nav0 is fully open source under the MIT License. The complete source code is publicly available at https://github.com/nav0-org/nav0-browser."
            }
          },
          {
            "@type": "Question",
            "name": "What browser engine does nav0 use?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "nav0 uses Chromium via Electron, giving it full compatibility with the modern web while maintaining privacy through zero telemetry and local-only data storage."
            }
          },
          {
            "@type": "Question",
            "name": "How is nav0 different from Chrome, Edge, or other mainstream browsers?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Unlike mainstream browsers, nav0 does not send browsing data to any server, does not require sign-in, does not include advertising or monetization features, does not bundle AI assistants, and does not phone home for any reason. Most mainstream browsers are funded by advertising revenue and designed to collect user data."
            }
          },
          {
            "@type": "Question",
            "name": "How is nav0 different from Brave?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "While Brave has meaningful privacy protections, its business model depends on an advertising network (Brave Ads) and it ships with a cryptocurrency wallet and affiliate link features. nav0 has no advertising, no crypto features, and no business model that depends on user data."
            }
          },
          {
            "@type": "Question",
            "name": "Why doesn't nav0 have an AI assistant?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "nav0 does not include AI because a browser's job is to browse the web. AI features typically require sending page content and user queries to cloud servers for processing, which contradicts nav0's privacy-first design. If you want AI tools, you can visit them in a browser tab like any other website."
            }
          },
          {
            "@type": "Question",
            "name": "Why doesn't nav0 have a built-in VPN?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Browser VPNs create conflicts of interest and a false sense of security. A VPN inside the browser does not protect you from the browser itself. nav0 believes these should be separate, auditable tools. A browser that collects zero data is already more private than any browser-plus-VPN combination from a big tech company."
            }
          },
          {
            "@type": "Question",
            "name": "How does nav0 make money?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "nav0 is a community project. It does not monetize users. There are no search engine deals, no advertising revenue, and no paid features."
            }
          },
          {
            "@type": "Question",
            "name": "How does nav0 improve without collecting telemetry?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Through voluntary bug reports from users, GitHub issues, community feedback and discussion, and the developers' own daily usage of the browser."
            }
          },
          {
            "@type": "Question",
            "name": "Does nav0 support browser extensions?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. nav0 supports extensions. However, third-party extensions have their own privacy policies and data practices. We recommend reviewing extension permissions, using open-source extensions, and limiting the number of installed extensions."
            }
          },
          {
            "@type": "Question",
            "name": "Where is my data stored?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "All data is stored locally on your device. Bookmarks, browsing history, settings, and downloads are kept in local files and databases. On Windows: %APPDATA%/nav0/, on macOS: ~/Library/Application Support/nav0/, on Linux: ~/.config/nav0/."
            }
          },
          {
            "@type": "Question",
            "name": "What happens if nav0 gets acquired?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The code is open source under the MIT License. Even if the project changes hands, the community can fork it and continue development independently. Users can always build from a trusted commit."
            }
          }
        ]
      }
---

# Frequently Asked Questions

Common questions about nav0 and how it works.

---

## General

### What is nav0?

nav0 is a free, open-source, privacy-focused desktop web browser built on Electron and Chromium. The name comes from "navigate + zero (bloat)." It collects zero telemetry, requires no accounts, and stores all data locally on your device.

### What platforms does nav0 support?

nav0 supports **Windows** (x64), **macOS** (Intel x64 and Apple Silicon ARM64), and **Linux** (x64).

On macOS, install via [Homebrew](https://brew.sh): `brew install --cask nav0-org/nav0/nav0-browser`. On Windows and Linux, download installers from [GitHub Releases](https://github.com/nav0-org/nav0-browser/releases). On all platforms, you can [build from source](/guide/getting-started).

### What browser engine does nav0 use?

nav0 uses **Chromium** via Electron, giving it full compatibility with the modern web while maintaining privacy through zero telemetry and local-only data storage.

### Is nav0 open source?

Yes. nav0 is fully open source under the **MIT License**. The complete source code is publicly available at [github.com/nav0-org/nav0-browser](https://github.com/nav0-org/nav0-browser). You can audit it, fork it, or build it from source yourself.

---

## Privacy

### Does nav0 collect any data?

**No. Zero.** nav0 collects no telemetry, no usage statistics, no crash reports, no browsing data, no personal information, and no device information. There is nothing to opt out of because there is nothing to collect.

### Does nav0 require an account?

No. nav0 works fully without any sign-up, sign-in, or registration. There are no accounts, no profiles, and no cloud sync.

### Where is my data stored?

All data is stored **locally on your device**:

| Data | Storage |
|------|---------|
| Bookmarks | Local database |
| History | Local database |
| Settings | Local config file |
| Downloads | Your chosen folder |

Configuration locations:
- **Windows**: `%APPDATA%/nav0/`
- **macOS**: `~/Library/Application Support/nav0/`
- **Linux**: `~/.config/nav0/`

### Does nav0 phone home?

No. nav0 makes **zero unsolicited network requests**. No analytics pings, no heartbeat checks, no "anonymous" usage data, no background sync. You can verify this by monitoring your network traffic.

---

## Comparisons

### How is nav0 different from Chrome, Edge, or other mainstream browsers?

Unlike mainstream browsers, nav0:
- Does **not** send browsing data to any server
- Does **not** require or encourage sign-in
- Does **not** include advertising or monetization features
- Does **not** bundle AI assistants
- Does **not** phone home for any reason

Most mainstream browsers are funded by advertising revenue and designed to collect user data. nav0 has no such business model.

### How is nav0 different from Brave?

While Brave has meaningful privacy protections, its business model depends on an **advertising network** (Brave Ads) and it ships with a **cryptocurrency wallet** and affiliate link features. nav0 has no advertising, no crypto features, and no business model that depends on user data.

### How is nav0 different from Firefox?

Firefox receives approximately 80-85% of its revenue from **Google search engine deals**, creating a financial dependency. Firefox has also been adding AI-powered features. nav0 has no search engine deals and no AI features.

---

## Features

### Does nav0 support browser extensions?

Yes. nav0 supports extensions. However, third-party extensions have their own privacy policies. We recommend:
- Reviewing extension permissions carefully
- Using open-source extensions
- Limiting the number of installed extensions

### Why doesn't nav0 have an AI assistant?

nav0 does not include AI because **a browser's job is to browse the web**. AI features typically require sending page content and user queries to cloud servers for processing, which contradicts nav0's privacy-first design. If you want AI tools, you can visit them in a browser tab like any other website.

### Why doesn't nav0 have a built-in VPN?

Browser VPNs create **conflicts of interest** and a false sense of security. A VPN inside the browser does not protect you from the browser itself. nav0 believes these should be separate, auditable tools. A browser that collects zero data is already more private than any browser-plus-VPN combination from a big tech company.

### Why doesn't nav0 have sync or cloud features?

Cloud sync requires accounts, which enable identity-linked data collection. It also means your bookmarks, history, and settings exist on someone else's server. nav0 keeps everything local by design. If you need to transfer data between devices, you can export and import bookmarks manually.

---

## Project

### How does nav0 make money?

nav0 is a **community project**. It does not monetize users. There are no search engine deals, no advertising revenue, and no paid features.

### How does nav0 improve without collecting telemetry?

Through:
- Voluntary bug reports from users
- GitHub issues and discussions
- Community feedback
- The developers' own daily usage

### What happens if nav0 gets acquired?

The code is open source under the MIT License. Even if the project changes hands, the community can **fork it** and continue development independently. Users can always build from a trusted commit.

### How can I contribute?

Visit the [Contributing guide](/guide/contributing) for details. You can contribute by reporting bugs, submitting pull requests, improving documentation, or simply using nav0 and spreading the word.

---

**Still have questions?** Open an issue on [GitHub](https://github.com/nav0-org/nav0-browser/issues).
