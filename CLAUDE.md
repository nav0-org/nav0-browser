# CLAUDE.md - Nav0 Browser

## Project Overview

Nav0 is a minimal, privacy-focused web browser built on Electron. The philosophy is **"Browse. Nothing More."** — a lightweight, open-source browser with zero telemetry, zero tracking, and zero data collection.

- **Version**: 0.2.9
- **License**: MIT
- **Author**: Ketan Patil
- **Repo**: https://github.com/nav0-org/nav0-browser
- **Docs site**: lives in a separate repo at https://github.com/nav0-org/website

## Quick Reference

```bash
npm run start          # Run in development mode (electron-forge start)
npm run make           # Build distributable packages
npm run package        # Package without creating distributables
npm run lint           # Run all linters (ts, css, html)
npm run lint:ts        # Run ESLint on .ts/.tsx files
npm run lint:css       # Run Stylelint on .css files
npm run lint:html      # Run HTMLHint on src/**/*.html
npm run format         # Run Prettier across the repo
npm run format:check   # Verify formatting without writing
npm run test:perf      # Run Puppeteer-based performance tests
npm run test:data      # Run data consumption tests
npm run rebuild        # Rebuild native modules (better-sqlite3)
```

Husky runs `lint-staged` on every commit (see `package.json` → `lint-staged`), so staged files get ESLint/Stylelint/HTMLHint + Prettier automatically.

## Architecture

### Multi-Process Model (Electron)

```
Main Process (src/main/)          Renderer Process (src/renderer/)
├── Browser managers              ├── Browser layout (tabs, nav, find, perms)
├── Database (SQLite)             ├── Built-in pages (history, bookmarks, …)
├── Settings enforcement          ├── Unified overlay (command-k, alerts, …)
├── Ad blocker                    ├── Display-capture picker
├── CLI args & installer          └── Common utilities
├── Session restore
└── Window/tab lifecycle
        ↕ IPC via preload scripts (src/preload/)
```

- **Main process** (`src/main/`): System-level operations — window management, database, settings, downloads, permissions, ad blocking, SSL, notifications, session restore, CLI handling
- **Renderer process** (`src/renderer/`): All UI — browser chrome, built-in pages, the unified overlay, the display-capture picker
- **Preload scripts** (`src/preload/`): IPC bridges exposing safe APIs to renderer via `contextBridge`

### Manager Pattern

Every feature is encapsulated in a manager class:

| Manager                  | Location                          | Purpose                                           |
| ------------------------ | --------------------------------- | ------------------------------------------------- |
| `AppWindowManager`       | `src/main/browser/`               | Window lifecycle, multi-window support            |
| `AppWindow`              | `src/main/browser/`               | Single window with tabs and overlays              |
| `Tab`                    | `src/main/browser/`               | Individual tab (WebContentsView)                  |
| `AppMenuManager`         | `src/main/browser/`               | Native application menu (File/Edit/View/…)        |
| `SessionManager`         | `src/main/browser/`               | Persists/restores open windows + tabs on relaunch |
| `UnifiedOverlayManager`  | `src/main/browser/`               | Hosts all overlay panels in one WebContentsView   |
| `NotificationManager`    | `src/main/browser/`               | Web Notification API with per-origin gating       |
| `DatabaseManager`        | `src/main/database/`              | SQLite connection management (normal + private)   |
| `SchemaManager`          | `src/main/database/`              | Database schema versioning                        |
| `DataStoreManager`       | `src/main/database/`              | electron-store key-value wrapper                  |
| `DownloadManager`        | `src/main/browser/`               | Download tracking and control                     |
| `BookmarkManager`        | `src/main/browser/`               | Bookmark CRUD operations                          |
| `BrowsingHistoryManager` | `src/main/browser/`               | Browsing history CRUD                             |
| `PermissionManager`      | `src/main/browser/`               | Site permission policies + prompts                |
| `SettingsEnforcer`       | `src/main/settings/`              | Applies user preferences to sessions              |
| `ReaderModeManager`      | `src/main/browser/`               | Reader mode extraction (@mozilla/readability)     |
| `SSLManager`             | `src/main/browser/`               | Certificate validation + interstitial page        |
| `FindInPageManager`      | `src/main/browser/`               | In-page text search                               |
| `SearchEngine`           | `src/main/web/`                   | Selects the active search engine + suggestions    |
| `CLIInstaller`           | `src/main/cli/`                   | Installs `nav0` shim into PATH (macOS/Windows)    |
| UA switcher              | `src/main/browser/ua-switcher.ts` | Strips "Electron/…" from UA + aligns Client Hints |

### Unified overlay system

All the modal-ish UI (command palette, options menu, SSL info, issue report, alerts, basic auth, URL autocomplete dropdown) lives in a single overlay `WebContentsView` per window instead of one renderer per overlay:

- Main process: `src/main/browser/unified-overlay-manager.ts` + handlers in `src/main/browser/overlay-handlers/`
  - `command-k-handler.ts`, `command-o-handler.ts`, `options-menu-handler.ts`, `issue-report-handler.ts`, `ssl-info-handler.ts`, `alert-handler.ts`, `basic-auth-handler.ts`, `url-autocomplete-handler.ts`
- Renderer: `src/renderer/overlay/` with one panel per overlay in `src/renderer/overlay/panels/`

When adding a new overlay, add a handler in `overlay-handlers/`, a panel in `renderer/overlay/panels/`, register it in `unified-overlay-manager.ts` and `renderer/overlay/index.ts`, and wire IPC channels in `app-constants.ts`. You do **not** need a new webpack entry point.

The display-capture picker is the one exception — it's a separate small renderer at `src/renderer/pages/display-capture-picker/` with its own preload (`src/preload/display-capture-picker-preload.ts`) because it has to load synchronously during `desktopCapturer` handling.

### IPC Communication

All IPC channels are defined as string constants in `src/constants/app-constants.ts`:

- `RendererToMainEventsForBrowserIPC` — renderer-initiated browser actions
- `MainToRendererEventsForBrowserIPC` — main process responses to renderer
- `RendererToMainEventsForDataStoreIPC` — data operations (CRUD for bookmarks, history, etc.)
- Plus `ElectronAppEvents` and `WebContentsEvents` for typed Electron event names

Always use these constants for IPC channel names — never hardcode strings.

### Database Architecture

- **Engine**: better-sqlite3 (native SQLite bindings)
- **Dual database**: a persistent DB on disk and a separate **in-memory** DB for private browsing — private data never touches disk
  - On startup, `DatabaseManager` deletes any leftover `private-database.db` from old builds
- **Schemas** defined in `src/main/database/schema/`:
  - `bookmark-schema.ts`
  - `browsing-history-schema.ts`
  - `download-schema.ts`
  - `permission-schema.ts`

### Sessions / partitions

Defined in `PartitionNames` (`src/constants/app-constants.ts`):

- `persist:browsertabs` — the normal browsing session (persisted to `<userData>/Partitions/browsertabs/`)
- `private` — the private window session, intentionally **without** the `persist:` prefix so Chromium keeps it in memory only

Startup also wipes any leftover `<userData>/Partitions/private/` directory from older builds that used a persistent private partition.

### Settings System

- Settings interface: `BrowserSettings` in `src/types/settings-types.ts` (~80+ configurable options)
- Stored via `electron-store` (DataStoreManager)
- Applied centrally through `SettingsEnforcer` which handles:
  - Cookie policies, proxy config, user agent (in concert with `ua-switcher`)
  - Ad blocker toggle, auto-deletion scheduling, popup policy, keyboard shortcuts

### Session restore

`SessionManager` (`src/main/browser/session-manager.ts`) snapshots the open windows + tabs to the `session-state` key in `electron-store` every 60s and on quit. The recently-closed list and closed-windows list are also stored there (`closed-windows` key, `ClosedTabRecord` / `ClosedWindowRecord` types in `app-constants.ts`).

### CLI launch flags

`src/main/cli/cli-args.ts` parses Nav0-specific flags out of `process.argv`:

- `-p`, `--private` — open in a private window
- `-u <url> [<url> …]`, `--url <url> [<url> …]` — open URLs as tabs in a new window

A single-instance lock in `src/main/index.ts` routes subsequent `nav0 …` invocations to the running instance via the `second-instance` event, so `nav0 -u example.com` from a second terminal opens a tab in the existing app rather than spawning a duplicate.

`CLIInstaller` (`src/main/cli/cli-installer.ts`) installs the shim:

- macOS: symlinks `/usr/local/bin/nav0` → the app binary (asks for sudo via AppleScript)
- Windows: drops `nav0.cmd` into `%LocalAppData%\Microsoft\WindowsApps`

## Source Structure

```
src/
├── main/                          # Electron main process
│   ├── index.ts                   # App entry: error handlers, single-instance lock, CLI dispatch
│   ├── test-control-server.ts     # Tiny HTTP server enabled when REMOTE_DEBUGGING_PORT is set (perf tests)
│   ├── browser/                   # Core browser managers
│   │   ├── app-window-manager.ts
│   │   ├── app-window.ts
│   │   ├── app-menu-manager.ts
│   │   ├── tab.ts
│   │   ├── session-manager.ts
│   │   ├── unified-overlay-manager.ts
│   │   ├── notification-manager.ts
│   │   ├── download-manager.ts
│   │   ├── bookmark-manager.ts
│   │   ├── browsing-history-manager.ts
│   │   ├── permission-manager.ts
│   │   ├── reader-mode-manager.ts
│   │   ├── find-in-page-manager.ts
│   │   ├── ssl-manager.ts
│   │   ├── ssl-warning-page.{ts,html}
│   │   ├── ua-switcher.ts         # Strips "Electron/…" from UA + aligns Client Hints
│   │   ├── utils.ts
│   │   ├── error-page/            # Custom error page shown on navigation failure
│   │   └── overlay-handlers/      # One handler per overlay panel (8 files)
│   ├── cli/                       # CLI flag parsing + PATH installer
│   │   ├── cli-args.ts
│   │   └── cli-installer.ts
│   ├── database/                  # SQLite layer + schemas
│   │   ├── database-manager.ts
│   │   ├── schema-manager.ts
│   │   ├── data-store-manager.ts
│   │   └── schema/
│   ├── settings/                  # Settings enforcement
│   │   └── settings-enforcer.ts
│   ├── web/                       # Search engine configuration
│   │   └── search-engine.ts
│   └── ad-blocker/                # Domain lists, URL patterns, CSS injection
│       └── ad-block-lists.ts
├── renderer/                      # Electron renderer process
│   ├── browser-layout/            # Main browser UI (tabs, nav bar, find-in-page, permission strip, autocomplete)
│   ├── overlay/                   # Unified overlay window
│   │   ├── index.{html,ts,css}
│   │   └── panels/                # One panel per overlay type:
│   │       ├── command-k/
│   │       ├── command-o/
│   │       ├── options-menu/
│   │       ├── issue-report/
│   │       ├── ssl-info/
│   │       ├── alert/             #   alert / confirm / prompt
│   │       ├── basic-auth/
│   │       └── url-autocomplete/
│   ├── pages/                     # Built-in pages
│   │   ├── about/
│   │   ├── bookmarks/
│   │   ├── browser-settings/
│   │   ├── display-capture-picker/  # screen/window picker for getDisplayMedia
│   │   ├── downloads/
│   │   ├── history/
│   │   └── new-tab/
│   ├── web-content/               # Web page rendering host
│   ├── common/                    # Shared utilities (api wrappers, formatters, html helpers, file types)
│   ├── assets/                    # Images, icons, logos
│   └── styles/                    # Shared CSS (global.css, notification.css)
├── preload/                       # IPC bridge scripts
│   ├── internals-api.ts           # DataStoreAPI + BrowserAPI for internal pages and the overlay
│   ├── externals-api.ts           # Externally facing API for web content
│   ├── web-content-preload.ts     # Preload for web-content host
│   └── display-capture-picker-preload.ts  # Preload specific to the picker
├── types/                         # Shared TypeScript interfaces
│   ├── bookmark-record.ts
│   ├── browsing-history-record.ts
│   ├── download-record.ts
│   ├── dialog-types.ts            # alert/confirm/prompt + basic-auth payloads
│   └── settings-types.ts
└── constants/
    ├── app-constants.ts           # IPC channels, in-app URLs, partition names, data store keys, etc.
    └── data-constants.ts          # Domain → website-category map for bookmarks/history grouping

tests/
└── performance/                   # Puppeteer-based tests
    ├── browser-perf-test.js       # CPU/memory/frame benchmarks (10-50 tabs)
    ├── browser-perf-test-mac.js   # macOS-specific perf harness
    ├── chrome-harness.js          # Chrome baseline used for comparison
    ├── data-consumption-test.js   # Network usage metrics
    └── reports/                   # Generated test reports

.github/workflows/
└── build-electron.yml             # Multi-platform release build
```

Documentation (VitePress site, blog posts, release notes) lives in the separate **nav0-org/website** repo — there is no `docs/` directory in this repo anymore.

## Tech Stack

| Component       | Technology                               | Version |
| --------------- | ---------------------------------------- | ------- |
| Runtime         | Electron                                 | 41.0.0  |
| Language        | TypeScript                               | 5.8.3   |
| Bundler         | Webpack (via @electron-forge)            | —       |
| Build Tool      | Electron Forge                           | 7.10.x  |
| Database        | better-sqlite3                           | 12.9.0  |
| Key-Value Store | electron-store                           | 8.2.0   |
| Reader Mode     | @mozilla/readability                     | 0.6.0   |
| PDF parsing     | pdf-parse                                | 1.1.1   |
| Markdown        | marked                                   | 15.0.11 |
| UUIDs           | uuid                                     | 11.1.0  |
| Promises        | bluebird                                 | 3.7.2   |
| Icons           | Lucide                                   | 0.503.0 |
| Testing         | Puppeteer Core                           | 24.42.x |
| Lint / Format   | ESLint + Stylelint + HTMLHint + Prettier | —       |
| Git hooks       | Husky + lint-staged                      | —       |

## Build & Configuration

### Webpack

- `webpack.main.config.ts` — Main process bundling
- `webpack.renderer.config.ts` — Renderer bundling
- `webpack.rules.ts` — Shared loader rules (includes `@vercel/webpack-asset-relocator-loader` for native modules)
- `webpack.plugins.ts` — Shared plugins (Fork TS Checker for type checking)

### Electron Forge (`forge.config.ts`)

- **Makers**: DMG (macOS), ZIP (macOS), DEB (Linux), RPM (Linux), Squirrel (Windows)
- **Fuses** (`@electron-forge/plugin-fuses`):
  - `RunAsNode` off
  - `EnableCookieEncryption` is **off on macOS** (no Developer ID signing → OSCrypt can't persist its key in the Keychain → users get logged out on next launch) and on everywhere else
  - `EnableNodeOptionsEnvironmentVariable` / `EnableNodeCliInspectArguments` off
  - `EnableEmbeddedAsarIntegrityValidation` + `OnlyLoadAppFromAsar` on
- **ESM Workaround**: `packageAfterPrune` hook rewrites `package.json` `main` from `.webpack/main` to `.webpack/main/index.js` because Electron 35+ uses ESM resolution and rejects the directory form.
- **Native rebuild**: `better-sqlite3` rebuilt via `electron-rebuild`
- **Linux binary name**: lowercase `nav0` (the deb/rpm makers require lowercase).

### Webpack renderer entry points

Defined in `forge.config.ts`. After the overlay consolidation, the entries are:

1. `browser_layout` — main browser chrome
2. `bookmarks`, `browser_settings`, `downloads`, `history`, `new_tab`, `about` — built-in pages
3. `web_content` — host for web pages
4. `overlay` — unified overlay (replaces the old `command_k`, `command_o`, `options_menu`, `permission_prompt`, `issue_report`, `ssl_info`, `find_in_page` entries)
5. `display_capture_picker` — the screen/window source picker

When adding a new overlay, **do not** add a new entry — register it inside the existing `overlay` entry (see "Unified overlay system" above). New top-level pages still get their own entry.

### TypeScript (`tsconfig.json`)

- Target: ES6
- Module: CommonJS
- Strict: `noImplicitAny: true`

### Linting & formatting

- ESLint: `.eslintrc.json` — `@typescript-eslint/parser`, extends `eslint:recommended`, `@typescript-eslint/recommended`, `plugin:import/recommended`, `plugin:import/electron`, `plugin:import/typescript`, and `prettier` (so format rules don't fight)
- Prettier: `.prettierrc.json` — 100 col, single quotes, semis, trailing commas (es5), LF
- Stylelint: `.stylelintrc.json` — extends `stylelint-config-standard` with most opinionated rules turned off
- HTMLHint: `.htmlhintrc`
- Husky pre-commit hook (`.husky/pre-commit`) runs `npx lint-staged`, which runs the relevant linter + Prettier on staged files (see `lint-staged` block in `package.json`).

## CI/CD

### GitHub Actions (`.github/workflows/`)

- **`build-electron.yml`**: Multi-platform build matrix
  - macOS 15 (x64) + macOS Latest (arm64) → DMG
  - Ubuntu Latest (x64) → DEB + RPM
  - Windows Latest (x64) → EXE
  - Node 22, Python 3.11
  - Trigger: `workflow_dispatch` with optional version override + `prerelease` toggle

Documentation deployment lives in the **nav0-org/website** repo and is not built from this one.

## Design Principles

When contributing to Nav0, always keep these principles in mind:

1. **Privacy-first**: Zero telemetry, zero tracking, zero data collection. Never add analytics, fingerprinting, or any form of user tracking.
2. **Minimal**: Do one thing well — browse the web. No bloat, no AI features in the browser, no social features, no crypto wallets.
3. **Local-only storage**: All user data stays on the device. No cloud sync, no accounts.
4. **Open and auditable**: All code is MIT-licensed and transparent.
5. **Performance-conscious**: Lightweight resource usage. Test impact of changes.

### What Nav0 intentionally does NOT include

- User accounts or cloud sync
- AI assistants or AI-powered features
- News feeds or content recommendations
- Cryptocurrency wallets
- Built-in VPN upsells
- Telemetry or analytics of any kind

## Important Gotchas

### Native Modules (better-sqlite3)

- Requires `electron-rebuild` after install: `npm run rebuild`
- A `postinstall` script does this automatically on `npm install`
- Webpack uses `@vercel/webpack-asset-relocator-loader` in the main process to handle native `.node` bindings
- The `node-loader` handles `.node` file imports

### Electron 35+ ESM Workaround

- `forge.config.ts` has a `packageAfterPrune` hook that rewrites `package.json`'s `main` to `.webpack/main/index.js`
- This is critical for native module loading and main process entry — do not remove

### Cookie encryption fuse (macOS)

- `EnableCookieEncryption` is intentionally disabled on macOS in unsigned builds. Without an Apple Developer ID, OSCrypt can't reliably persist its key in the Keychain, so cookies become unreadable on the next launch and users get logged out. Keep this guarded by `process.platform !== 'darwin'` until the app is properly signed.

### Private browsing data must not hit disk

- Private windows use the **in-memory** SQLite DB (`:memory:`) and a non-persistent Electron session partition (`'private'`, without the `persist:` prefix). Anything you add that writes per-window data needs to honour both — don't shove private-window state into the persistent `electron-store`, and don't open new SQLite tables on the regular `db` for private contexts.

### Dev vs. installed userData

- When `!app.isPackaged`, the userData path is overridden to `<appData>/Nav0 (Dev)` so dev sessions don't clobber the installed app's cookies/history/settings. Anything that hard-codes paths under `app.getPath('userData')` needs to keep working under both.

### User-Agent / Client Hints

- `configureUserAgentFallback()` (`src/main/browser/ua-switcher.ts`) must run **before** any `BrowserWindow` / `WebContentsView` is created — `src/main/index.ts` already does this at the top of the module. Cloudflare Turnstile and similar bot detectors cross-check the UA against the `Sec-CH-UA` headers; this module also rewrites those headers so they line up.

### Environment Variables

- `NAV0_ISSUE_API_KEY` — Used in webpack renderer config for the in-app issue reporter
- `REMOTE_DEBUGGING_PORT` — When set, `startTestControlServer` exposes a small HTTP API used by the Puppeteer perf tests

### Single-instance + CLI

- The app holds a single-instance lock. Code that adds new CLI flags should extend `parseCLIArgs` (`src/main/cli/cli-args.ts`) **and** the `second-instance` handler in `src/main/index.ts` so flags work from both the first and subsequent invocations.

## Code Conventions

- Use TypeScript for all new code
- Follow the manager pattern for new features — encapsulate in a dedicated manager class
- Define IPC channels as constants in `app-constants.ts`
- Define data types as interfaces in `src/types/`
- Use the existing database schema pattern when adding new data models
- Keep renderer code separate from main process code — communicate via IPC only
- No inline styles — use CSS files in `src/renderer/` (each module owns its CSS)
- Prefer extending the unified overlay over creating new renderer entry points
- Let Prettier format your files; don't fight the lint hook

## Design System

**Before making any change to HTML, CSS, or DOM-building TypeScript under `src/renderer/**`, read [`DESIGN.md`](DESIGN.md).\*\* It is the authoritative reference for design tokens, layout patterns, component classes, iconography (Lucide), motion, and the editorial dashboard skeleton used across built-in pages.

Hard rules (full details in `DESIGN.md`):

- **Tokens, not literals.** Always use CSS variables from `src/renderer/styles/global.css` — never hardcode colours, off-scale spacing (stick to `--spacing-xs/sm/md/lg/xl/xxl`), or off-scale radii (Nav0 caps at `--r-lg` = 6px; only `--r-full` for circles).
- **Chrome surfaces are warm off-white, content stays paper-white.** Tab strip, nav bar, and overlay panels use `--chrome-1` / `--chrome-2` / `--tab-inactive`; active tab and content cards stay on `--bg-0`.
- **Row highlights are `--bg-3` plus a 2-px `--nav0-red-600` anchor bar on the left.** This applies to options-menu items, Command-K results, URL autocomplete, new-tab inline search, and the masthead divider on every built-in page.
- **Paper-flat, not glass.** Shadows come only from `--shadow-sm/md/lg`, `--new-tab-card-shadow`, and the two `--shadow-focus*` halos. No coloured glows, no gradients on surfaces, no backdrop-blur "glass" outside the established command-palette pattern.
- **Mono is for code only** (`<code>`, `<kbd>`, hashes, paths, error codes, reader-mode `<pre>`). UI chrome — versions, dates, durations, labels — uses the system sans stack.
- **Icons via Lucide only.** `<i data-lucide="<name>">` + `createIcons({ icons })`. No raw `<svg>` markup, no new icon libraries.
- **Reuse `global.css` components.** `.btn`, `.btn-primary/secondary/ghost/link`, `.form-control`, `.card`, `.alert-*`, `.badge-*`, `.keycap`, flex/spacing/typography utilities — all pre-defined. Only fork into a page-local class when the design genuinely diverges.
- **`--private-bg` is reserved** for the private-window chrome signal — never reuse for general danger/destructive affordances; use `--danger` instead.
- **Honour `prefers-reduced-motion`** for any new animation.

If a UI change introduces a new token, utility, or component, add it to `global.css` **and** document it in `DESIGN.md` in the same change. Drift between the two means the docs are wrong — fix them.

## Default Browser Settings

| Category   | Setting        | Default                           |
| ---------- | -------------- | --------------------------------- |
| Search     | Engine         | DuckDuckGo                        |
| Search     | Suggestions    | Disabled                          |
| Privacy    | Cookie Policy  | Block 3rd-party                   |
| Privacy    | Clear on close | No                                |
| Ad Blocker | Enabled        | Yes                               |
| Ad Blocker | Lists          | EasyList, EasyPrivacy, Peter Lowe |
| Proxy      | Mode           | Direct                            |
| User Agent | Preset         | nav0-browser (custom)             |
| Popups     | Policy         | Smart (limited)                   |
