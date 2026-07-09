# DESIGN.md — Nav0 Browser Design System

> Authoritative reference for visual & UI conventions. Read this **before**
> touching anything under `src/renderer/**` (HTML, CSS, or DOM-building TS),
> adding a new built-in page, or building a new overlay panel.
>
> The canonical source of truth for tokens is
> [`src/renderer/styles/global.css`](src/renderer/styles/global.css). If this
> document and `global.css` disagree, `global.css` wins — and this file is
> stale and should be updated in the same change.

---

## 1. TL;DR — the 10 rules that catch 90% of mistakes

1. **Always `@import url('../../styles/global.css');`** at the top of every page CSS.
2. **Never hardcode a colour.** Use a token (`var(--bg-0)`, `var(--fg-2)`, `var(--nav0-red-600)`, …). No `#fff`, `#000`, `rgb(...)`, named colours. (The one allowed exception: the explicit `#ffffff` for active tab / focused input _because_ it visibly anchors against the warm chrome — but prefer `var(--bg-0)` when it resolves to the same value.)
3. **Chrome is warm off-white, content is paper-white.** Tab strip / nav bar / overlay panels use `--chrome-1`, `--chrome-2`, `--tab-inactive`. Active tab, content cards, focused inputs stay `--bg-0`. Internal pages still use `--bg-0` as their canvas.
4. **Row highlights are `--bg-3` + a 2-px `--nav0-red-600` anchor bar on the left.** Universal across the options menu, Command-K results, URL autocomplete, new-tab inline search, and built-in page list rows.
5. **Radii are tight: 2 / 3 / 4 / 6 px, or full circle.** Use `--r-xs`, `--r-sm`, `--r-md`, `--r-lg`, `--r-full`. Do **not** introduce 8/12/16px or 500px "pills". The URL-bar "pill" is `--r-pill` = 6px, not a Stadium shape.
6. **Hairline borders, paper-flat shadows.** `1px solid var(--border-1)` and `var(--shadow-sm/md/lg)` / `--new-tab-card-shadow`. No coloured glows, no `0 0 20px rgba(…)`.
7. **Spacing comes from the scale.** `--spacing-xs/sm/md/lg/xl/xxl` (4/8/16/24/32/48). Avoid odd values like `13px`, `19px` — round to the scale.
8. **Focus state = soft halo + paper-white fill.** Inputs at rest can already be white on the warm chrome (e.g. URL bar). On focus add `box-shadow: var(--shadow-focus)` (or `--shadow-focus-accent` for the accent ring).
9. **No inline styles in HTML/TS.** Define a class in the page's CSS. (Reinforced by `CLAUDE.md` → Code Conventions.)
10. **Icons come from Lucide,** `<i data-lucide="<name>" width="16" height="16"></i>`, then `createIcons({ icons })` in TS. Don't ship raw SVGs or icon fonts.
11. **Mono is for _code_ only.** `<code>`, `<kbd>`, SHA-256 hashes, file paths, ERR\_\* codes, reader-mode `<pre>`. UI chrome — versions, dates, durations, table headers, badges — uses the system sans stack. There is no global mono token; scope a page-local `--<page>-mono` only on selectors that render actual code-like content.
12. **Sharp, minimal, utilitarian.** If a design choice feels playful, decorative, or "cloudy", it's wrong. We are paper — not glass, not neon, not aqua.

---

## 2. Design philosophy

Nav0 is a **minimal, privacy-first browser**. Its visual language reflects that:

- **Editorial, not app-y.** Pages read like a dashboard / printed document — left-aligned masthead, brand-red 1-px rule under the title, generous gutter. Editorial pages drop subtitles, taglines, and stats lines; the title alone carries the section identity.
- **Warm chrome, paper-white content.** The chrome (tab strip, nav bar, menus, overlays) sits on a warm off-white layer (`--chrome-1` / `--chrome-2`). The active tab, focused inputs, and built-in page canvases stay paper-white (`--bg-0`) — that contrast is what tells the eye what's the foreground.
- **Utilitarian.** Sharp corners, hairline borders, paper-flat shadows. No gradients on surfaces, no coloured glows, no neumorphism.
- **Calm, with a single brand red.** The Nav0 compass red (`--nav0-red-600`) is the brand accent: active tab anchor bar, masthead divider, row-highlight anchor bar on menus / search results / list rows, Settings sidebar active link, Settings toggle/radio fill, Command-O selected card outline. `--accent` (Nav0 blue 600) is reserved for links and a few cross-page status surfaces. Status colours (`--danger`, `--success`, `--warning`) only when the semantics demand it.
- **Row highlights are uniform.** Hover / active rows everywhere use `--bg-3` background + a 2-px `--nav0-red-600` anchor bar flush at the left edge. No bespoke per-page colours.
- **Hierarchy via type weight and white space,** not via colour or large radii.
- **Privacy mode is a visible signal.** Private windows use `--private-bg` (Nav0 red 700) — never reuse this colour for non-private affordances.

When in doubt: **default to less.** Smaller radius, lighter shadow, more white space.

---

## 3. Token reference (canonical: `global.css`)

### 3.1 Colour ramps (brand)

| Token              | Hex       | Use                                           |
| ------------------ | --------- | --------------------------------------------- |
| `--nav0-red-500`   | `#ef4444` | Brand red ramp — private mode, danger accents |
| `--nav0-red-600`   | `#dc2626` | (alias of `--danger`)                         |
| `--nav0-red-700`   | `#b91c1c` | `--private-bg`                                |
| `--nav0-red-800`   | `#991b1b` | Pressed / very strong red                     |
| `--nav0-blue-500`  | `#3b82f6` | Brand blue ramp                               |
| `--nav0-blue-600`  | `#2563eb` | `--accent`                                    |
| `--nav0-blue-700`  | `#1d4ed8` | `--accent-hover`                              |
| `--nav0-blue-800`  | `#1e40af` | Pressed accent                                |
| `--nav0-slate-300` | `#cbd5e1` | —                                             |
| `--nav0-slate-400` | `#94a3b8` | —                                             |
| `--nav0-slate-500` | `#64748b` | —                                             |
| `--nav0-slate-700` | `#334155` | —                                             |
| `--nav0-slate-900` | `#0f172a` | —                                             |

> Reach for the slate ramp only when you need a neutral that isn't pure grey — most UI greys should come from `--bg-*` / `--fg-*` / `--border-*` below.

### 3.2 Surface & ink

| Token            | Hex       | Use                                                |
| ---------------- | --------- | -------------------------------------------------- |
| `--bg-0`         | `#ffffff` | Canvas / cards / active tab / focused inputs       |
| `--bg-1`         | `#fafafa` | Page background (very light grey, rarely used now) |
| `--bg-2`         | `#f5f5f5` | Subtle surface — segmented controls, small chips   |
| `--bg-3`         | `#ebebeb` | **Row hover / active highlight** (universal)       |
| `--bg-inverse`   | `#0a0a0a` | Dark surfaces (tooltips, scrim contents)           |
| `--chrome-1`     | `#f7f6f4` | Nav bar, page bento panels (warm off-white)        |
| `--chrome-2`     | `#fbfaf8` | Menus, popovers, command-K/O, overlay panels       |
| `--tab-inactive` | `#e7e5e1` | Inactive tab band on the tab strip                 |
| `--fg-1`         | `#0a0a0a` | Primary text                                       |
| `--fg-2`         | `#333333` | Body text                                          |
| `--fg-3`         | `#6b7280` | Secondary text, stats, captions                    |
| `--fg-4`         | `#9ca3af` | Placeholder, disabled, very low emphasis           |
| `--fg-on-dark`   | `#ffffff` | Text on inverse surfaces                           |
| `--border-1`     | `#dcd9d4` | Hairline divider (warm gray, matches chrome)       |
| `--border-2`     | `#c8c5bf` | Heavier separator (rare)                           |

> `--chrome-*` sit a notch under `--bg-0` so paper-white content reads as the foreground layer. The compass red (`--nav0-red-600`) is a warm hue; the chrome and hairlines were pulled 2–3% toward red/yellow so the whole system feels coherent. Don't tint chrome cool.

### 3.3 Semantic & status

| Token            | Maps to           | Use                                                                                                                                                                                                                       |
| ---------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--nav0-red-600` | `#dc2626`         | **Brand accent.** Active tab bar, masthead dividers, row anchor bars, Settings sidebar active link, Settings toggles/radios, Command-O selected outline. Use this token directly (not `--accent`) for brand-red surfaces. |
| `--accent`       | `--nav0-blue-600` | Link colour, default `<a>`, code-snippet syntax. **Not** the brand accent.                                                                                                                                                |
| `--accent-hover` | `--nav0-blue-700` | Hover variant of links                                                                                                                                                                                                    |
| `--danger`       | `--nav0-red-600`  | Destructive actions, error states (same colour as the brand red but reached via the semantic token)                                                                                                                       |
| `--danger-soft`  | `#fdecea`         | Danger surface                                                                                                                                                                                                            |
| `--success`      | `#16a34a`         | Success status                                                                                                                                                                                                            |
| `--success-soft` | `#ecfdf5`         | Success surface                                                                                                                                                                                                           |
| `--warning`      | `#d97706`         | Warning status                                                                                                                                                                                                            |
| `--warning-soft` | `#fef3c7`         | Warning surface                                                                                                                                                                                                           |
| `--private-bg`   | `--nav0-red-700`  | Private window chrome — **never reuse**                                                                                                                                                                                   |
| `--private-fg`   | `#ffffff`         | Text on private chrome                                                                                                                                                                                                    |

> Use `--nav0-red-600` directly for visual brand surfaces (anchor bars, active indicators). Use `--danger` for destructive _semantics_ (delete buttons, error pills) — even though it resolves to the same hex, the intent is different and lets us recolour each independently later.

**macOS traffic lights** (`--mac-close`, `--mac-close-border`, `--mac-zoom`, `--mac-zoom-border`, `--mac-control-disabled`, `--mac-control-disabled-border`, `--mac-control-glyph`) are fixed Apple system colours used exclusively by the custom close/minimize/zoom cluster the tab strip draws on macOS in fullscreen (where the native buttons are hidden). Like `--private-bg`, these are reserved — never reuse them for general status colours.

### 3.4 Shadows & focus

```
--shadow-sm:    0 1px 2px  rgba(0, 0, 0, 0.06);   /* resting cards */
--shadow-md:    0 2px 8px  rgba(0, 0, 0, 0.06);   /* dialogs, popovers */
--shadow-lg:    0 8px 24px rgba(0, 0, 0, 0.10);   /* command palette, modals */
--shadow-focus:        0 0 0 2px rgba(0, 0, 0, 0.10);     /* neutral focus halo */
--shadow-focus-accent: 0 0 0 3px rgba(37, 99, 235, 0.18); /* accent focus halo */
```

Scoped to the new-tab page (declared on `.new-tab-page`):

```
--new-tab-card-shadow:
  0 16px 40px rgba(0, 0, 0, 0.12),
  0 4px 12px  rgba(0, 0, 0, 0.06);
```

Shared by the new-tab search bar, suggestion tiles, and search-results popup so all three sit on the same elevation. Do not introduce other shadow values. No coloured drop shadows (`rgba(59, 130, 246, …)`, etc.) except `--shadow-focus-accent`.

### 3.5 Radii

```
--r-xs:   2px;    /* tags, micro-chips */
--r-sm:   3px;    /* keycaps, badges */
--r-md:   4px;    /* default — buttons, inputs, selects */
--r-lg:   6px;    /* cards, dialogs */
--r-pill: 6px;    /* URL-bar "pill" — softly rounded rect, NOT a stadium */
--r-full: 50%;    /* avatars, circular icons */
```

> Source app used 6/8/12/pill. Nav0 **deliberately** tightened these. Do not "soften" a Nav0 surface by bumping the radius.

### 3.6 Spacing

```
--spacing-xs:  4px;
--spacing-sm:  8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
--spacing-xxl: 48px;
```

Use these (or `--r-*` / `--font-*`) instead of raw px wherever possible. Editorial layouts often combine `48px 56px 80px` for page padding — `56` and `80` are intentional outliers for that pattern only.

### 3.7 Typography scale

```
--font-xs:   11px;   /* mono captions, small caps labels */
--font-sm:   12px;   /* secondary text, stats */
--font-md:   14px;   /* body (default) */
--font-lg:   16px;   /* emphasis, large inputs */
--font-xl:   18px;   /* h3-ish */
--font-xxl:  24px;   /* h2 */
--font-xxxl: 32px;   /* h1 */
```

System sans stack (set globally on `*`):

```
-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif
```

**Mono is for code, not UI chrome.** Scope a page-local stack only on the selectors that actually render code-like content:

```css
.about-page {
  --about-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
}
.about-page .hash {
  /* SHA-256 checksum chip */
  font-family: var(--about-mono);
}
```

Acceptable mono surfaces:

- Inline `<code>` / `<kbd>` snippets in setting descriptions
- SHA-256 hashes, application paths, `ERR_*` codes
- `<pre>` blocks inside reader mode
- `<code>` / `<pre>` rendered on error / SSL warning pages

**Not** mono: version numbers, dates, durations, table headers, badge text, tag labels, link URLs, stats counters. Earlier passes used mono everywhere for "tabular" feel — that has been intentionally stripped. Do not re-introduce it.

Weights in use: `200` (display titles), `400` (body), `500` (labels, nav-link active), `600` (headings, badges), `700` (rare emphasis).

### 3.8 Motion

```
--dur-fast: 120ms;   /* hover, focus, micro-feedback */
--dur-med:  220ms;   /* page-load fade, panel reveal */
--dur-slow: 400ms;   /* large transitions (rare) */
```

`@media (prefers-reduced-motion: reduce)` must disable non-essential animations on any new overlay/dialog. See `alert.css` for the established pattern.

### 3.9 Z-index layers

```
--z-dropdown: 100;
--z-sticky:   200;
--z-modal:   1000;
--z-toast:   1100;
```

Pick from the scale. Do not invent `z-index: 9999`.

---

## 4. Layout patterns

### 4.1 Editorial dashboard (built-in pages — about, bookmarks, history, downloads, settings)

```
┌────────────────────────────────────────────────────────────┐
│  Title (48px / 200 weight / -0.5 letter-spacing)         │  ← masthead
│  ═══════════════════════════════════════════════════════ │  ← 1-px nav0-red-600 rule
│                                                            │
│  [ toolbar: search · segmented control · clear ]           │
│                                                            │
│  Content rows / panels (hairline borders, --border-1)      │
└────────────────────────────────────────────────────────────┘
```

Skeleton:

```css
.<page > -page {
  min-height: 100vh;
  background: var(--bg-0);
  color: var(--fg-2);
}

.<page > -wrapper {
  max-width: 1080px; /* dashboard standard */
  margin: 0 auto;
  padding: 48px 56px 80px;
}

.<page > -head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  flex-wrap: wrap;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--nav0-red-600); /* brand rule under title */
}

.<page > -title {
  font-size: 48px;
  font-weight: 200;
  letter-spacing: -0.5px;
  color: var(--fg-1);
  margin: 0;
  line-height: 1.2;
}
```

Conventions for built-in pages:

- **No subtitles, taglines, or stats lines.** Page identity is carried by the title alone. The earlier `--<page>-mono` stats-label slot has been removed everywhere.
- **Toolbars** sit below the masthead with `margin: 28px 0 24px;` and use `--bg-2` segmented controls + a danger ghost "Clear All …" button at the right end.
- **Settings** uses a sidebar layout instead of the centered wrapper — see `browser-settings/index.css`. The active sidebar link uses the same 2-px `--nav0-red-600` anchor bar pattern as row highlights.
- **About** has no logo/mark, no right-rail stats, no privacy footer — just the title, four hairline-bordered groups (Software · System · Integrity · Links), and the SHA-256 hash chips.

Settings sidebar active link recipe (also used by the masthead anchor pattern):

```css
.sidebar-link.active {
  background: var(--bg-0);
  color: var(--fg-1);
  border: 1px solid var(--border-1);
  position: relative;
}
.sidebar-link.active::before {
  content: '';
  position: absolute;
  left: -1px;
  top: -1px;
  bottom: -1px;
  width: 2px;
  background: var(--nav0-red-600);
}
```

### 4.2 New-tab page

`new-tab` follows the same editorial masthead pattern (greeting as the title, red rule below) but the body is a stack of floating cards:

```
┌────────────────────────────────────────────────────────────┐
│  Good afternoon                                          │  ← masthead (red rule)
│                                                            │
│  [🔍  Search tabs, bookmarks, history, downloads or web ]  │  ← search shell
│                                                            │
│  Bookmarks                                                 │  ← section title
│  [tile] [tile] [tile] [tile] [tile] [tile] [tile] [tile]   │  ← 8-col tile row
│                                                            │
│  Frequently visited                                        │
│  [tile] [tile] [tile] [tile] [tile] [tile] [tile] [tile]   │
└────────────────────────────────────────────────────────────┘
```

Conventions:

- Page background is `--bg-0` (same as other built-in pages), **not** `--bg-1`. The gradient backgrounds we used earlier are gone.
- The search bar, suggestion tiles, and search-results popup all carry the **shared `--new-tab-card-shadow`** so they read as one elevation layer.
- Search shell uses an absolutely positioned `<i data-lucide="search">` magnifier on the left, with the input padded `16px 24px 16px 52px` so text starts past the icon.
- When the user types, the results popup opens **flush** beneath the input (no margin) — full-width, same shadow. Tiles hide while a query is active and come back on `Escape` / click-outside / cleared input.
- Result rows follow the universal row-highlight pattern: `--bg-3` background + 2-px `--nav0-red-600` anchor bar on the left.
- Tiles: 36-px favicon well centered above a bold name and muted domain, white card with hairline border, hover only changes border colour (not background).

### 4.3 Overlay panels (`src/renderer/overlay/panels/<name>/`)

All overlay panels live in a single shared `WebContentsView` and are rendered through the unified overlay manager (`src/main/browser/unified-overlay-manager.ts`).

- Root element has `position: fixed; inset: 0; z-index: var(--z-modal);`.
- **Surface colour: `--chrome-2`** (warm off-white). This applies to the options menu, Command-K, Command-O, URL autocomplete, SSL info, alert, basic-auth, issue-report.
- **Scrim** (Command-K / Command-O only): `rgba(0, 0, 0, 0.45)` + `backdrop-filter: blur(5px)`. The alert/auth/issue dialogs don't dim the page.
- Dialog: `background: var(--chrome-2); border: 1px solid var(--border-1); border-radius: var(--r-lg); box-shadow: var(--shadow-md);` (or `--shadow-lg` for the command palette).
- Slide-in animation ~ 180ms, **always gated** on `@media (prefers-reduced-motion: reduce)`.
- **Inputs inside overlays stay paper-white** on focus (`background: var(--bg-0)` + `--shadow-focus`) so they pop on the warm panel.
- When any modal overlay (`ssl-info`, `options-menu`, `command-k`, `command-o`, `issue-report`, `alert`, `basic-auth`) is opened, the URL autocomplete is closed first — the shared WebContentsView's bounds are otherwise restricted to the URL-bar dropdown region.

### 4.4 Universal row-highlight pattern

Used by the options menu, Command-K results, URL autocomplete, new-tab inline search, History/Bookmarks/Downloads entries, About link rows, Settings sidebar hover, etc.

```css
.row {
  padding: 10px 16px; /* per-page may vary */
  position: relative;
  cursor: pointer;
  transition: background-color var(--dur-fast);
}
.row:hover,
.row.active {
  background-color: var(--bg-3);
}
.row:hover::before,
.row.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--nav0-red-600);
}
```

Conventions:

- Rows span the full width of their container — no internal horizontal padding on the parent that would inset the highlight.
- The anchor bar sits flush at `left: 0` (or `left: -1px` if the parent has a 1-px border that should be visually crossed). It does **not** have `border-radius` — sharp 2-px band.
- For grouped menus, the highlight may also gain hairline `border-top` / `border-bottom` rules (see options-menu) so the band reads as a tactile press. Don't add a 4-sided border.

---

## 5. Component patterns

All of the following are pre-defined in `global.css` — **reuse them.** Only fork a class into page-local CSS when the design genuinely diverges (rare).

### 5.1 Buttons

| Class               | Use                                               |
| ------------------- | ------------------------------------------------- |
| `.btn`              | Base — always include                             |
| `.btn-primary`      | Primary action (`--primary-color` bg, white text) |
| `.btn-secondary`    | Default action (`--bg-light` bg, border)          |
| `.btn-ghost`        | Tertiary — transparent, hover greys the bg        |
| `.btn-link`         | Looks like a link, underlines on hover            |
| `.btn-sm` `.btn-lg` | Size modifiers                                    |
| `.btn-icon`         | Square icon-only buttons                          |
| `.btn-block`        | Full-width                                        |

### 5.2 Form controls

`.form-control` (input/textarea), `.form-group`, `.form-label`, `.form-text` (helper line).
Native `<select>` is auto-styled globally — don't override unless you need to tweak padding / min-width.

### 5.3 Cards

`.card` / `.card-header` / `.card-body` / `.card-footer`.

### 5.4 Alerts

`.alert` + `.alert-primary | -error | -success | -warning | -info`. Always pair with semantic ARIA, not just colour, for status.

### 5.5 Badges, keycaps, avatars, dividers, progress

`.badge` (+ `-primary | -success | -error | -secondary`),
`.keycap` (for ⌘ K and friends),
`.avatar` / `.avatar-sm` / `.avatar-lg`,
`.divider` / `.divider-vertical`,
`.progress` / `.progress-bar`.

### 5.6 Layout & utilities

Flex/grid helpers (`.flex`, `.flex-col`, `.items-center`, `.justify-between`, `.gap-md`, …), spacing (`.mt-md`, `.p-lg`, …), typography (`.text-sm`, `.font-semibold`, `.truncate`, …), borders (`.border`, `.border-top`, `.rounded`, …), background utilities (`.bg-light`, `.bg-error-light`, …). Same names you'd expect from Bootstrap-ish utility CSS — see `global.css` §Utilities for the full list.

---

## 6. Iconography — Lucide only

```html
<i data-lucide="lock" width="16" height="16"></i>
```

```ts
import { createIcons, icons } from 'lucide';
createIcons({ icons });
```

- Default sizes: 14px (inline), 16px (buttons), 20–24px (page headers).
- Icon colour comes from `currentColor` — set `color: var(--fg-3)` on the container, not on the SVG.
- Do not paste raw SVG markup. Do not add a new icon library.

---

## 7. File organisation

| Where                                           | What                                                    |
| ----------------------------------------------- | ------------------------------------------------------- |
| `src/renderer/styles/global.css`                | Tokens, resets, utilities, base components              |
| `src/renderer/styles/notification.css`          | Cross-page notification styles                          |
| `src/renderer/pages/<page>/index.css`           | Per-page CSS — must `@import` global.css                |
| `src/renderer/overlay/panels/<name>/<name>.css` | Overlay panel CSS                                       |
| `src/renderer/browser-layout/*.css`             | Chrome (tabs, nav bar, find-in-page, permission prompt) |
| `src/renderer/assets/`                          | Logo, favicon — no inline data URLs for branding        |

**Never** add CSS under `src/main/`. Main process is headless.

**Never** add a new webpack entry point silently — register it in `forge.config.ts` _and_ `webpack.renderer.config.ts` (see `CLAUDE.md` → Renderer Entry Points).

---

## 8. Anti-patterns — common mistakes to refuse

| Anti-pattern                                                                  | Why it's wrong                                        | Do this instead                                                     |
| ----------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------- |
| `border-radius: 12px` / `border-radius: 999px`                                | Nav0 radii cap at 6px (full-circle only for avatars)  | `var(--r-md)` or `var(--r-lg)`                                      |
| `box-shadow: 0 4px 20px rgba(59, 130, 246, .3)`                               | Coloured glow — not paper-flat                        | `var(--shadow-md)` (or `--new-tab-card-shadow` on the new-tab page) |
| `color: #555` / `background: #f0f0f0`                                         | Hardcoded grey                                        | `var(--fg-3)` / `var(--bg-2)`                                       |
| Overlay panel `background: var(--bg-0)`                                       | Pure white blends with the active tab / content layer | `var(--chrome-2)`                                                   |
| Nav bar `background: var(--bg-0)`                                             | Same blending issue at the chrome level               | `var(--chrome-1)`                                                   |
| `font-family: var(--*-mono)` on a version label, date, table header, or badge | Mono is for code only — UI chrome stays sans          | Drop the `font-family` line; sans is inherited                      |
| Bespoke per-page hover colour (`var(--bg-1)`, custom rgba, etc.)              | Breaks the universal row-highlight pattern            | `var(--bg-3)` + 2-px `--nav0-red-600` anchor bar                    |
| `style="margin-top: 13px"` in HTML                                            | Inline style + off-scale spacing                      | Class + `--spacing-md`                                              |
| `padding: 7px 11px`                                                           | Off the spacing scale                                 | Round to 4/8/16/24                                                  |
| New `<svg>` markup pasted in HTML                                             | Bypasses Lucide                                       | `<i data-lucide="…">` + `createIcons`                               |
| Gradient backgrounds, random blur "glass" panels                              | Not minimal/utilitarian                               | Flat `--chrome-*` / `--bg-0` + hairline border                      |
| Reusing `--private-bg` red for danger CTAs                                    | That red is reserved for the private-mode signal      | `--danger` (Nav0 red 600)                                           |
| Settings toggles / radios in `--accent` blue                                  | Settings accent was repointed to brand red            | `--n0-accent` (already aliased to `--nav0-red-600`)                 |
| `z-index: 9999`                                                               | Bypasses the layer system                             | `var(--z-modal)` / `var(--z-toast)`                                 |
| Adding a new colour token without updating `global.css` and this doc          | Drift                                                 | Add it once, in `global.css`, then reference                        |

---

## 9. Adding a new built-in page — checklist

1. Folder: `src/renderer/pages/<name>/` with `index.html`, `index.css`, `index.ts`.
2. CSS starts with `@import url('../../styles/global.css');`.
3. Use the **editorial dashboard skeleton** (§4.1) unless the page has a genuinely different purpose.
4. Register a new webpack entry point in both `forge.config.ts` and `webpack.renderer.config.ts` (see `CLAUDE.md`).
5. Icons via Lucide; call `createIcons({ icons })` after DOM is ready.
6. No analytics, telemetry, network calls, or third-party fonts/CSS. (Privacy-first — see `CLAUDE.md` → Design Principles.)
7. Test in **both** normal and private windows. The page must still read correctly when surrounding chrome is `--private-bg`.
8. Reduced motion: animations gated on `@media (prefers-reduced-motion: reduce)`.

---

## 10. Pre-flight checklist before reporting a UI change "done"

- [ ] CSS imports `global.css`.
- [ ] No hardcoded colours; no off-scale spacing/font sizes; no off-scale radii.
- [ ] Chrome / overlay surfaces use `--chrome-1` / `--chrome-2`; content stays `--bg-0`.
- [ ] Row hovers use `var(--bg-3)` + 2-px `--nav0-red-600` anchor bar (`::before`).
- [ ] Masthead divider on built-in pages is `1px solid var(--nav0-red-600)`.
- [ ] No `font-family: var(--*-mono)` on non-code UI (versions, dates, labels, headers, badges).
- [ ] Shadows from the `--shadow-*` set (or `--new-tab-card-shadow` on the new-tab page only).
- [ ] Focus state is the soft halo (`--shadow-focus` or `--shadow-focus-accent`).
- [ ] Icons are Lucide; no inline `<svg>`.
- [ ] No inline `style=""` attributes in HTML / no DOM-level inline styles in TS.
- [ ] `prefers-reduced-motion` honoured for any new animation.
- [ ] Lints pass: `npm run lint` (and stylelint if you ran it).
- [ ] If a new token, utility, or component was introduced: added to `global.css` **and** documented in this file.
- [ ] App boots: `npm run start` and the affected page renders correctly in both normal and private windows.

If you cannot tick all the relevant boxes, say so explicitly in the reply — do **not** report the change as complete.
