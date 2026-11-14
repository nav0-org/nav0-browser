# DESIGN.md — Nav0 Browser Design System

> Authoritative reference for visual and UI conventions. Read this **before**
> touching anything under `src/renderer/**` (HTML, CSS, or DOM-building TS),
> `src/main/browser/error-page/**` or `src/main/browser/ssl-warning-page.html`,
> adding a built-in page, or building an overlay panel.
>
> The canonical source of truth for tokens is
> [`src/renderer/styles/global.css`](src/renderer/styles/global.css). If this
> document and `global.css` disagree, `global.css` wins, and this file is stale
> and must be fixed in the same change.

> **This system replaces the earlier "paper and red" system.** The red anchor
> bar, the warm off-white chrome, the editorial masthead (48 px weight 200 with
> a red rule), the 2–6 px radius cap, black primary buttons, red toggles and
> red private windows are all retired. Don't reintroduce them.

---

## 1. TL;DR — the rules that catch most mistakes

1. **Always `@import url('../../styles/global.css');`** at the top of every page CSS.
2. **Never hardcode a colour.** Use a token. No `#fff`, `#000`, `rgb(...)` or named colours outside `global.css`.
3. **One page background.** Every built-in page is white (`--n-page`). Groups of settings, charts and summaries sit in grey panels (`--n-grouped`, radius `--n-r-panel`, no border, no shadow). Controls inside a grey panel are white.
4. **The chrome is cool grey, and the active tab is connected.** Tab strip `--n-strip`; toolbar **and** active tab `--n-toolbar`, one surface with no line between them. A hairline (`--n-chrome-line`) runs under every other tab and under the toolbar.
5. **Blue means interactive, selected or in progress.** Links, focus rings, switches, radios and checkboxes that are on, primary buttons, progress. **Red means danger and nothing else:** insecure connections, failures, and the confirm button of a destructive action. Red is never the brand, never selection, never a toggle.
6. **One selection style everywhere:** `--n-accent-soft` background, `--n-text-1` text, `--n-accent` icon. Menus, ⌘K, ⌘O, URL autocomplete, the Settings sidebar and filter chips. No anchor bars, no outlines, no solid fills with white text.
7. **Radii are half of macOS:** 2 / 3 / 4 / 5 / 6 / 7 / 8 px via `--n-r-*` (see §3.5). Switches, radios, dots and the download ring are round. No other values.
8. **Seven type sizes, four weights.** 11 / 12 / 13 / 14 / 17 / 22 / 28 px; weights 400 / 500 / 600 / 700. Page titles are 28 px bold. No weight 200 or 300.
9. **Focus rings are for the keyboard only.** Use `:focus-visible` with `--n-focus-ring`. Never show an outline on mouse click, and never a black outline.
10. **No inline styles in HTML or TS.** Define a class in the page's CSS.
11. **Icons are Lucide** (the version pinned in `package.json`) at the default 2 px stroke: 18 px in the toolbar, 16 px in fields, menus and buttons, 14 px inline.
12. **Mono is for code only:** error codes, hashes, file paths, the user-agent string, and key combos inside prose.
13. **Nothing animates forever.** Only the tab loader and download progress move. Respect `prefers-reduced-motion`.
14. **Categories are named, not coloured.** An icon and a label on a neutral badge. Colour hues appear only in the storage bar, with a legend.

---

## 2. Design philosophy

- **Calm and native.** Nav0 should feel like a well-made Mac or Windows app: quiet chrome, clear hierarchy, platform conventions (⌘ ⇧ ⌥ glyphs on macOS, `Ctrl+Shift+` on Windows and Linux).
- **Neutral first, one accent.** Surfaces and text are greys. If a colour appears, it is telling you something: blue for "you can act" or "it's chosen", red for danger.
- **Content leads.** The chrome stays out of the way; built-in pages are white with grey panels so they read like pages, not like a second app.
- **Hierarchy through size, weight and space**, not through colour, borders or large radii.
- **Light mode only.** There is no dark theme. Don't add `prefers-color-scheme: dark` styles.
- **Privacy mode is a calm, visible signal:** a lavender tint on the chrome plus a "Private" label. Colour is never the only cue.

When in doubt: **default to less.** Fewer borders, fewer colours, more space.

---

## 3. Token reference (canonical: `global.css`)

### 3.1 Brand ramps — logo only

The `--nav0-red-*`, `--nav0-blue-*` and `--nav0-slate-*` ramps stay in `global.css` for the compass logo only. **Never use them for UI.** UI colours come from the `--n-*` tokens below.

### 3.2 Surfaces and lines

| Token              | Value               | Use                                                                                    |
| ------------------ | ------------------- | -------------------------------------------------------------------------------------- |
| `--n-page`         | `#ffffff`           | Built-in page canvas (every page)                                                      |
| `--n-grouped`      | `#f5f5f7`           | Grey panels on a page (settings groups, history charts, storage), the Settings sidebar |
| `--n-card`         | `#ffffff`           | Fields and buttons inside grey panels; the address field                               |
| `--n-strip`        | `#e6e6e9`           | Tab strip, behind inactive tabs                                                        |
| `--n-toolbar`      | `#f6f6f7`           | Toolbar, the active tab and the find bar — one connected surface                       |
| `--n-chrome-line`  | `#d1d1d6`           | Under the tab strip (except under the active tab) and under the toolbar                |
| `--n-separator`    | `#e5e5ea`           | Row dividers on white, inset 16 px                                                     |
| `--n-panel-line`   | `rgba(0,0,0,0.07)`  | Row dividers inside grey panels                                                        |
| `--n-fill`         | `rgba(0,0,0,0.05)`  | Search fields on a page, secondary buttons, chips and badges at rest                   |
| `--n-fill-2`       | `rgba(0,0,0,0.07)`  | Segmented-control track, keycaps, pressed toolbar button                               |
| `--n-hover`        | `rgba(0,0,0,0.04)`  | Row hover                                                                              |
| `--n-tab-hover`    | `rgba(0,0,0,0.045)` | Inactive tab hover                                                                     |
| `--n-tab-divider`  | `rgba(0,0,0,0.14)`  | 16 px divider between inactive tabs                                                    |
| `--n-control-edge` | `#8e8e93`           | Edge of an off switch, checkbox or radio (3.3:1 on white)                              |
| `--n-track`        | `#e5e5ea`           | Off switch track                                                                       |
| `--n-scrim`        | `rgba(0,0,0,0.12)`  | Behind ⌘K, ⌘O and dialogs                                                              |
| `--n-well`         | `#f2f2f4`           | Icon and favicon wells on a white page (use `--n-card` for wells inside grey panels)   |
| `--n-menu-line`    | `rgba(0,0,0,0.09)`  | Separators inside menus                                                                |
| `--n-ring-track`   | `rgba(0,0,0,0.12)`  | Track of the tab loader and the download ring                                          |
| `--n-menu-solid`   | `#f8f8fa`           | Menu background when the OS asks to reduce transparency                                |

### 3.3 Text

| Token        | Value     | Contrast                         | Use                                                |
| ------------ | --------- | -------------------------------- | -------------------------------------------------- |
| `--n-text-1` | `#1d1d1f` | 16.8:1 on white, 13.5:1 on strip | Primary text, titles, active tab                   |
| `--n-text-2` | `#424245` | 10.0:1 on white, 8.0:1 on strip  | Body, inactive tabs, icons                         |
| `--n-text-3` | `#6e6e73` | 5.1:1 on white                   | Secondary text, meta, placeholders. Never on strip |
| `--n-text-4` | `#aeaeb2` | —                                | Disabled only                                      |

### 3.4 Accent, semantic, private, data

| Token                                          | Value                                                                                                                                                                                           | Use                                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `--n-accent`                                   | `#0066d6`                                                                                                                                                                                       | Links, primary buttons, on-state controls, progress, the selected icon (5.4:1) |
| `--n-accent-hover`                             | `#0058b9`                                                                                                                                                                                       | Link and primary-button hover                                                  |
| `--n-accent-soft`                              | `rgba(0,102,214,0.12)`                                                                                                                                                                          | Selection background (rows, sidebar item, chips, toggled find options)         |
| `--n-focus`                                    | `rgba(0,102,214,0.28)`                                                                                                                                                                          | Focus halo colour                                                              |
| `--n-danger`                                   | `#d70015`                                                                                                                                                                                       | Insecure, failure, destructive confirm (5.4:1)                                 |
| `--n-danger-soft`                              | `rgba(215,0,21,0.08)`                                                                                                                                                                           | Danger banner background                                                       |
| `--n-warning`                                  | `#a35200`                                                                                                                                                                                       | Mixed content, paused (5.6:1)                                                  |
| `--n-warning-soft`                             | `rgba(163,82,0,0.10)`                                                                                                                                                                           | Warning badge background (e.g. a development build on About)                   |
| `--n-success`                                  | `#1d7a3a`                                                                                                                                                                                       | Download complete, "Release" badge (5.4:1)                                     |
| `--n-success-soft`                             | `rgba(29,122,58,0.10)`                                                                                                                                                                          | Success badge background                                                       |
| `--n-private-strip`                            | `#e4def4`                                                                                                                                                                                       | Private window tab strip                                                       |
| `--n-private-toolbar`                          | `#efebf8`                                                                                                                                                                                       | Private window toolbar and active tab                                          |
| `--n-private-line`                             | `#cdc4e6`                                                                                                                                                                                       | Private window hairlines                                                       |
| `--n-private-text`                             | `#3f3a52`                                                                                                                                                                                       | Inactive tabs and icons in private windows (8.3:1)                             |
| `--n-private-label-bg`                         | `#d3c8ef`                                                                                                                                                                                       | "Private" label background                                                     |
| `--n-private-label-text`                       | `#3b2d78`                                                                                                                                                                                       | "Private" label text (7.3:1)                                                   |
| `--n-data-0` … `--n-data-4`                    | `#e2e5e9` `#a4afbf` `#8693a6` `#6a788e` `#4f5f76`                                                                                                                                               | Activity map steps; bars use step 2 and always show their value                |
| `--n-storage-*` (storage bar only, this order) | `--n-storage-images` `#5b9a5f`, `--n-storage-media` `#8a6bbf`, `--n-storage-archives` `#b98a35`, `--n-storage-apps` `#547ebe`, `--n-storage-documents` `#c0744d`, `--n-storage-other` `#8e8e93` | Parts of a whole, always with a legend                                         |

When the OS asks for more contrast (`prefers-contrast: more`), separators step up to `#8e8e93`, control edges to `#6e6e73`, and tertiary text becomes secondary.

### 3.5 Radii

```
--n-r-key:     2px;   /* keycaps, checkboxes */
--n-r-icon:    3px;   /* icon buttons, the "Private" label */
--n-r-control: 4px;   /* tabs (top corners), address field, buttons, inputs, selects, segmented, list and menu rows, icon wells */
--n-r-badge:   5px;   /* badges */
--n-r-panel:   6px;   /* grey panels, menus, cards, popovers */
--n-r-chip:    7px;   /* filter chips */
--n-r-dialog:  8px;   /* dialogs, ⌘K palette, ⌘O switcher */
--n-r-full:  999px;   /* switches, radios, dots, rings */
```

### 3.6 Spacing

Unchanged: `--spacing-xs/sm/md/lg/xl/xxl` = 4 / 8 / 16 / 24 / 32 / 48 px. A 4 px grid; component internals may also use 2, 6, 10, 12, 14 and 20.

### 3.7 Typography

Font stack (unchanged): `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif` — SF Pro on macOS, Segoe UI on Windows, Roboto on Linux. Don't bundle a font.

Mono: `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace`. Reader mode keeps its Georgia serif for article text.

| Role        | Size / line height           | Weight           | Use                                                |
| ----------- | ---------------------------- | ---------------- | -------------------------------------------------- |
| Large title | 28 / 34                      | 700, −0.02em     | Page titles (History, Settings sections, About)    |
| Title       | 22 / 28                      | 700              | Interstitial headings                              |
| Headline    | 17 / 22                      | 600              | Dialog titles                                      |
| Address     | 14 / 20                      | 400 (domain 600) | The address field                                  |
| Body        | 13 / 18                      | 400 / 500        | Default UI text; 500 for row titles, tabs, buttons |
| Callout     | 12 / 16                      | 400 / 600        | Secondary lines, meta, group labels (600)          |
| Footnote    | 11 / 14                      | 400 / 600        | Badges, keycaps, tiny labels                       |
| Mono        | 12 / 16 (11.5 in tight rows) | 400              | Codes, hashes, paths, UA string                    |

Use tabular numerals (`font-variant-numeric: tabular-nums`) for times, sizes, counts and versions.

### 3.8 Materials, shadows and focus

```
--n-menu-bg:      rgba(248, 248, 250, 0.88);
--n-menu-blur:    blur(30px) saturate(1.8);          /* backdrop-filter for menus, popovers, ⌘K, ⌘O, dialogs */
--n-menu-shadow:  0 0 0 0.5px rgba(0,0,0,0.14), 0 24px 60px rgba(0,0,0,0.20), 0 4px 12px rgba(0,0,0,0.08);
--n-field-shadow: 0 0 0 0.5px rgba(0,0,0,0.18), 0 1px 1px rgba(0,0,0,0.04);   /* address field, white inputs */
--n-raised-shadow: 0 0 0 0.5px rgba(0,0,0,0.18), 0 1px 1px rgba(0,0,0,0.05);  /* white buttons on grey panels */
--n-focus-ring:   0 0 0 3px var(--n-focus);                                     /* buttons, rows, chips */
--n-focus-ring-field: 0 0 0 1px var(--n-accent), 0 0 0 4px var(--n-focus);     /* text fields */
--n-focus-danger: rgba(215, 0, 21, 0.18);                                       /* danger focus halo */
--n-focus-ring-field-danger: 0 0 0 1px var(--n-danger), 0 0 0 4px var(--n-focus-danger); /* invalid field (find: no matches / invalid regex) */
```

Under `prefers-reduced-transparency: reduce`, menus drop the blur and use `--n-menu-solid`.

### 3.9 Motion

`--dur-fast: 120ms`, `--dur-med: 220ms`. Hover and focus changes use `--dur-fast`; panel reveals ~180 ms. Only the tab loader and download progress animate continuously. Everything is gated on `@media (prefers-reduced-motion: reduce)`. No infinite pulses (the old insecure-icon pulse is removed).

### 3.10 Z-index

Unchanged: `--z-dropdown 100`, `--z-sticky 200`, `--z-modal 1000`, `--z-toast 1100`.

---

## 4. Layout patterns

### 4.1 Window chrome (`src/renderer/browser-layout/`)

**Tab strip** — 40 px, `--n-strip`, with an inset 1 px `--n-chrome-line` at the bottom.

- Tabs start 6 px below the top of the strip (34 px tall), top corners `--n-r-control`, flex basis 220 px, minimum 72 px, then scroll buttons appear.
- **Active tab:** `--n-toolbar` background, 1 px `--n-chrome-line` on top, left and right, **no bottom edge**, so it joins the toolbar. Title 12 px, 500, `--n-text-1`.
- **Inactive tab:** transparent, title 12 px `--n-text-2`; hover `--n-tab-hover`; the close button (18 px, `--n-r-icon`) appears on hover only.
- 16 px `--n-tab-divider` between inactive tabs, hidden next to the active or hovered tab.
- Pinned tabs are 36 px wide, favicon only. While loading, a 14 px ring (2 px, track `--n-ring-track`, arc `--n-accent`) replaces the favicon.
- New-tab "+" sits at the far right (40 × 34, 18 px icon). Traffic lights and Windows controls are centred on the tab row.
- No coloured bar on the active tab.

**Toolbar** — 44 px, `--n-toolbar`, 1 px `--n-chrome-line` at the bottom. Buttons are 32 × 32, `--n-r-icon`, 18 px icons in `--n-text-2`, hover `--n-fill`, pressed `--n-fill-2`. Order (unchanged): back, forward, reload, `>_` (⌘K), address field, downloads (with a 2 px `--n-accent` progress ring while downloading), ⋮.

**Address field** — 32 px, `--n-card`, `--n-r-control`, `--n-field-shadow`; focused: `--n-focus-ring-field`. 14 px text.

- At rest, the URL is split for display: scheme, subdomain and path in `--n-text-3`; the registrable domain in `--n-text-1` weight 600. The scheme is lowercase (`nav0://`, never `Nav0://`).
- Leading indicator (30 × 28): secure = `lock` in `--n-text-3` (neutral, never green); not secure (HTTP or bypassed certificate) = `triangle-alert` in `--n-danger`, static. A bypassed certificate also shows `https` struck through in red. Built-in pages and typing show `search`.
- Trailing field buttons (reader, PDF, bookmark / reading queue): 28 × 28, 16 px icons in `--n-text-3`; when on, icon `--n-accent` on `--n-accent-soft`.

**Find in page** — a 44 px bar under the toolbar, `--n-toolbar`, bottom line `--n-chrome-line`. Field 400 px wide, 30 px, white, ring as above, match counter inside the field at the right (12 px `--n-text-3`, e.g. "3 of 12"). "No matches" and "Invalid regex" turn the text, counter and ring `--n-danger`. Option toggles **Aa**, **|ab|**, **.\*** are 28 px; on = `--n-accent` text on `--n-accent-soft`. Divider, previous/next (disabled `--n-text-4` when there's nothing to move to), and close at the far right.

**Private windows** — strip `--n-private-strip`, toolbar and active tab `--n-private-toolbar`, lines `--n-private-line`, text and icons `--n-private-text`, plus a "Private" label (`shield-check` + "Private", 12 px 600, `--n-private-label-bg` / `--n-private-label-text`, `--n-r-icon`) after the traffic lights. Never red.

### 4.2 Built-in pages (`src/renderer/pages/<page>/`)

- Canvas `--n-page`. Content column 880 px (new tab, history, bookmarks, downloads) or 680 px (settings, about), centred, 36–40 px top padding, 56 px bottom. The new-tab page is a hero exception: its content is centred lower (≈96 px top) and its search field is a taller filled field (44 px, `--n-r-panel`).
- Title: Large title (28 / 34, 700). **No masthead rule.**
- Toolbar under the title: a filled search field (`--n-fill`, `--n-r-control`, 32 px), a segmented control (track `--n-fill-2`, white raised thumb), secondary buttons (`--n-fill`), in that order.
- **Grey panels** (`--n-grouped`, `--n-r-panel`, 18–22 px padding) for charts, summaries and groups. No borders, no shadows.
- Lists sit directly on white: rows 54 px, hover `--n-hover` with `--n-r-control`; 32 px icon wells (`--n-r-control`, `--n-well`); title 13 px 500; meta 12 px `--n-text-3` (URLs are grey, not link blue); trailing actions appear on hover. Day or group headers are 13 px 600 with the date in `--n-text-3` and a `--n-separator` underneath.
- Filter chips: 28 px, `--n-r-chip`, `--n-fill` at rest, selection style when chosen, 14 px icons. Badges: 22 px, `--n-r-badge`, `--n-fill`, icon + label, `--n-text-2`.

### 4.3 Settings (`src/renderer/pages/browser-settings/`)

- Sidebar 248 px, `--n-grouped`, right border `--n-separator`; search field white with `--n-field-shadow`; items 32 px, `--n-r-control`, 15 px icons; the current section uses the selection style.
- Content: white page, 680 px column. Each group = a header **outside** the panel (13 px 600 title, 12 px `--n-text-3` description, 16 px left inset) + a grey panel.
- Rows inside panels: 12 px × 16 px padding, label 13 px, description 12 px `--n-text-3`, control on the right. Dividers `--n-panel-line`, inset 16 px (44 px under radio rows).
- Controls inside panels are white: inputs and selects (`--n-field-shadow`), buttons (`--n-raised-shadow`). Buttons that sit on the white page use the secondary fill.
- "Recommended" is a neutral badge, not red. Permission names are sentence case (no `text-transform: uppercase`).

### 4.4 Overlays (`src/renderer/overlay/panels/<name>/`)

- Material: `--n-menu-bg` + `backdrop-filter: var(--n-menu-blur)` + `--n-menu-shadow`. Radius `--n-r-panel` for menus and popovers, `--n-r-dialog` for ⌘K, ⌘O and dialogs. ⌘K, ⌘O and dialogs sit on `--n-scrim`.
- Menu rows 30 px, `--n-r-control`, 6 px panel padding, 16 px icons in `--n-text-2`; hover or keyboard selection = selection style. Shortcuts right-aligned, 12 px `--n-text-3`, as glyphs on macOS (⌘T, ⇧⌘N, ⌥⌘I) and `Ctrl+T` elsewhere. Separators 1 px `--n-menu-line`, 8 px inset.
- ⌘K: group labels 12 px 600 `--n-text-3`; secondary lines in `--n-text-3` (never link blue); keycap hints stay in the header, small and grey.
- ⌘O: four columns, cards `--n-r-panel`, two-line titles, neutral window headers (no coloured rules); the active tab of each window is a small grey dot.
- Inputs inside overlays are white with `--n-field-shadow`.
- Slide-in ~180 ms, gated on `prefers-reduced-motion`. The URL autocomplete is closed before any modal overlay opens (unchanged).

### 4.5 Dialogs and interstitials

- Dialogs: overlay material, `--n-r-dialog`, 20 px padding, title Headline (17 / 22, 600); actions right-aligned: Cancel (secondary) then the primary action. A destructive confirm uses the danger button — the only place red fills a surface.
- Network error and certificate warning pages are **light** like every other page: an icon well, a small mono code line, a 22 px heading, plain-language text, a numbered "Try this" list (not radio circles), and one primary action. The certificate warning uses a red title and icon; "Proceed (unsafe)" is a red text link behind "Advanced".

---

## 5. Component patterns

All of these live in `global.css` — **reuse them.** Fork a class into page-local CSS only when the design genuinely diverges.

### 5.1 Buttons (32 px on pages, 28–30 px in panels and dialogs; `--n-r-control`; 13 px 500)

| Class            | Look                                                      | Use                                             |
| ---------------- | --------------------------------------------------------- | ----------------------------------------------- |
| `.btn-primary`   | `--n-accent` fill, white text                             | One per view                                    |
| `.btn-secondary` | `--n-fill`, `--n-text-1`                                  | Default action on a white page; Cancel          |
| `.btn-raised`    | White, `--n-raised-shadow`                                | Actions inside grey panels                      |
| `.btn-ghost`     | Transparent, hover `--n-fill`                             | Reset and other tertiary actions                |
| `.btn-danger`    | `--n-danger` fill, white text                             | Only the confirm button of a destructive action |
| `.btn-icon`      | 32 × 32 (toolbar) or 28 × 28 (fields, bars), `--n-r-icon` | Icon-only; always `aria-label` + `title`        |

### 5.2 Form controls

- Text inputs and selects: white, `--n-field-shadow`, `--n-r-control`, 28–32 px, 13 px; focus `--n-focus-ring-field`. Search fields on a page are filled (`--n-fill`) instead.
- Switch: 38 × 22 (32 × 19 in dense lists); on = `--n-accent`; off = `--n-track` with an inset 1 px `--n-control-edge`. White knob.
- Checkbox 16 px, `--n-r-key`; radio 16 px round. On = `--n-accent` with a white mark; off = white with `--n-control-edge`.
- Segmented control: track `--n-fill-2`, 2 px padding, the chosen segment is a white raised thumb (no colour).

### 5.3 Panels, rows, badges, keycaps, progress

- Panel: `--n-grouped`, `--n-r-panel`. No `.card` borders.
- Keycaps: 20 px tall, min-width 20, `--n-r-key`, `--n-fill-2`, 11 px 500 `--n-text-2`, one keycap per key.
- Progress bar: 4 px, track `--n-track`, fill `--n-accent`. Download ring: 2 px.
- Tooltip: `--n-text-1` background, white 11 px text, `--n-r-control`.

---

## 6. Iconography — Lucide only

```html
<i data-lucide="lock" width="16" height="16"></i>
```

```ts
import { createIcons, icons } from 'lucide';
createIcons({ icons });
```

- Sizes: 18 px toolbar, 16 px fields, menus and buttons, 14 px inline. Default 2 px stroke.
- Colour comes from `currentColor` — set `color` on the container.
- The error page and certificate warning keep their own inline SVGs (they're served from the main process); everything in the renderer uses Lucide.

---

## 7. File organisation

| Where                                           | What                                                    |
| ----------------------------------------------- | ------------------------------------------------------- |
| `src/renderer/styles/global.css`                | Tokens, resets, utilities, base components              |
| `src/renderer/styles/notification.css`          | Cross-page notification styles                          |
| `src/renderer/pages/<page>/index.css`           | Per-page CSS — must `@import` global.css                |
| `src/renderer/overlay/panels/<name>/<name>.css` | Overlay panel CSS                                       |
| `src/renderer/browser-layout/*.css`             | Chrome (tabs, nav bar, find in page, permission prompt) |
| `src/renderer/assets/`                          | Logo, favicon — no inline data URLs for branding        |

**Never** add CSS under `src/main/` (the error and SSL pages are self-contained HTML templates and keep their own inline `<style>`). **Never** add a webpack entry point silently — register it in `forge.config.ts` _and_ `webpack.renderer.config.ts`.

---

## 8. Anti-patterns — refuse these

| Anti-pattern                                                           | Why                              | Do this instead                                                       |
| ---------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------- |
| Red (`--nav0-red-*`, `--n-danger`) on a selection, toggle, rule or tab | Red means danger only            | Selection style; `--n-accent` for on-states                           |
| 2 px coloured anchor bar on rows or tabs                               | Retired                          | Selection style                                                       |
| Grey page background with white cards                                  | One page background              | White page, grey panels                                               |
| Bordered white cards on a page                                         | Visual noise                     | Grey panel, no border                                                 |
| Warm off-white chrome (`#f7f6f4`, `#e7e5e1`, …)                        | Retired                          | `--n-toolbar`, `--n-strip`                                            |
| A line between the active tab and the toolbar                          | The active tab is connected      | No bottom edge on the active tab                                      |
| `border-radius: 12px / 16px / 999px` on cards, buttons, chips          | Off the scale                    | `--n-r-*`                                                             |
| Page titles at weight 200/300, or a rule under the title               | Retired masthead                 | Large title, 700                                                      |
| Solid accent fill with white text for a selected row                   | Too heavy                        | `--n-accent-soft` + dark text                                         |
| `outline: 2px solid #000` / focus ring on click                        | Harsh, and shows for mouse users | `:focus-visible` + `--n-focus-ring`                                   |
| Link-blue URLs in lists and palettes                                   | Competes with titles             | `--n-text-3`                                                          |
| Coloured category labels                                               | Colour carries no meaning        | Icon + label on a neutral badge                                       |
| `animation: … infinite` in the chrome                                  | Distracting                      | Static state; only loaders animate                                    |
| Black page inside light chrome (certificate warning)                   | Two themes in one window         | Light page, red heading and icon                                      |
| `text-transform: uppercase` on labels                                  | Shouty, harder to read           | Sentence case, 12 px 600 if it must stand out                         |
| `word-break: break-all` on prose or the UA string                      | Breaks words mid-way             | Normal wrapping (`overflow-wrap: anywhere` only for unbroken strings) |
| Hardcoded hex, inline `style=""`, raw `<svg>`, `z-index: 9999`         | Drift                            | Tokens, classes, Lucide, the z-index scale                            |

---

## 9. Adding a new built-in page — checklist

1. Folder `src/renderer/pages/<name>/` with `index.html`, `index.css`, `index.ts`; CSS starts with the `global.css` import.
2. White page, 880 or 680 px column, Large title, toolbar row if needed, grey panels for groups, lists on white (§4.2).
3. Register the webpack entry point in both `forge.config.ts` and `webpack.renderer.config.ts`.
4. Lucide icons; `createIcons({ icons })` after the DOM is ready.
5. No analytics, telemetry, network calls or third-party fonts/CSS.
6. Check it in normal and private windows, with reduced motion, reduced transparency and increased contrast.

---

## 10. Pre-flight checklist before reporting a UI change "done"

- [ ] CSS imports `global.css`; no hardcoded colours, radii, font sizes or off-scale spacing.
- [ ] Red appears only for danger (insecure, failure, destructive confirm).
- [ ] Selection uses `--n-accent-soft` + `--n-text-1` + `--n-accent` icon.
- [ ] Built-in pages are white; groups are grey panels; controls inside panels are white.
- [ ] Focus rings use `:focus-visible`; nothing outlines on mouse click.
- [ ] Icons are Lucide at 18 / 16 / 14 px; no inline `<svg>` in the renderer.
- [ ] No inline `style=""` in HTML; no DOM-level inline styles in TS.
- [ ] Mono only on code-like content.
- [ ] `prefers-reduced-motion` and `prefers-reduced-transparency` honoured.
- [ ] `npm run lint` passes; the app boots with `npm run start`; checked in a normal and a private window.
- [ ] Any new token or component is in `global.css` **and** documented here.

If you can't tick every relevant box, say so explicitly — don't report the change as complete.
