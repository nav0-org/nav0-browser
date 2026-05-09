export interface FaqQA { q: string; a: string }
export interface FaqCategory { name: string; questions: FaqQA[] }

export const faqData: FaqCategory[] = [
  {
    "name": "General",
    "questions": [
      {
        "q": "What is Nav0?",
        "a": "Nav0 (pronounced \"Nav Nought\") is a free, open-source, privacy-focused desktop web browser built on Electron and Chromium. The name comes from \"navigate + nought (bloat).\" It collects zero telemetry, requires no accounts, and stores all data locally on your device."
      },
      {
        "q": "What platforms does Nav0 support?",
        "a": "Nav0 supports **Windows** (x64), **macOS** (Intel x64 and Apple Silicon ARM64), and **Linux** (x64).\n\nOn macOS, install via [Homebrew](https://brew.sh): `brew install --cask nav0-org/nav0/nav0`. On Windows and Linux, download installers from [GitHub Releases](https://github.com/nav0-org/nav0-browser/releases). On all platforms, you can [build from source](/guide/getting-started)."
      },
      {
        "q": "What browser engine does Nav0 use?",
        "a": "Nav0 uses **Chromium** via Electron, giving it full compatibility with the modern web while maintaining privacy through zero telemetry and local-only data storage."
      },
      {
        "q": "Is Nav0 open source?",
        "a": "Yes. Nav0 is fully open source under the **MIT License**. The complete source code is publicly available at [github.com/nav0-org/nav0-browser](https://github.com/nav0-org/nav0-browser). You can audit it, fork it, or build it from source yourself."
      },
      {
        "q": "How do I update Nav0?",
        "a": "Download the latest release from [GitHub Releases](https://github.com/nav0-org/nav0-browser/releases) or, on macOS, run `brew upgrade nav0`. Nav0 never forces updates \u2014 you control when and how you update."
      }
    ]
  },
  {
    "name": "Privacy",
    "questions": [
      {
        "q": "Does Nav0 collect any data?",
        "a": "**No. Zero.** Nav0 collects no telemetry, no usage statistics, no crash reports, no browsing data, no personal information, and no device information. There is nothing to opt out of because there is nothing to collect."
      },
      {
        "q": "Does Nav0 require an account?",
        "a": "No. Nav0 works fully without any sign-up, sign-in, or registration. There are no accounts, no profiles, and no cloud sync."
      },
      {
        "q": "Where is my data stored?",
        "a": "All data is stored **locally on your device**:\n\n| Data      | Storage            |\n| --------- | ------------------ |\n| Bookmarks | Local database     |\n| History   | Local database     |\n| Settings  | Local config file  |\n| Downloads | Your chosen folder |\n\nConfiguration locations:\n\n- **Windows**: `%APPDATA%/nav0/`\n- **macOS**: `~/Library/Application Support/nav0/`\n- **Linux**: `~/.config/nav0/`"
      },
      {
        "q": "Does Nav0 phone home?",
        "a": "No. Nav0 makes **zero unsolicited network requests**. No analytics pings, no heartbeat checks, no \"anonymous\" usage data, no background sync. You can verify this by monitoring your network traffic."
      },
      {
        "q": "Does Nav0 block ads and trackers?",
        "a": "Yes. Nav0 includes a **built-in ad blocker** with domain blocking, URL pattern matching, cosmetic filtering, and video ad blocking. It also blocks third-party cookies by default and includes fingerprinting protection. Everything works out of the box."
      },
      {
        "q": "Is private browsing truly private in Nav0?",
        "a": "In private mode, Nav0 saves no history, clears cookies on close, and persists no cached data. Unlike other browsers, Nav0 also doesn't collect data in normal mode \u2014 so private mode is an extra layer on top of already-private browsing."
      }
    ]
  },
  {
    "name": "Comparisons",
    "questions": [
      {
        "q": "How is Nav0 different from Chrome, Edge, or other mainstream browsers?",
        "a": "Unlike mainstream browsers, Nav0:\n\n- Does **not** send browsing data to any server\n- Does **not** require or encourage sign-in\n- Does **not** include advertising or monetization features\n- Does **not** bundle AI assistants\n- Does **not** phone home for any reason\n\nMost mainstream browsers are funded by advertising revenue and designed to collect user data. Nav0 has no such business model."
      },
      {
        "q": "How is Nav0 different from Brave?",
        "a": "While Brave has meaningful privacy protections, its business model depends on an **advertising network** (Brave Ads) and it ships with a **cryptocurrency wallet** and affiliate link features. Nav0 has no advertising, no crypto features, and no business model that depends on user data."
      },
      {
        "q": "How is Nav0 different from Firefox?",
        "a": "Firefox receives approximately 80-85% of its revenue from **Google search engine deals**, creating a financial dependency. Firefox has also been adding AI-powered features. Nav0 has no search engine deals and no AI features."
      }
    ]
  },
  {
    "name": "Features",
    "questions": [
      {
        "q": "Does Nav0 support browser extensions?",
        "a": "Yes. Nav0 supports extensions. However, third-party extensions have their own privacy policies. We recommend:\n\n- Reviewing extension permissions carefully\n- Using open-source extensions\n- Limiting the number of installed extensions"
      },
      {
        "q": "Does Nav0 have a built-in ad blocker?",
        "a": "Yes. Nav0 ships with a comprehensive ad blocker that includes domain blocking, URL pattern matching, cosmetic filtering, and video ad blocking. It works out of the box with no configuration required."
      },
      {
        "q": "Does Nav0 support dark mode?",
        "a": "Yes. Nav0 has a **dark mode toggle** in the browser navbar that applies dark CSS to any website. It works on sites like LinkedIn and Reddit and persists across back/forward navigation."
      },
      {
        "q": "Can I open PDFs in Nav0?",
        "a": "Yes. Nav0 has a **built-in PDF reader** that opens PDFs inline in browser tabs. You can also open local PDF files via File > Open PDF (Ctrl+Shift+O / Cmd+Shift+O)."
      },
      {
        "q": "Does Nav0 have a reader mode?",
        "a": "Yes. Nav0 includes **Reader Mode** powered by Readability.js \u2014 strip away page clutter and read articles in a clean, distraction-free layout."
      },
      {
        "q": "Can I restore tabs I accidentally closed?",
        "a": "Yes. Nav0 tracks recently closed tabs and lets you restore them from the History menu. You can even restore an entire closed window with all its tabs."
      },
      {
        "q": "Does Nav0 support tab pinning?",
        "a": "Yes. Right-click any tab to pin it. Pinned tabs stay compact and persistent at the left side of the tab strip."
      },
      {
        "q": "Why doesn't Nav0 have an AI assistant?",
        "a": "Nav0 does not include AI because **a browser's job is to browse the web**. AI features typically require sending page content and user queries to cloud servers for processing, which contradicts Nav0's privacy-first design. If you want AI tools, you can visit them in a browser tab like any other website."
      },
      {
        "q": "Why doesn't Nav0 have a built-in VPN?",
        "a": "Browser VPNs create **conflicts of interest** and a false sense of security. A VPN inside the browser does not protect you from the browser itself. Nav0 believes these should be separate, auditable tools. A browser that collects zero data is already more private than any browser-plus-VPN combination from a big tech company."
      },
      {
        "q": "Why doesn't Nav0 have sync or cloud features?",
        "a": "Cloud sync requires accounts, which enable identity-linked data collection. It also means your bookmarks, history, and settings exist on someone else's server. Nav0 keeps everything local by design. If you need to transfer data between devices, you can export and import bookmarks manually."
      },
      {
        "q": "How do I report a bug?",
        "a": "You can report bugs **directly from inside the browser** using the built-in issue reporter, which supports image attachments. Screenshots are automatically compressed before upload. Alternatively, open an issue on [GitHub](https://github.com/nav0-org/nav0-browser/issues)."
      },
      {
        "q": "Does Nav0 enforce HTTPS?",
        "a": "Yes. Nav0 **automatically upgrades HTTP URLs to HTTPS** when possible. For sites with invalid or expired SSL certificates, Nav0 shows a security warning page with a temporary bypass option."
      },
      {
        "q": "Can I check if a site's SSL certificate is valid?",
        "a": "Yes. Click the **lock icon** in the address bar to view SSL certificate details in an overlay panel. The icon also reflects whether the connection is secure, insecure, or has no certificate info."
      }
    ]
  },
  {
    "name": "Project",
    "questions": [
      {
        "q": "How does Nav0 make money?",
        "a": "Nav0 is a **community project**. It does not monetize users. There are no search engine deals, no advertising revenue, and no paid features."
      },
      {
        "q": "How does Nav0 improve without collecting telemetry?",
        "a": "Through:\n\n- Voluntary bug reports from users\n- GitHub issues and discussions\n- Community feedback\n- The developers' own daily usage"
      },
      {
        "q": "What happens if Nav0 gets acquired?",
        "a": "The code is open source under the MIT License. Even if the project changes hands, the community can **fork it** and continue development independently. Users can always build from a trusted commit."
      },
      {
        "q": "How can I contribute?",
        "a": "Visit the [Contributing guide](/guide/contributing) for details. You can contribute by reporting bugs, submitting pull requests, improving documentation, or simply using Nav0 and spreading the word."
      },
      {
        "q": "What license does Nav0 use?",
        "a": "Nav0 is licensed under the **MIT License** \u2014 one of the most permissive open-source licenses. You are free to use, modify, and distribute the software.\n\n\n**Still have questions?** Open an issue on [GitHub](https://github.com/nav0-org/nav0-browser/issues)."
      }
    ]
  }
];
