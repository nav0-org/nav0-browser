---
title: "Big Tech Owns Your Browser"
description: "Google, Microsoft, and Apple control how billions of people access the web. When your browser is made by an ad company or a platform gatekeeper, whose interests does it really serve?"
date: 2026-02-04
author: nav0 team
tags: [big-tech, browsers, open-web, privacy]
---

# Big Tech Owns Your Browser

<p style="color: var(--vp-c-text-2); font-size: 0.9rem;">February 4, 2026 &middot; 8 min read</p>

There are roughly 5 billion internet users worldwide. The vast majority of them access the web through a browser made by one of four companies: Google, Apple, Microsoft, or the Mozilla Foundation (which gets over 80% of its revenue from Google). That's it. Four organizations mediate almost the entire world's relationship with the internet.

This concentration of power has consequences that go far beyond which browser renders CSS a pixel faster.

## Follow the Money

To understand why browsers behave the way they do, you need to understand how they're funded.

### Google Chrome

Chrome is the world's dominant browser with roughly 65% market share. Google doesn't charge for Chrome because Chrome isn't the product. **You are.**

Google's revenue in 2025 exceeded $340 billion, with the vast majority coming from advertising. Chrome exists to feed Google's advertising machine. It's the front door to Google Search, which is the engine behind Google Ads. Chrome's default search engine, default homepage, and integrated Google services all funnel user attention and data back to Google's core business.

The US Department of Justice's antitrust case against Google revealed that Google pays Apple approximately $20 billion per year to remain the default search engine in Safari. Google pays Mozilla around $500 million annually for the same privilege in Firefox. These aren't charitable donations. Each click through a default search engine generates advertising revenue.

Chrome's design decisions consistently favor Google's interests:
- **Manifest V3** changed the extension API in ways that limit the effectiveness of ad blockers, directly protecting Google's advertising revenue.
- **Privacy Sandbox and Topics API** replaced third-party cookies not with actual privacy, but with a Google-controlled system that still enables ad targeting, just with Google as the gatekeeper.
- **Chrome sign-in** was made increasingly aggressive over the years, linking browser usage to Google accounts and enabling cross-device tracking.

### Microsoft Edge

Edge ships as the default browser on every Windows installation, covering over 70% of desktop computers worldwide. Microsoft uses this position aggressively.

Edge is deeply integrated with Microsoft's services: Bing search, Microsoft 365, Copilot AI, Microsoft Rewards. Default settings push users toward Microsoft's ecosystem at every opportunity. The browser sends telemetry data to Microsoft, includes shopping features that monitor your purchases, and uses Bing's API in ways that transmit your browsing activity to Microsoft's servers.

Microsoft's incentives are similar to Google's. Bing's advertising revenue depends on search volume, and Edge is the pipeline. The "recommended" content on Edge's new tab page is advertising. The "collections" and "shopping" features monetize your browsing session directly.

Windows makes it intentionally difficult to change the default browser. When you click a link in a Microsoft app, it opens in Edge regardless of your system default. The "default apps" settings have become progressively more confusing with each Windows update. This isn't a bug. It's a strategy to maintain Edge's market share through platform control rather than product quality.

### Apple Safari

Safari is the default browser on every iPhone, iPad, and Mac. Apple's control is arguably the most complete because Apple controls the entire hardware and software stack.

On iOS, Safari isn't just the default browser, it's the **only** browser engine allowed. Chrome, Firefox, Brave, and every other "browser" on iOS are required to use Safari's WebKit engine underneath. Apple's App Store policies prohibit alternative browser engines, meaning there is no genuine browser competition on the platform used by over a billion people.

Apple positions Safari as the privacy-focused option, and in some ways it is. Safari blocks third-party cookies by default and includes Intelligent Tracking Prevention. But Apple's privacy stance also serves its business interests. By limiting tracking on Safari, Apple disadvantages competing ad networks (primarily Google and Meta) while building its own growing advertising business through Apple Search Ads and the App Store.

Safari's development has also been criticized for lagging behind web standards. Features that web developers need, Progressive Web Apps, push notifications, and various modern APIs, arrived in Safari years after other browsers. Critics argue this isn't just about caution. It's about protecting the App Store. If web apps could do everything native apps do, developers wouldn't need to pay Apple's 30% commission.

### Mozilla Firefox

Firefox is the independent alternative, maintained by the nonprofit Mozilla Foundation. But "independent" requires an asterisk.

Mozilla receives approximately 80-85% of its revenue from search engine deals, primarily with Google. Google pays Mozilla to be the default search engine in Firefox. This means Firefox's financial survival depends on Google, the very company whose dominance Firefox is supposed to counterbalance.

This dependency has visible effects. Mozilla has been cautious about implementing features that would too aggressively block Google's tracking. The organization has also diversified into VPN services, email relay, and other products, but none have achieved the scale needed to replace Google's funding.

Firefox's market share has declined from over 30% in its peak years to under 3% today. With declining share comes declining leverage in search engine negotiations, creating a concerning feedback loop.

## The Engine Problem

Market share numbers understate the concentration of power because most browsers share the same underlying engine.

**Chromium**, Google's open-source browser engine, powers not just Chrome but also Edge, Opera, Brave, Vivaldi, Samsung Internet, and dozens of other browsers. Combined, Chromium-based browsers account for approximately 80-85% of all web browsing.

This means Google effectively controls the web's rendering engine. When Google decides to change how Chromium handles extensions, ads, or web standards, the entire ecosystem follows. Individual browsers can modify Chromium's behavior at the margins, but the fundamental architecture, priorities, and direction are set by Google.

The consequences are real:
- When Google deprecated Manifest V2 extensions in Chromium, every Chromium-based browser had to adapt or fork the entire engine (a massive ongoing maintenance burden).
- When Google adds new APIs to Chromium that serve its advertising interests, they become de facto web standards through sheer market dominance.
- When Google decides which web features to prioritize, those priorities shape what's possible on the web for everyone.

The only meaningful alternatives to Chromium are WebKit (controlled by Apple) and Gecko (maintained by Mozilla, funded by Google). This is not a healthy ecosystem.

## What Platform Control Means for Users

When your browser is made by a company with other business interests, those interests shape every decision:

### You See What They Want You to See

The default new tab page in Chrome shows Google's services. Edge shows Microsoft's news feed and ads. Safari shows Apple's suggestions. These aren't neutral starting points. They're billboards for the vendor's ecosystem.

Default search engines are chosen based on revenue deals, not user preference. Default bookmarks, suggested sites, and "trending" content are all influenced by business relationships.

### Your Data Fuels Their Business

Chrome sends browsing data to Google. Edge sends telemetry to Microsoft. Even when you opt out of visible features, background data collection often continues. Browser vendors have been caught re-enabling telemetry after updates, adding new data collection without clear disclosure, and using dark patterns in settings to discourage opting out.

### You Can't Truly Leave

Platform lock-in is deliberate. Switching from Chrome means losing easy access to Google's integrated services. Switching from Edge on Windows means fighting the OS itself. Switching from Safari on iOS is literally impossible at the engine level.

Bookmarks, passwords, and browsing history are stored in proprietary formats designed for export to the vendor's own sync service, not to competitors. Cross-browser migration tools exist but are consistently incomplete.

### Standards Are Shaped by Business Interests

Google's position controlling both the dominant browser and the dominant search engine gives it enormous influence over web standards. Features that benefit Google's business get implemented quickly in Chromium. Features that might undermine Google's business get deprioritized or redesigned to preserve Google's advantages.

The Privacy Sandbox is a perfect example: Google framed the end of third-party cookies as a privacy win, but the replacement system keeps Google at the center of ad targeting. The privacy improvement is real but modest, and it conveniently disadvantages Google's advertising competitors more than Google itself.

## The Case for Independent Browsers

The web is too important to be controlled by a few companies with advertising and platform businesses. An independent browser offers something fundamentally different:

**No conflicting interests.** When the browser maker doesn't run an ad network, there's no incentive to optimize for data collection or to weaken privacy protections that might hurt ad revenue.

**No platform lock-in.** An independent browser works the same on every platform and doesn't push you toward a specific ecosystem of services.

**No gatekeeping.** When the browser isn't controlled by a company that also runs an app store or a search engine, decisions about features and standards are driven by user needs, not business strategy.

**Actual transparency.** Open-source code, clear privacy policies, and no business relationships that create hidden conflicts of interest.

## nav0's Position

nav0 exists because we believe the browser should be a neutral tool, not a data pipeline for an advertising company, not a funnel for a platform ecosystem, and not a vehicle for someone else's business model.

We don't make money from search engine deals. We don't run an ad network. We don't operate a cloud platform. We build a browser, and that's all we do.

nav0 is open source, so you can verify every claim we make. It collects zero telemetry, so there's no data to monetize. It doesn't include AI features, VPN services, news feeds, or shopping tools because those are products for someone else's business, not features for your browser.

The browser you use determines how you experience the entire internet. It should answer to you, not to shareholders, advertisers, or platform strategists.

Choose a browser that's on your side. [Get started with nav0](/guide/getting-started).

---

*nav0 is a minimal, open-source browser built on one principle: your browser should work for you, not for big tech. Zero telemetry. Zero bloat. Zero conflicts of interest. [Learn more](/guide/philosophy).*
