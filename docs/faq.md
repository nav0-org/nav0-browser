---
title: "Frequently Asked Questions — Nav0 Browser"
description: "Answers to common questions about Nav0 — privacy, data collection, features, and how it differs from Chrome, Brave, and Firefox."
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
            "name": "What is Nav0?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Nav0 is a free, open-source, privacy-focused desktop web browser built on Electron and Chromium. The name comes from 'navigate + zero (bloat).' It collects zero telemetry, requires no accounts, and stores all data locally on your device."
            }
          },
          {
            "@type": "Question",
            "name": "What platforms does Nav0 support?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Nav0 supports Windows (x64), macOS (Intel x64 and Apple Silicon ARM64), and Linux (x64). On macOS, install via Homebrew: brew install --cask nav0-org/Nav0/nav0-browser. On Windows and Linux, download installers from GitHub Releases. On all platforms, you can build from source."
            }
          },
          {
            "@type": "Question",
            "name": "What browser engine does Nav0 use?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Nav0 uses Chromium via Electron, giving it full compatibility with the modern web while maintaining privacy through zero telemetry and local-only data storage."
            }
          },
          {
            "@type": "Question",
            "name": "Is Nav0 open source?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Nav0 is fully open source under the MIT License. The complete source code is publicly available at https://github.com/nav0-org/nav0-browser. You can audit it, fork it, or build it from source yourself."
            }
          },
          {
            "@type": "Question",
            "name": "How do I update Nav0?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Download the latest release from GitHub Releases or, on macOS, run brew upgrade nav0-browser. Nav0 never forces updates — you control when and how you update."
            }
          },
          {
            "@type": "Question",
            "name": "Does Nav0 collect any data?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No. Zero. Nav0 collects no telemetry, no usage statistics, no crash reports, no browsing data, no personal information, and no device information. There is nothing to opt out of because there is nothing to collect."
            }
          },
          {
            "@type": "Question",
            "name": "Does Nav0 require an account?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No. Nav0 works fully without any sign-up, sign-in, or registration. There are no accounts, no profiles, and no cloud sync."
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
            "name": "Does Nav0 phone home?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No. Nav0 makes zero unsolicited network requests. No analytics pings, no heartbeat checks, no anonymous usage data, no background sync. You can verify this by monitoring your network traffic."
            }
          },
          {
            "@type": "Question",
            "name": "Does Nav0 block ads and trackers?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Nav0 includes a built-in ad blocker with domain blocking, URL pattern matching, cosmetic filtering, and video ad blocking. It also blocks third-party cookies by default and includes fingerprinting protection. Everything works out of the box."
            }
          },
          {
            "@type": "Question",
            "name": "Is private browsing truly private in Nav0?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "In private mode, Nav0 saves no history, clears cookies on close, and persists no cached data. Unlike other browsers, Nav0 also doesn't collect data in normal mode — so private mode is an extra layer on top of already-private browsing."
            }
          },
          {
            "@type": "Question",
            "name": "How is Nav0 different from Chrome, Edge, or other mainstream browsers?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Unlike mainstream browsers, Nav0 does not send browsing data to any server, does not require or encourage sign-in, does not include advertising or monetization features, does not bundle AI assistants, and does not phone home for any reason. Most mainstream browsers are funded by advertising revenue and designed to collect user data."
            }
          },
          {
            "@type": "Question",
            "name": "How is Nav0 different from Brave?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "While Brave has meaningful privacy protections, its business model depends on an advertising network (Brave Ads) and it ships with a cryptocurrency wallet and affiliate link features. Nav0 has no advertising, no crypto features, and no business model that depends on user data."
            }
          },
          {
            "@type": "Question",
            "name": "How is Nav0 different from Firefox?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Firefox receives approximately 80-85% of its revenue from Google search engine deals, creating a financial dependency. Firefox has also been adding AI-powered features. Nav0 has no search engine deals and no AI features."
            }
          },
          {
            "@type": "Question",
            "name": "Does Nav0 support browser extensions?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Nav0 supports extensions. However, third-party extensions have their own privacy policies and data practices. We recommend reviewing extension permissions, using open-source extensions, and limiting the number of installed extensions."
            }
          },
          {
            "@type": "Question",
            "name": "Does Nav0 have a built-in ad blocker?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Nav0 ships with a comprehensive ad blocker that includes domain blocking, URL pattern matching, cosmetic filtering, and video ad blocking. It works out of the box with no configuration required."
            }
          },
          {
            "@type": "Question",
            "name": "Does Nav0 support dark mode?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Nav0 has a dark mode toggle in the browser navbar that applies dark CSS to any website. It works on sites like LinkedIn and Reddit and persists across back/forward navigation."
            }
          },
          {
            "@type": "Question",
            "name": "Can I open PDFs in Nav0?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Nav0 has a built-in PDF reader that opens PDFs inline in browser tabs. You can also open local PDF files via File > Open PDF (Ctrl+Shift+O / Cmd+Shift+O)."
            }
          },
          {
            "@type": "Question",
            "name": "Does Nav0 have a reader mode?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Nav0 includes Reader Mode powered by Readability.js — strip away page clutter and read articles in a clean, distraction-free layout."
            }
          },
          {
            "@type": "Question",
            "name": "Can I restore tabs I accidentally closed?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Nav0 tracks recently closed tabs and lets you restore them from the History menu. You can even restore an entire closed window with all its tabs."
            }
          },
          {
            "@type": "Question",
            "name": "Does Nav0 support tab pinning?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Right-click any tab to pin it. Pinned tabs stay compact and persistent at the left side of the tab strip."
            }
          },
          {
            "@type": "Question",
            "name": "Why doesn't Nav0 have an AI assistant?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Nav0 does not include AI because a browser's job is to browse the web. AI features typically require sending page content and user queries to cloud servers for processing, which contradicts Nav0's privacy-first design. If you want AI tools, you can visit them in a browser tab like any other website."
            }
          },
          {
            "@type": "Question",
            "name": "Why doesn't Nav0 have a built-in VPN?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Browser VPNs create conflicts of interest and a false sense of security. A VPN inside the browser does not protect you from the browser itself. Nav0 believes these should be separate, auditable tools. A browser that collects zero data is already more private than any browser-plus-VPN combination from a big tech company."
            }
          },
          {
            "@type": "Question",
            "name": "Why doesn't Nav0 have sync or cloud features?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Cloud sync requires accounts, which enable identity-linked data collection. It also means your bookmarks, history, and settings exist on someone else's server. Nav0 keeps everything local by design. If you need to transfer data between devices, you can export and import bookmarks manually."
            }
          },
          {
            "@type": "Question",
            "name": "How do I report a bug?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "You can report bugs directly from inside the browser using the built-in issue reporter, which supports image attachments. Screenshots are automatically compressed before upload. Alternatively, open an issue on GitHub at https://github.com/nav0-org/nav0-browser/issues."
            }
          },
          {
            "@type": "Question",
            "name": "Does Nav0 enforce HTTPS?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Nav0 automatically upgrades HTTP URLs to HTTPS when possible. For sites with invalid or expired SSL certificates, Nav0 shows a security warning page with a temporary bypass option."
            }
          },
          {
            "@type": "Question",
            "name": "Can I check if a site's SSL certificate is valid?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Click the lock icon in the address bar to view SSL certificate details in an overlay panel. The icon also reflects whether the connection is secure, insecure, or has no certificate info."
            }
          },
          {
            "@type": "Question",
            "name": "How does Nav0 make money?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Nav0 is a community project. It does not monetize users. There are no search engine deals, no advertising revenue, and no paid features."
            }
          },
          {
            "@type": "Question",
            "name": "How does Nav0 improve without collecting telemetry?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Through voluntary bug reports from users, GitHub issues and discussions, community feedback, and the developers' own daily usage of the browser."
            }
          },
          {
            "@type": "Question",
            "name": "What happens if Nav0 gets acquired?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "The code is open source under the MIT License. Even if the project changes hands, the community can fork it and continue development independently. Users can always build from a trusted commit."
            }
          },
          {
            "@type": "Question",
            "name": "How can I contribute?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Visit the Contributing guide for details. You can contribute by reporting bugs, submitting pull requests, improving documentation, or simply using Nav0 and spreading the word."
            }
          },
          {
            "@type": "Question",
            "name": "What license does Nav0 use?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Nav0 is licensed under the MIT License — one of the most permissive open-source licenses. You are free to use, modify, and distribute the software."
            }
          }
        ]
      }
---

# Frequently Asked Questions

Common questions about Nav0 and how it works.

---

## General

### What is Nav0?

Nav0 is a free, open-source, privacy-focused desktop web browser built on Electron and Chromium. The name comes from "navigate + zero (bloat)." It collects zero telemetry, requires no accounts, and stores all data locally on your device.

### What platforms does Nav0 support?

Nav0 supports **Windows** (x64), **macOS** (Intel x64 and Apple Silicon ARM64), and **Linux** (x64).

On macOS, install via [Homebrew](https://brew.sh): `brew install --cask nav0-org/Nav0/nav0-browser`. On Windows and Linux, download installers from [GitHub Releases](https://github.com/nav0-org/nav0-browser/releases). On all platforms, you can [build from source](/guide/getting-started).

### What browser engine does Nav0 use?

Nav0 uses **Chromium** via Electron, giving it full compatibility with the modern web while maintaining privacy through zero telemetry and local-only data storage.

### Is Nav0 open source?

Yes. Nav0 is fully open source under the **MIT License**. The complete source code is publicly available at [github.com/nav0-org/nav0-browser](https://github.com/nav0-org/nav0-browser). You can audit it, fork it, or build it from source yourself.

### How do I update Nav0?

Download the latest release from [GitHub Releases](https://github.com/nav0-org/nav0-browser/releases) or, on macOS, run `brew upgrade nav0-browser`. Nav0 never forces updates — you control when and how you update.

---

## Privacy

### Does Nav0 collect any data?

**No. Zero.** Nav0 collects no telemetry, no usage statistics, no crash reports, no browsing data, no personal information, and no device information. There is nothing to opt out of because there is nothing to collect.

### Does Nav0 require an account?

No. Nav0 works fully without any sign-up, sign-in, or registration. There are no accounts, no profiles, and no cloud sync.

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

### Does Nav0 phone home?

No. Nav0 makes **zero unsolicited network requests**. No analytics pings, no heartbeat checks, no "anonymous" usage data, no background sync. You can verify this by monitoring your network traffic.

### Does Nav0 block ads and trackers?

Yes. Nav0 includes a **built-in ad blocker** with domain blocking, URL pattern matching, cosmetic filtering, and video ad blocking. It also blocks third-party cookies by default and includes fingerprinting protection. Everything works out of the box.

### Is private browsing truly private in Nav0?

In private mode, Nav0 saves no history, clears cookies on close, and persists no cached data. Unlike other browsers, Nav0 also doesn't collect data in normal mode — so private mode is an extra layer on top of already-private browsing.

---

## Comparisons

### How is Nav0 different from Chrome, Edge, or other mainstream browsers?

Unlike mainstream browsers, Nav0:
- Does **not** send browsing data to any server
- Does **not** require or encourage sign-in
- Does **not** include advertising or monetization features
- Does **not** bundle AI assistants
- Does **not** phone home for any reason

Most mainstream browsers are funded by advertising revenue and designed to collect user data. Nav0 has no such business model.

### How is Nav0 different from Brave?

While Brave has meaningful privacy protections, its business model depends on an **advertising network** (Brave Ads) and it ships with a **cryptocurrency wallet** and affiliate link features. Nav0 has no advertising, no crypto features, and no business model that depends on user data.

### How is Nav0 different from Firefox?

Firefox receives approximately 80-85% of its revenue from **Google search engine deals**, creating a financial dependency. Firefox has also been adding AI-powered features. Nav0 has no search engine deals and no AI features.

---

## Features

### Does Nav0 support browser extensions?

Yes. Nav0 supports extensions. However, third-party extensions have their own privacy policies. We recommend:
- Reviewing extension permissions carefully
- Using open-source extensions
- Limiting the number of installed extensions

### Does Nav0 have a built-in ad blocker?

Yes. Nav0 ships with a comprehensive ad blocker that includes domain blocking, URL pattern matching, cosmetic filtering, and video ad blocking. It works out of the box with no configuration required.

### Does Nav0 support dark mode?

Yes. Nav0 has a **dark mode toggle** in the browser navbar that applies dark CSS to any website. It works on sites like LinkedIn and Reddit and persists across back/forward navigation.

### Can I open PDFs in Nav0?

Yes. Nav0 has a **built-in PDF reader** that opens PDFs inline in browser tabs. You can also open local PDF files via File > Open PDF (Ctrl+Shift+O / Cmd+Shift+O).

### Does Nav0 have a reader mode?

Yes. Nav0 includes **Reader Mode** powered by Readability.js — strip away page clutter and read articles in a clean, distraction-free layout.

### Can I restore tabs I accidentally closed?

Yes. Nav0 tracks recently closed tabs and lets you restore them from the History menu. You can even restore an entire closed window with all its tabs.

### Does Nav0 support tab pinning?

Yes. Right-click any tab to pin it. Pinned tabs stay compact and persistent at the left side of the tab strip.

### Why doesn't Nav0 have an AI assistant?

Nav0 does not include AI because **a browser's job is to browse the web**. AI features typically require sending page content and user queries to cloud servers for processing, which contradicts Nav0's privacy-first design. If you want AI tools, you can visit them in a browser tab like any other website.

### Why doesn't Nav0 have a built-in VPN?

Browser VPNs create **conflicts of interest** and a false sense of security. A VPN inside the browser does not protect you from the browser itself. Nav0 believes these should be separate, auditable tools. A browser that collects zero data is already more private than any browser-plus-VPN combination from a big tech company.

### Why doesn't Nav0 have sync or cloud features?

Cloud sync requires accounts, which enable identity-linked data collection. It also means your bookmarks, history, and settings exist on someone else's server. Nav0 keeps everything local by design. If you need to transfer data between devices, you can export and import bookmarks manually.

### How do I report a bug?

You can report bugs **directly from inside the browser** using the built-in issue reporter, which supports image attachments. Screenshots are automatically compressed before upload. Alternatively, open an issue on [GitHub](https://github.com/nav0-org/nav0-browser/issues).

### Does Nav0 enforce HTTPS?

Yes. Nav0 **automatically upgrades HTTP URLs to HTTPS** when possible. For sites with invalid or expired SSL certificates, Nav0 shows a security warning page with a temporary bypass option.

### Can I check if a site's SSL certificate is valid?

Yes. Click the **lock icon** in the address bar to view SSL certificate details in an overlay panel. The icon also reflects whether the connection is secure, insecure, or has no certificate info.

---

## Project

### How does Nav0 make money?

Nav0 is a **community project**. It does not monetize users. There are no search engine deals, no advertising revenue, and no paid features.

### How does Nav0 improve without collecting telemetry?

Through:
- Voluntary bug reports from users
- GitHub issues and discussions
- Community feedback
- The developers' own daily usage

### What happens if Nav0 gets acquired?

The code is open source under the MIT License. Even if the project changes hands, the community can **fork it** and continue development independently. Users can always build from a trusted commit.

### How can I contribute?

Visit the [Contributing guide](/guide/contributing) for details. You can contribute by reporting bugs, submitting pull requests, improving documentation, or simply using Nav0 and spreading the word.

### What license does Nav0 use?

Nav0 is licensed under the **MIT License** — one of the most permissive open-source licenses. You are free to use, modify, and distribute the software.

---

**Still have questions?** Open an issue on [GitHub](https://github.com/nav0-org/nav0-browser/issues).
