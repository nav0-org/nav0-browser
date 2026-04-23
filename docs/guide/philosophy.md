---
title: 'Nav0 Philosophy — Why We Built a Minimal Browser'
description: 'Nav0 exists because browsers got bloated. Read the philosophy behind building a browser that does one thing: browse the web.'
---

# Philosophy

Nav0 exists because modern browsers have lost their way.

What follows is not a marketing pitch. It's a set of convictions that guide every decision we make — what we build, what we refuse to build, and why. If you've ever felt that your browser is working against you rather than for you, this page explains why that feeling is justified and what Nav0 does differently.

## The State of Browsers Today

### Browsers Were Supposed to Be Simple

The original web browser was a window to the internet. You typed an address, the browser fetched the page, and it showed you the content. That was the entire relationship. The browser was a tool — a transparent pane of glass between you and the web.

That simplicity has been systematically dismantled.

### What Browsers Have Become

Today's major browsers are not tools. They are products — revenue-generating platforms designed to serve the business interests of the companies that make them. What was once a simple utility has been transformed into:

- **A data harvesting platform** — Your browsing history, search queries, device information, and behavioral patterns are collected, analyzed, and monetized. The browser that's supposed to help you access information is simultaneously extracting information from you.
- **An advertising delivery system** — New tab pages filled with "recommended" content, "trending" stories, and "personalized" suggestions are advertising dressed up as features. Every click generates revenue for the browser vendor.
- **A feature showcase for engagement metrics** — AI assistants, reading lists, collections, workspaces, tab groups, vertical tabs, sidebar panels — features are added not because users need them, but because each new feature is a new surface for data collection and a new talking point for marketing.
- **A gateway to paid services** — Built-in VPN upsells, premium password managers, sync subscriptions, cloud storage promotions. The browser has become a storefront.
- **A vehicle for someone else's business model** — When Google makes Chrome, the browser serves Google's advertising business. When Microsoft makes Edge, the browser serves Microsoft's cloud and AI business. The user's needs come second to the company's quarterly targets.

### The Feature Creep Epidemic

Every major browser now includes functionality that has nothing to do with browsing the web:

- **AI assistants** that read your pages, compose your text, and send your data to cloud servers for processing
- **News feeds** curated by algorithms optimized for engagement, not for informing you
- **Shopping helpers** that monitor your purchases and insert themselves into transactions
- **Cryptocurrency wallets** bundled into a web browser for no defensible reason
- **Built-in VPNs** that are usually paid upsells and route your traffic through the browser vendor's servers
- **Password managers** pushing subscription models for what should be a basic local feature
- **Reading lists, collections, workspaces, tab groups** — overlapping organizational features that add complexity without solving real problems

Each of these features has costs that users bear whether they use the feature or not: increased memory usage, larger attack surface, more background processes, more settings to manage, more updates that change behavior without asking. The browser gets heavier with every release while the core task — loading web pages — doesn't meaningfully improve.

Most users don't want any of this. They want to browse the web. They want pages to load fast. They want their privacy respected. They want their browser to stay out of the way.

### The Privacy Illusion

Perhaps the most cynical aspect of modern browsers is the way privacy is marketed as a feature while being undermined in practice.

Browser vendors advertise "privacy features" — tracking protection, cookie controls, private browsing modes — while simultaneously:

- **Collecting telemetry by default.** Every major browser phones home with usage data, crash reports, and behavioral analytics. Opting out requires navigating buried settings that often reset after updates.
- **Requiring accounts for basic features.** Want to sync your bookmarks? Create an account. Want to save your passwords? Sign in. Every account is a persistent identifier that links your browsing activity across devices and sessions.
- **Syncing data to their clouds.** Your bookmarks, history, passwords, and settings are uploaded to the vendor's servers. "Encrypted" sync still means your data exists on someone else's infrastructure, subject to their policies, their vulnerabilities, and their government compliance obligations.
- **Partnering with advertisers.** Google's Privacy Sandbox doesn't eliminate tracking — it moves tracking from third-party cookies into a first-party system that Google controls. The browser itself becomes the ad-targeting engine.

A truly private browser doesn't need privacy settings. It doesn't need a "privacy mode." It doesn't need toggles for telemetry because there is no telemetry to toggle. It just doesn't collect data. Period.

## Our Principles

Nav0 is built on five principles. These are not aspirations — they are hard constraints that govern what Nav0 is and what it will never become.

### 1. Do One Thing Well

Nav0 browses the web. That's it.

This principle comes from the Unix philosophy: write programs that do one thing and do it well. A browser's job is to fetch web pages, render them correctly, keep you safe while doing so, and get out of the way. Everything else is scope creep.

We don't try to be:

- **Your AI assistant.** If you want AI, open an AI tool in a tab. Your browser doesn't need to embed one, and it definitely doesn't need to read your pages to power one.
- **Your news source.** Algorithmic news feeds in browsers are engagement traps designed to keep you inside the vendor's ecosystem. If you want news, visit a news site.
- **Your password manager.** Dedicated password managers like Bitwarden and KeePass are purpose-built, independently audited, and cross-platform. A browser-integrated password manager is a convenience that comes with lock-in.
- **Your cryptocurrency wallet.** This one shouldn't need explaining, but apparently it does.
- **Your shopping companion.** Price comparison and coupon features monitor your purchases and share that data. Use a dedicated tool if you want this functionality.
- **Your writing tool.** "Help me write" features in browsers send the content of your web forms to cloud servers. Use a dedicated writing tool.

Use dedicated tools for dedicated tasks. A browser should browse. When a single application tries to do everything, it does nothing well and creates a single point of failure for your entire digital life.

### 2. Absence Over Presence

The best feature is often no feature at all.

This is the principle most at odds with how the software industry works. Companies are incentivized to add features because features drive marketing narratives, justify updates, and create new data collection surfaces. Removing features or choosing not to build them generates no press releases and no engagement metrics.

But every feature has costs, whether or not anyone uses it:

- **Code complexity.** More code means more potential bugs, more edge cases, more interactions between components that can fail in unexpected ways. The simplest code is no code.
- **Security surface.** Every feature is a potential attack vector. AI features that process page content, sync features that transmit data, extension APIs that expose browser internals — each one expands the attack surface. A feature that doesn't exist can't be exploited.
- **Maintenance burden.** Every feature must be updated, tested, and kept compatible with new web standards and OS versions. Features that seem simple at launch become permanent maintenance obligations.
- **User confusion.** Every feature adds settings, menu items, and behavioral complexity. Users shouldn't need to navigate through pages of options to make their browser behave sensibly.
- **Resource consumption.** Every feature uses memory, CPU time, and disk space. Background processes for sync, AI, and telemetry all consume resources even when the user isn't actively using them.

We add features only when they are absolutely necessary for core browsing. The bar is high: does this feature directly serve the task of loading and displaying web pages? If not, it doesn't belong in Nav0.

This means Nav0 will always have fewer features than Chrome, Edge, or Firefox. That's not a limitation. It's the entire point. The absence of unnecessary features is what makes Nav0 fast, secure, and trustworthy.

### 3. Local Over Cloud

Your data belongs on your device, under your control.

In Nav0:

- **Bookmarks:** stored locally in a database on your machine
- **History:** stored locally, never transmitted anywhere
- **Settings:** local configuration, not synced to any server
- **Downloads:** saved to your chosen folder, not logged remotely
- **Everything:** local. All of it.

Cloud sync is marketed as a convenience, and it is convenient. But convenience has costs that are rarely made explicit:

- **Account requirements.** Cloud sync requires an account, which means creating a persistent identifier that links all your activity. The account becomes a profile.
- **Data on someone else's servers.** Even with encryption, your data exists on infrastructure you don't control. It's subject to the vendor's terms of service, their data retention policies, their security practices, and the legal jurisdictions of the countries where their servers operate.
- **Server dependencies.** Cloud features break when servers go down, when APIs change, when companies pivot their business model. Local data doesn't have dependencies.
- **Privacy risks.** Data that doesn't leave your device can't be breached from a remote server. Data that isn't collected can't be subpoenaed. Data that doesn't exist in a cloud can't be sold, shared, or leaked.

The trade-off is real: Nav0 doesn't sync your bookmarks across devices. If you need cross-device access, you'll need to export and import manually, or use a third-party sync solution of your choosing. We believe this trade-off is worth it. Your data's security and your privacy are more important than the convenience of automatic sync.

### 4. Transparent Over Proprietary

Everything about Nav0 is open. Not partially open. Not "open core." Completely open.

- **Source code:** publicly available on GitHub. Every line of code that runs in your browser can be read, audited, and verified by anyone.
- **Development process:** public issue tracker, public pull requests, public discussions. Decisions are made in the open.
- **Roadmap:** public. You can see what we're planning and why.
- **Decision rationale:** public. When we make a significant decision, the reasoning is documented and visible.

This matters because trust in software must be verifiable. When a browser vendor says "we don't collect your data," you have two options: take their word for it, or verify it yourself. With proprietary browsers, you can only do the former. With Nav0, you can do the latter.

Open source also provides a structural guarantee against enshittification. If Nav0 ever abandons its principles — if a future maintainer adds telemetry or inserts advertising — the community can fork the project and continue from the last trustworthy version. The code belongs to everyone. The project is bigger than any individual or organization.

This transparency extends to what we don't do. Nav0 has:

- No obfuscated code
- No binary blobs with unknown functionality
- No proprietary protocols
- No hidden network requests
- No undocumented data collection

If you can't see how your software works, you can't trust it. Full stop.

### 5. User Over User Data

We value users, not user data. This distinction defines everything about how Nav0 operates.

Most browser vendors have a fundamental conflict of interest. Their revenue depends on knowing things about you — what you search for, what you buy, what you read, where you go. The more they know, the more valuable their advertising inventory becomes. This creates an incentive structure where user experience and user surveillance are permanently in tension.

Nav0 has no such conflict because we have no advertising business, no data brokerage, and no analytics platform.

We succeed when:

- **Users have a fast, responsive browser** that doesn't waste their time or their hardware's resources
- **Users maintain their privacy** without needing to configure anything, disable anything, or opt out of anything
- **Users trust their tools** because those tools are transparent, predictable, and honest about what they do

We don't succeed by:

- Collecting user metrics to optimize engagement
- Building user profiles to sell targeted advertising
- Monetizing user attention through algorithmic content
- Creating lock-in through proprietary sync and account systems
- Growing a user base to impress investors or acquirers

Nav0 is free. Nav0 is open source. Nav0 collects nothing. These aren't marketing claims — they are architectural facts that anyone can verify by reading the source code.

## What We Believe

### About Privacy

Privacy is not a premium feature you unlock by paying for a subscription. Privacy is not a toggle buried in settings that resets after every update. Privacy is not something you should have to opt into. Privacy is not a competitive advantage for marketing materials.

Privacy is a right.

Nav0 treats privacy as the default state, not an afterthought. We don't collect data and then promise to protect it. We simply don't collect data. There is nothing to protect because there is nothing to collect.

This is not a technical limitation — it's a design choice. We could add telemetry. We could add crash reporting. We could add usage analytics. We choose not to because we believe your relationship with the web is none of our business.

### About Simplicity

Simplicity is frequently misunderstood. When we say Nav0 is simple, we don't mean:

- **Lacking capability.** Nav0 runs on Chromium. It renders the modern web correctly. It supports complex web applications, streaming media, and interactive content. The engine is powerful; the interface is minimal.
- **Ugly or unpolished.** Simplicity is not the absence of design. It's the result of careful design decisions about what to include and what to leave out. A clean interface is the product of discipline, not laziness.
- **Incomplete.** Nav0 isn't a work in progress that will eventually grow into a full-featured browser. The minimal feature set is the finished product. We're not building toward complexity; we're maintaining simplicity.

Simplicity means:

- **Focused.** Every element of the interface serves a clear purpose related to browsing the web. There are no distractions, no promotional content, no features competing for your attention.
- **Understandable.** You shouldn't need documentation to use a browser. Nav0's interface is self-explanatory because there's nothing extraneous to confuse you.
- **Maintainable.** Simple software is easier to audit, easier to debug, and less likely to contain hidden defects. Fewer moving parts means fewer things that can break.
- **Trustworthy.** Simple software is easier to understand. Software you understand is software you can trust. Complexity is the enemy of trust.

### About Open Source

Open source is more than a development methodology or a licensing choice. It's a statement about the relationship between software and the people who use it.

Open source means:

- **Transparency.** The code is visible. The development process is visible. There's nowhere to hide tracking code, data collection, or anti-user behavior.
- **Trust through verification.** "Don't trust us — verify" is not a slogan. It's a genuine invitation. We expect users and security researchers to audit our code. We welcome it.
- **Community ownership.** No single entity can take Nav0 away from its users. The code is published under the MIT License. If the project changes direction, the community can fork it. This structural guarantee against enshittification is one of the most important properties of open source software.
- **Permanence.** Companies get acquired, pivot, or shut down. Open source projects survive because the code belongs to everyone. A trusted commit will always be available to build from, regardless of what happens to the project's maintainers.

### About the Web

We believe the web should be open, accessible, and free from gatekeepers. A browser is the lens through which billions of people experience the internet. That lens should be clear, neutral, and controlled by the user — not by an advertising company, a platform vendor, or an AI corporation.

The browser should not decide what content to show you on startup. It should not recommend articles, products, or services. It should not insert itself between you and the websites you choose to visit. It should not analyze your behavior to predict what you'll do next. It should load the page you asked for, render it correctly, and wait for your next instruction.

That's what a browser is. That's what Nav0 does.

## What Nav0 Deliberately Excludes

Choosing what not to build is as important as choosing what to build. These exclusions are not temporary gaps in our feature list — they are permanent, principled decisions.

| Feature                         | Why It's Excluded                                                                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **User accounts / sign-in**     | Accounts create persistent identifiers. No account means no profile, no tracking across sessions, no data to breach.                                               |
| **Sync services**               | Sync requires cloud infrastructure, accounts, and server-side data storage. All of these conflict with local-first principles.                                     |
| **AI assistants**               | AI features send page content to cloud servers, consume resources, add complexity, and create new data collection vectors. Use AI tools directly if you need them. |
| **News feeds**                  | Algorithmic content feeds are engagement traps designed to keep you in the browser vendor's ecosystem. They are advertising, not a feature.                        |
| **Cryptocurrency wallets**      | A browser is not a financial application. Bundling a wallet adds attack surface and complexity for a feature unrelated to browsing.                                |
| **Built-in VPN**                | Browser VPNs are typically paid upsells that route your traffic through the vendor's servers. Use a dedicated, independently audited VPN if you need one.          |
| **Telemetry / analytics**       | We don't collect usage data. Not "anonymized" data, not "optional" data, not "aggregated" data. Zero.                                                              |
| **Shopping / coupon features**  | These features monitor your purchases and insert the browser vendor into your transactions. They exist to monetize your browsing, not to help you.                 |
| **Reading lists / collections** | Bookmarks and bookmark folders handle this. We don't need three different organizational features when one works fine.                                             |
| **Sidebar panels**              | Sidebars are screen real estate claimed by the browser for features unrelated to the page you're viewing. Nav0 maximizes the space for actual web content.         |

## The Nav0 Way

### We Say No

The most important word in Nav0's vocabulary is "no."

We say no to features that:

- Collect data, whether the user knows about it or not
- Require accounts or persistent identifiers
- Add complexity without directly improving the core browsing experience
- Serve business interests over user interests
- Follow industry trends without clear user benefit
- Increase the attack surface without corresponding security value
- Consume resources for functionality unrelated to browsing

Saying no is difficult in an industry that measures progress by feature count. But the discipline to say no is what keeps Nav0 minimal, fast, and trustworthy. Every feature we decline is bloat we don't ship, a vulnerability we don't create, and complexity we don't impose on our users.

### We Say Yes

We say yes to improvements that:

- Make page loading measurably faster
- Increase security against real, documented threats
- Reduce memory usage and CPU consumption
- Fix actual bugs reported by actual users
- Improve web standards compliance
- Make the browser more accessible
- Serve clearly articulated user needs with minimal added complexity

### We Stay Focused

The web evolves constantly. New standards emerge. Security threats change. Hardware capabilities advance. A browser must adapt to serve its users on the modern web.

But adapting to change is not the same as chasing trends. Adapting means:

- Supporting new web standards so sites render correctly
- Updating security measures against emerging threats
- Optimizing performance for modern hardware
- Fixing compatibility issues as the web evolves

Adapting does not mean:

- Adding every feature competitors ship
- Following hype cycles (AI, crypto, metaverse, whatever's next)
- Copying the design decisions of browsers with different values
- Expanding scope beyond core browsing

Nav0 will evolve, but it will evolve in its own direction — toward better browsing, not toward more features.

## How We Make Decisions

Every feature request, pull request, and design decision at Nav0 is evaluated against a simple framework:

1. **Does this serve core browsing?** If the feature isn't directly related to loading, rendering, and navigating web pages, it probably doesn't belong in Nav0.
2. **Does this respect user privacy?** If the feature requires collecting, transmitting, or processing user data, it doesn't belong in Nav0.
3. **Does this add justified complexity?** Every feature adds complexity. Is the benefit to the user clearly worth the added complexity, maintenance burden, and attack surface?
4. **Can the user achieve this with an existing tool?** If a dedicated tool already handles this task well, the browser doesn't need to duplicate it.
5. **Would removing this feature make Nav0 worse at browsing?** If removing a proposed feature wouldn't affect the core browsing experience, the feature isn't essential.

If a feature can't pass all five questions, we don't build it. This framework has served us well. It will continue to guide Nav0's development for as long as the project exists.

## Join Us

Nav0 is built by people who were tired of bloated, invasive browsers and decided to build something better. If you share that frustration, you're welcome here.

- **Use Nav0.** The simplest and most important contribution. Every user who switches to Nav0 is one fewer profile being built by an advertising company.
- **Report bugs.** Found something broken? Tell us. Bug reports from real users are how we improve without telemetry.
- **Contribute code.** Nav0 is open source and welcomes contributions. Read our [Contributing Guide](/guide/contributing) to get started.
- **Spread the word.** Tell others about Nav0. The web needs more people who care about privacy and simplicity.
- **Audit the code.** Security researchers, privacy advocates, and curious developers — we want you looking at our code. Transparency only works if people actually look.

The web deserves a better browser. One that works for its users instead of against them. One that respects privacy as a right instead of marketing it as a feature. One that stays simple in a world that rewards complexity.

Let's build that browser.

---

_"Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away."_
— Antoine de Saint-Exupéry
