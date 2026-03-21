# CLAUDE.md - Nav0 Browser

## Project Overview

Nav0 is a minimal, privacy-focused web browser built on Electron. The philosophy is **"Browse. Nothing More."** — a lightweight, open-source browser with zero telemetry, zero tracking, and zero data collection.

- **Version**: 0.0.9
- **License**: MIT
- **Author**: Ketan Patil
- **Repo**: https://github.com/nav0-org/nav0-browser

## Quick Reference

```bash
npm run start          # Run in development mode (electron-forge start)
npm run make           # Build distributable packages
npm run package        # Package without creating distributables
npm run lint           # Run ESLint on .ts/.tsx files
npm run test:perf      # Run Puppeteer-based performance tests
npm run test:data      # Run data consumption tests
npm run rebuild        # Rebuild native modules (better-sqlite3)
npm run docs:dev       # Start VitePress docs dev server
npm run docs:build     # Build documentation site
```

## Architecture

### Multi-Process Model (Electron)

```
Main Process (src/main/)          Renderer Process (src/renderer/)
├── Browser managers              ├── Browser layout (tabs, nav)
├── Database (SQLite)             ├── Built-in pages (history, etc.)
├── Settings enforcement          ├── Overlays (command-k, find, etc.)
├── Ad blocker                    └── Common utilities
└── Window/tab lifecycle
        ↕ IPC via preload scripts (src/preload/)
```

- **Main process** (`src/main/`): System-level operations — window management, database, settings, downloads, permissions, ad blocking, SSL
- **Renderer process** (`src/renderer/`): All UI — browser chrome, built-in pages, overlays, menus
- **Preload scripts** (`src/preload/`): IPC bridges exposing safe APIs to renderer via `contextBridge`

### Manager Pattern

Every feature is encapsulated in a manager class:

| Manager | Location | Purpose |
|---------|----------|---------|
| `AppWindowManager` | `src/main/browser/` | Window lifecycle, multi-window support |
| `AppWindow` | `src/main/browser/` | Single window with tabs and overlays |
| `Tab` | `src/main/browser/` | Individual tab (WebContentsView) |
| `DatabaseManager` | `src/main/database/` | SQLite connection management |
| `SchemaManager` | `src/main/database/` | Database schema versioning |
| `DataStoreManager` | `src/main/database/` | electron-store key-value wrapper |
| `DownloadManager` | `src/main/browser/` | Download tracking and control |
| `BookmarkManager` | `src/main/browser/` | Bookmark CRUD operations |
| `PermissionManager` | `src/main/browser/` | Site permission policies |
| `SettingsEnforcer` | `src/main/settings/` | Applies user preferences to sessions |
| `ReaderModeManager` | `src/main/browser/` | Reader mode extraction (@mozilla/readability) |
| `SSLManager` | `src/main/browser/` | Certificate validation |
| `FindInPageManager` | `src/main/browser/` | In-page text search |
| `CommandKOverlayManager` | `src/main/browser/` | Command palette overlay |
| `CommandOOverlayManager` | `src/main/browser/` | File opener overlay |

### IPC Communication

All IPC channels are defined as string constants in `src/constants/app-constants.ts`:
- `RendererToMainEventsForBrowserIPC` — renderer-initiated browser actions
- `MainToRendererEventsForBrowserIPC` — main process responses to renderer
- `RendererToMainEventsForDataStoreIPC` — data operations (CRUD for bookmarks, history, etc.)

Always use these constants for IPC channel names — never hardcode strings.

### Database Architecture

- **Engine**: better-sqlite3 (native SQLite bindings)
- **Dual database system**: Separate databases for normal and private browsing
  - Private database is deleted when the private window closes
- **Schemas** defined in `src/main/database/schema/`:
  - `bookmark-schema.ts`
  - `browsing-history-schema.ts`
  - `download-schema.ts`
  - `permission-schema.ts`

### Settings System

- Settings interface: `BrowserSettings` in `src/types/settings-types.ts` (~80+ configurable options)
- Stored via `electron-store` (DataStoreManager)
- Applied centrally through `SettingsEnforcer` which handles:
  - Cookie policies, proxy config, user agent
  - Ad blocker toggle, auto-deletion scheduling

## Source Structure

```
src/
├── main/                          # Electron main process
│   ├── index.ts                   # App entry point
│   ├── browser/                   # Core browser managers (19 files)
│   ├── database/                  # SQLite layer + schemas
│   ├── settings/                  # Settings enforcement
│   ├── web/                       # Search engine configuration
│   └── ad-blocker/                # Domain lists, URL patterns, CSS injection
├── renderer/                      # Electron renderer process
│   ├── browser-layout/            # Main browser UI (tabs, navigation bar)
│   ├── pages/                     # Built-in pages
│   │   ├── about/                 #   About page
│   │   ├── bookmarks/             #   Bookmarks viewer
│   │   ├── browser-settings/      #   Settings UI
│   │   ├── command-k/             #   Command palette
│   │   ├── command-o/             #   File opener
│   │   ├── downloads/             #   Downloads viewer
│   │   ├── history/               #   History viewer
│   │   └── new-tab/               #   New tab page
│   ├── options-menu/              # Browser menu
│   ├── permission-prompt/         # Permission request dialogs
│   ├── issue-report/              # Bug report UI
│   ├── web-content/               # Web page rendering
│   ├── find-in-page/              # Find in page UI
│   ├── ssl-info/                  # SSL certificate info
│   ├── common/                    # Shared utilities (theme, html, format)
│   ├── assets/                    # Images, icons, logos
│   └── styles/                    # CSS stylesheets
├── preload/                       # IPC bridge scripts
│   ├── internals-api.ts           # Main API for internal pages
│   ├── externals-api.ts           # External-facing API
│   └── web-content-preload.ts     # Web content preload
├── types/                         # Shared TypeScript interfaces
│   ├── bookmark-record.ts
│   ├── browsing-history-record.ts
│   ├── download-record.ts
│   └── settings-types.ts
└── constants/
    └── app-constants.ts           # IPC channels, URLs, data store keys

tests/
└── performance/                   # Puppeteer-based tests
    ├── browser-perf-test.js       # CPU/memory/frame benchmarks (10-50 tabs)
    └── data-consumption-test.js   # Network usage metrics

docs/                              # VitePress documentation site
├── .vitepress/                    # VitePress config and theme
├── blog/                          # Privacy-focused blog posts
├── releases/                      # Release notes (v0.0.4 - v0.0.9)
└── guide/                         # User documentation
```

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Electron | 35.2.1 |
| Language | TypeScript | 5.8.3 |
| Bundler | Webpack (via @electron-forge) | — |
| Build Tool | Electron Forge | 7.8.0 |
| Database | better-sqlite3 | 11.9.1 |
| Key-Value Store | electron-store | 8.2.0 |
| Reader Mode | @mozilla/readability | 0.6.0 |
| Icons | Lucide | 0.503.0 |
| Docs | VitePress | 1.5.0 |
| Testing | Puppeteer Core | 24.37.5 |

## Build & Configuration

### Webpack

- `webpack.main.config.ts` — Main process bundling
- `webpack.renderer.config.ts` — Renderer bundling (15 entry points)
- `webpack.rules.ts` — Shared loader rules (includes `@vercel/webpack-asset-relocator-loader` for native modules)
- `webpack.plugins.ts` — Shared plugins (Fork TS Checker for type checking)

### Electron Forge (`forge.config.ts`)

- **Makers**: DMG (macOS), ZIP, DEB (Linux), RPM, Squirrel (Windows)
- **ESM Workaround**: `packageAfterPrune` hook patches Electron 35+ native module loading
- **Native rebuild**: `better-sqlite3` rebuilt via `electron-rebuild`

### TypeScript (`tsconfig.json`)

- Target: ES6
- Module: CommonJS
- Strict: `noImplicitAny: true`

### ESLint (`.eslintrc.json`)

- Parser: `@typescript-eslint/parser`
- Extends: `eslint:recommended`, `@typescript-eslint/recommended`, `plugin:import/recommended`
- Environments: browser, es6, node

## CI/CD

### GitHub Actions (`.github/workflows/`)

- **`build-electron.yml`**: Multi-platform build matrix
  - macOS 15 (x64) + macOS Latest (arm64) → DMG
  - Ubuntu Latest (x64) → DEB + RPM
  - Windows Latest (x64) → EXE
  - Node 22, Python 3.11
  - Trigger: `workflow_dispatch` with optional version override

- **`docs.yml`**: Documentation deployment on push

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
- Webpack uses `@vercel/webpack-asset-relocator-loader` in the main process to handle native `.node` bindings
- The `node-loader` handles `.node` file imports

### Electron 35+ ESM Workaround

- `forge.config.ts` has a `packageAfterPrune` hook that patches `package.json` files in node_modules to fix ESM/CJS compatibility issues
- This is critical for native module loading — do not remove

### Environment Variables

- `NAV0_ISSUE_API_KEY` — Used in webpack renderer config for issue reporting
- `REMOTE_DEBUGGING_PORT` — Enables remote debugging (used in tests)

### Renderer Entry Points

There are 15 separate webpack entry points for different renderer windows/overlays. When adding new UI, create a new entry point in `forge.config.ts` and `webpack.renderer.config.ts`.

## Code Conventions

- Use TypeScript for all new code
- Follow the manager pattern for new features — encapsulate in a dedicated manager class
- Define IPC channels as constants in `app-constants.ts`
- Define data types as interfaces in `src/types/`
- Use the existing database schema pattern when adding new data models
- Keep renderer code separate from main process code — communicate via IPC only
- No inline styles — use CSS files in `src/renderer/styles/`

## Default Browser Settings

| Category | Setting | Default |
|----------|---------|---------|
| Search | Engine | DuckDuckGo |
| Search | Suggestions | Disabled |
| Privacy | Cookie Policy | Block 3rd-party |
| Privacy | Clear on close | No |
| Ad Blocker | Enabled | Yes |
| Ad Blocker | Lists | EasyList, EasyPrivacy, Peter Lowe |
| Proxy | Mode | Direct |
| User Agent | Preset | nav0-browser (custom) |
| Popups | Policy | Smart (limited) |
