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
11. **Icons are Lucide** (the version pinned in `package.json`) at the default 2 px stroke: 18 px in the toolbar, 16 px in menus, lists on a white page and the address field, 14 px in text buttons. §6 gives the size for every other place (search fields, the Settings sidebar, chips, badges).
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

| Token              | Value               | Use                                                                                          |
| ------------------ | ------------------- | -------------------------------------------------------------------------------------------- |
| `--n-page`         | `#ffffff`           | Built-in page canvas (every page)                                                            |
| `--n-grouped`      | `#f5f5f7`           | Grey panels on a page (settings groups, history charts, storage), the Settings sidebar       |
| `--n-card`         | `#ffffff`           | Fields and buttons inside grey panels; the address field                                     |
| `--n-strip`        | `#e6e6e9`           | Tab strip, behind inactive tabs                                                              |
| `--n-toolbar`      | `#f6f6f7`           | Toolbar, the active tab and the find bar — one connected surface                             |
| `--n-chrome-line`  | `#d1d1d6`           | Under the tab strip (except under the active tab) and under the toolbar                      |
| `--n-separator`    | `#e5e5ea`           | Row dividers on white, inset 16 px                                                           |
| `--n-panel-line`   | `rgba(0,0,0,0.07)`  | Row dividers inside grey panels                                                              |
| `--n-fill`         | `rgba(0,0,0,0.05)`  | Search fields on a page, secondary buttons, chips and badges at rest                         |
| `--n-fill-2`       | `rgba(0,0,0,0.07)`  | Segmented-control track, keycaps, pressed toolbar button                                     |
| `--n-hover`        | `rgba(0,0,0,0.04)`  | Row hover                                                                                    |
| `--n-tab-hover`    | `rgba(0,0,0,0.045)` | Inactive tab hover                                                                           |
| `--n-tab-divider`  | `rgba(0,0,0,0.14)`  | Short vertical dividers: 16 px between inactive tabs, 12 px inside the History duration pill |
| `--n-control-edge` | `#8e8e93`           | Edge of an off switch, checkbox or radio (3.3:1 on white)                                    |
| `--n-track`        | `#e5e5ea`           | Off switch track                                                                             |
| `--n-scrim`        | `rgba(0,0,0,0.12)`  | Behind ⌘K, ⌘O and dialogs                                                                    |
| `--n-well`         | `#f2f2f4`           | Icon and favicon wells on a white page (use `--n-card` for wells inside grey panels)         |
| `--n-menu-line`    | `rgba(0,0,0,0.09)`  | Separators inside menus, ⌘K, ⌘O and popovers                                                 |
| `--n-ring-track`   | `rgba(0,0,0,0.12)`  | Track of the tab loader and the download ring                                                |
| `--n-menu-solid`   | `#f8f8fa`           | Menu background when the OS asks to reduce transparency                                      |

### 3.3 Text

| Token        | Value     | Contrast                         | Use                                                |
| ------------ | --------- | -------------------------------- | -------------------------------------------------- |
| `--n-text-1` | `#1d1d1f` | 16.8:1 on white, 13.5:1 on strip | Primary text, titles, active tab                   |
| `--n-text-2` | `#424245` | 10.0:1 on white, 8.0:1 on strip  | Body, inactive tabs, icons                         |
| `--n-text-3` | `#6e6e73` | 5.1:1 on white                   | Secondary text, meta, placeholders. Never on strip |
| `--n-text-4` | `#aeaeb2` | —                                | Disabled only                                      |

`--n-on-accent` (`#ffffff`) is the text and icon colour on a filled `--n-accent` or `--n-danger` surface (primary and danger buttons, the checkbox mark, the radio dot; 5.4:1) and on dark `--n-text-1` fills: the status bubble ("Copied" on About), the toast and the attachment remove button in Report an Issue (hover `--n-text-2`). Use it instead of a `#fff` literal.

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

The storage bar and its legend show six groups, one hue each, named in the legend: Image, Video & audio, Archive, Installer, Document (with spreadsheets, presentations and ebooks) and Other (with code and fonts). The Downloads filter chips keep the finer file types.

When the OS asks for more contrast (`prefers-contrast: more`), every separator and hairline (`--n-separator`, `--n-chrome-line`, `--n-menu-line`, `--n-panel-line`, `--n-tab-divider`, `--n-private-line`) steps up to `#8e8e93`, control edges (`--n-control-edge`) to `#6e6e73`, and tertiary text becomes secondary. The 0.5 px edges inside the shadow tokens (§3.8) don't change.

### 3.5 Radii

```
--n-r-key:     2px;   /* keycaps, checkboxes, segmented-control segments, progress bars */
--n-r-icon:    3px;   /* icon buttons, the "Private" label */
--n-r-control: 4px;   /* tabs (top corners), address field, buttons, inputs, selects, segmented, list and menu rows, icon wells, ⌘O tab cards, tooltips */
--n-r-badge:   5px;   /* badges */
--n-r-panel:   6px;   /* grey panels (.card), menus, popovers, toasts, the screen-share picker's source cards */
--n-r-chip:    7px;   /* filter chips */
--n-r-dialog:  8px;   /* dialogs, ⌘K palette, ⌘O switcher */
--n-r-full:  999px;   /* switches, radios, dots, rings */
```

### 3.6 Spacing

Unchanged: `--spacing-xs/sm/md/lg/xl/xxl` = 4 / 8 / 16 / 24 / 32 / 48 px. A 4 px grid; component internals may also use 2, 6, 10, 12, 14 and 20.

### 3.7 Typography

Font stack (unchanged): `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif` — SF Pro on macOS, Segoe UI on Windows, Roboto on Linux. Don't bundle a font.

Mono: `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace`. Reader mode keeps its Georgia serif for article text.

| Role        | Size / line height           | Weight           | Use                                                                                                                 |
| ----------- | ---------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| Large title | 28 / 34                      | 700, −0.02em     | Page titles (History, Settings sections, About)                                                                     |
| Title       | 22 / 28                      | 700              | Interstitial headings                                                                                               |
| Headline    | 17 / 22                      | 600              | Dialog titles                                                                                                       |
| Address     | 14 / 20                      | 400 (domain 600) | The address field                                                                                                   |
| Body        | 13 / 18                      | 400 / 500 / 600  | Default UI text; 500 for row titles, buttons and the chosen chip or segment; 600 for group and day headers          |
| Callout     | 12 / 16                      | 400 / 500 / 600  | Secondary lines and meta (400); tab titles and field labels (500); a label over a group, such as "Categories" (600) |
| Footnote    | 11 / 14                      | 400 / 500 / 600  | Tiny labels (400); keycaps (500); small badges, state badges and ⌘K group labels (600)                              |
| Mono        | 12 / 16 (11.5 in tight rows) | 400              | Codes, hashes, paths, UA string                                                                                     |

Use tabular numerals (`font-variant-numeric: tabular-nums`) for times, sizes, counts and versions.

One time and date format, from `FormatUtils` (`src/renderer/common/format-utils.ts`: `formatTime`, `formatDate`, `formatDateTime`) in History, Downloads, Bookmarks, ⌘K, the New Tab search and the URL autocomplete. Times use the app locale with hour `'numeric'` and minute `'2-digit'`, so an hour never has a leading zero: "5:03 PM" in US English, "5:03 pm" in Indian English, "17:03" in British English. Dates read "May 24", with the year only when it isn't the current year. Relative labels ("Today, 5:03 PM", "Yesterday", "5mo ago") stay, built on these.

Capitalisation follows the macOS rule. **Title Case** for page and dialog titles, section and panel headings, buttons, menu items, tabs, segments, sidebar items, column headers and link rows that open a page (About's links): "Top Sites by Active Time", "Reading Queue", "Sign In". **Sentence case** for row labels (including switch, radio, checkbox and field labels), descriptions, placeholders, tooltips, messages and badges: "Custom user agent string", "Match case (Alt+C)". Permission names are sentence case ("Camera/microphone").

Write "…" (one character), never "...": in placeholders ("Search history…"), commands that open a dialog ("Print…", "Settings…") and progress labels ("Submitting…"). Text that doesn't fit is cut by CSS (`text-overflow: ellipsis`), not in code.

### 3.8 Materials, shadows and focus

```
--n-menu-bg:      rgba(248, 248, 250, 0.88);
--n-palette-bg:   rgba(248, 248, 250, 0.98);          /* ⌘K and ⌘O only, with the same blur and shadow */
--n-menu-blur:    blur(30px) saturate(1.8);          /* backdrop-filter for menus, popovers, ⌘K, ⌘O, dialogs */
--n-menu-shadow:  0 0 0 0.5px rgba(0,0,0,0.14), 0 24px 60px rgba(0,0,0,0.20), 0 4px 12px rgba(0,0,0,0.08);
--n-field-shadow: 0 0 0 0.5px rgba(0,0,0,0.18), 0 1px 1px rgba(0,0,0,0.04);   /* white fields in the chrome: address field, find field */
--n-sidebar-field-shadow: 0 0 0 0.5px rgba(0,0,0,0.14);                       /* the white search field on the grey Settings sidebar */
--n-input-shadow: 0 0 0 0.5px rgba(0,0,0,0.16), inset 0 1px 1px rgba(0,0,0,0.04); /* white text inputs in grey panels and dialogs */
--n-select-shadow: 0 0 0 0.5px rgba(0,0,0,0.16), 0 1px 2px rgba(0,0,0,0.06);  /* selects (pop-up buttons) */
--n-readonly-field-shadow: 0 0 0 0.5px rgba(0,0,0,0.12);                      /* read-only value fields (About checksums) */
--n-raised-shadow: 0 0 0 0.5px rgba(0,0,0,0.18), 0 1px 1px rgba(0,0,0,0.05);  /* white buttons on grey panels */
--n-card-shadow:  0 0 0 0.5px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.04);   /* cards on a frosted surface (⌘O tab cards) */
--n-thumb-shadow: 0 0 0 0.5px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.10);   /* the chosen segment of a segmented control */
--n-knob-shadow:  0 1px 2px rgba(0,0,0,0.30);                                   /* switch knob, on */
--n-knob-shadow-off: 0 0 0 0.5px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.25); /* switch knob, off */
--n-focus-ring:   0 0 0 3px var(--n-focus);                                     /* buttons, rows, chips */
--n-focus-ring-inset: inset 0 0 0 3px var(--n-focus);                           /* the same ring inside a control flush with a clipping edge (the strip's +) */
--n-focus-ring-field: 0 0 0 1px var(--n-accent), 0 0 0 4px var(--n-focus);     /* text fields */
--n-focus-danger: rgba(215, 0, 21, 0.18);                                       /* danger focus halo */
--n-focus-ring-field-danger: 0 0 0 1px var(--n-danger), 0 0 0 4px var(--n-focus-danger); /* invalid field (find: no matches / invalid regex) */
--shadow-sm:      0 1px 2px rgba(0,0,0,0.06);                                   /* generic: the .shadow-sm utility */
--shadow-md:      0 2px 8px rgba(0,0,0,0.06);                                   /* generic: the .shadow utility */
```

Shadows come only from these tokens. Each `--n-*` one belongs to a kind of control, so pick by role, not by look; a control that needs a new elevation gets a token here (and in `global.css`) first. `--shadow-sm` and `--shadow-md` are older generic shadows kept for the `.shadow-sm` and `.shadow` utilities (`.shadow-lg` is `--n-menu-shadow`). No redesigned control uses them; don't reach for them in new work.

Under `prefers-reduced-transparency: reduce`, menus drop the blur and use `--n-menu-solid`.

`--n-palette-bg` is 98 % opaque so that every text colour in ⌘K and ⌘O keeps at least 4.5:1 over any page, a black one included (`--n-text-3` is 4.58:1 there). The ⋮ menu, popovers and dialogs keep `--n-menu-bg`. Under reduced transparency it turns `--n-menu-solid` too.

A button or link clicked with the mouse gives up focus afterwards, as on macOS, so no later key (Shift as a screenshot starts, Esc, an arrow) can bring up its ring. Keyboard focus is untouched. The internals preload (`src/preload/internals-api.ts`) does this for the chrome, the overlay and every built-in page.

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
- New-tab "+" sits at the far right (40 × 34, 18 px icon). Traffic lights and Windows controls are centred on the tab row. On macOS the native lights sit in a 78 px column (centres 20 / 40 / 60 px in, 23 px down: `trafficLightPosition` in `app-window.ts`), at the right end instead when a right-to-left language mirrors the title bar; in fullscreen, where they hide, the strip draws the same cluster itself.
- The "+" is flush with the window edge and the toolbar, so its focus ring is drawn inside it (`--n-focus-ring-inset`).
- No coloured bar on the active tab.

**Toolbar** — 44 px, `--n-toolbar`, 1 px `--n-chrome-line` at the bottom. Buttons are 32 × 32, `--n-r-icon`, 18 px icons in `--n-text-2`, hover `--n-fill`, pressed `--n-fill-2`. A button that opens a popover (⋮, and the security indicator) stays pressed while it's open. Order (unchanged): back, forward, reload, `>_` (⌘K), address field, downloads (with a 2 px `--n-accent` progress ring while downloading), ⋮.

**Address field** — 32 px, `--n-card`, `--n-r-control`, `--n-field-shadow`; focused: `--n-focus-ring-field`. 14 px text.

- At rest, the URL is split for display: scheme, subdomain and path in `--n-text-3`; the registrable domain in `--n-text-1` weight 600. The scheme is lowercase (`nav0://`, never `Nav0://`).
- Leading indicator (30 × 28): secure = `lock` in `--n-text-3` (neutral, never green); not secure (HTTP, a certificate warning, or a bypassed certificate) = `triangle-alert` in `--n-danger`, static. A certificate error (on the warning, or after bypassing it) also shows `https` struck through in red. Built-in pages, a failed load and typing (the field no longer holds the page's URL) show `search`, which is display-only.
- Trailing field buttons (reader, PDF, bookmark / reading queue): 28 × 28, 16 px icons in `--n-text-3`; when on, icon `--n-accent` on `--n-accent-soft`. They hide while the URL is being edited.

**Find in page** — a 44 px bar under the toolbar, `--n-toolbar`, bottom line `--n-chrome-line`. Field 400 px wide, 30 px, white, ring as above, match counter inside the field at the right (12 px `--n-text-3`, e.g. "3 of 12"). "No matches" and "Invalid regex" turn the text, counter and ring `--n-danger`. Option toggles **Aa**, **|ab|**, **.\*** are 28 px; on = `--n-accent` text on `--n-accent-soft`. Divider, previous/next (disabled `--n-text-4` when there's nothing to move to), and close at the far right.

**Private windows** — strip `--n-private-strip`, toolbar and active tab `--n-private-toolbar`, lines `--n-private-line`, text and icons `--n-private-text`, plus a "Private" label (`eye-off` + "Private", 12 px 600, `--n-private-label-bg` / `--n-private-label-text`, `--n-r-icon`) first in the strip, after the traffic lights when they sit at the left. Never red.

**Link status bar** — hovering or focusing a link in a page shows its URL at the bottom-left of the page: 12 / 16 text (400) in `--n-text-2` on `--n-toolbar`, `4px 8px` padding (24 px tall), a 1 px `--n-chrome-line` edge on the top and right (`#8e8e93` under `prefers-contrast: more`), an `--n-r-control` top-right corner and no shadow. It is at most 60 % of the page wide, cut with "…" (URLs over 120 characters too), and fades in over `--dur-fast` (no 2 px rise under reduced motion). On built-in pages it shows a link's `nav0://` address, or nothing. It lives inside the page (`src/main/browser/hover-status-bar-script.ts` injects it in a closed shadow root), where `global.css` can't reach, so it repeats these tokens' values as literals: change them there when a token changes.

### 4.2 Built-in pages (`src/renderer/pages/<page>/`)

- Canvas `--n-page`. Content column 880 px (new tab, history, bookmarks, downloads) or 680 px (settings, about), centred, 36–40 px top padding, 56 px bottom. The new-tab page is a hero exception: its content is centred lower (≈96 px top) and its search field is a taller filled field (44 px, `--n-r-panel`).
- Title: Large title (28 / 34, 700). **No masthead rule.**
- Toolbar under the title: a filled search field (`.search-field`: `--n-fill`, `--n-r-control`, 32 px; white with the field ring while focused), a segmented control (track `--n-fill-2`, the chosen segment a white thumb with `--n-thumb-shadow`), secondary buttons (`--n-fill`), in that order, 12 px apart.
- **Grey panels** (`--n-grouped`, `--n-r-panel`, 20 px padding) for charts, summaries and groups. No borders, no shadows.
- Lists sit directly on white: rows 54 px, hover `--n-hover` with `--n-r-control`; 28 px icon wells (`--n-r-control`, `--n-well`) holding a 16 px icon or favicon; title 13 px 500; meta 12 px `--n-text-3` (URLs are grey, not link blue); row actions appear on hover just outside the row's right edge, so no column is kept for them (the column's side gutters are 64 px so two always fit). Day or group headers are 13 px 600 with the date in `--n-text-3` and a `--n-separator` underneath.
- Filter chips (`.chip`): 28 px, `--n-r-chip`, `--n-fill` at rest, selection style when chosen, 14 px icons. Badges (`.badge`): 22 px, `--n-r-badge`, `--n-fill`, 12 px icon + 12 px label, `--n-text-2`.
- History, Bookmarks and Downloads share one layout, built only from the list-page classes in `global.css`: `.list-page` around an 880 px `.list-column`, the `.list-title`, a `.list-toolbar` (`.search-field`, `.segmented`, `.btn-secondary`), a `.chip-row`, `.panel`s, and a `.list-grid` of `.list-group-header`s and `.list-row`s (`.list-row-lead`, `.list-row-well`, `.list-row-content` holding `.list-row-title` and `.list-row-meta`, a `.badge`, `.list-row-actions` of `.list-row-action` buttons). A page's CSS sets only its own grid columns and what no other page has; never copy these into a page.
- A page's rows share one grid: the list is a `.list-grid` that sets the columns (its first track includes the row's 12 px left padding), and each `.list-row` is a subgrid of it. The badge and every column after it (History's duration pill; Downloads' state, a download's status then its size) are as wide as their widest entry in the list, so they line up row to row with no slack held for a longer value. The badge starts its column; on Bookmarks, where it is the last column, it ends it, flush with the row's right edge. On History each pill fits its text and ends its column, flush with the row's right edge, and the badge ends its column just before it: badges and pills both line up on their right edges. The pill column starts 8 px after the badge column (not the 12 px column gap), so the widest pill sits 8 px from its badge and shorter ones a little further.
- A row's meta line that holds a host and a path marks them `.meta-host` and `.meta-path`, joined by a `·`: the path truncates, the host never does. Bookmarks show domain · path (the saved date lives in its own column, never in the meta line); Downloads show source host · file path, the path in mono.
- **Built-in pages never load remote resources. Site icons come from the local favicon cache, or the letter tile.** The same goes for the overlay and the chrome: no `img-src` in their CSPs allows `http:` or `https:`.

### 4.3 Settings (`src/renderer/pages/browser-settings/`)

- Sidebar 248 px, `--n-grouped`, right border `--n-separator`; search field 30 px, white with `--n-sidebar-field-shadow` and a 14 px search icon; items 32 px, `--n-r-control`, 15 px icons; the current section uses the selection style.
- The sidebar fills the window height and stays put; only the content column scrolls.
- Content: white page, 680 px column. Each group = a header **outside** the panel (13 px 600 title, 12 px `--n-text-3` description, 16 px left inset) + a grey panel.
- Rows inside panels: 12 px × 16 px padding, label 13 px, description 12 px `--n-text-3`, control on the right. Dividers `--n-panel-line`, inset 16 px (44 px under radio rows).
- Controls inside panels are white: text inputs (`--n-input-shadow`, 30 px), selects (`--n-select-shadow`, 28 px; 26–30 px to match a row's other controls), buttons (`--n-raised-shadow`, 26–30 px). Buttons that sit on the white page use the secondary fill.
- Settings uses one switch size; a section switch aligns with the panel's switches.
- Buttons and selects in panel rows are both 28 px, so a single-line row with either is 52 px. The "Recommended" badge never makes its row taller.
- "Recommended" is a neutral badge, not red. Permission names are sentence case (no `text-transform: uppercase`).

### 4.4 Overlays (`src/renderer/overlay/panels/<name>/`)

- Material: `--n-menu-bg` (`--n-palette-bg` for ⌘K and ⌘O) + `backdrop-filter: var(--n-menu-blur)` + `--n-menu-shadow`. Radius `--n-r-panel` for menus and popovers, `--n-r-dialog` for ⌘K, ⌘O and dialogs. ⌘K, ⌘O and dialogs sit on `--n-scrim`.
- Menu rows 30 px, `--n-r-control`, 6 px panel padding, 16 px icons in `--n-text-2`; hover or keyboard selection = selection style. Shortcuts right-aligned, 12 px `--n-text-3`, as glyphs on macOS (⌘T, ⇧⌘N, ⌥⌘I) and `Ctrl+T` elsewhere. Separators 1 px `--n-menu-line`, 8 px inset.
- Menus are keyboard navigable; an open menu button shows `--n-fill-2`, never a ring.
- Secondary text in a selected row uses `--n-text-2`: `--n-text-3` on the `--n-accent-soft` highlight is under 4.5:1.
- ⌘K: group labels 11 px 600 `--n-text-3`; secondary lines in `--n-text-3` (never link blue); keycap hints stay in the header, small and grey.
- ⌘O: four columns of white cards (`--n-card`, `--n-r-control`, `--n-card-shadow`; the chosen card takes the selection style and drops the shadow), a 28 px favicon well (`--n-fill`, `--n-r-control`) holding a 16 px favicon as in ⌘K, two-line titles, neutral window headers (no coloured rules); the active tab of each window is a small grey dot.
- ⌘K and ⌘O fit their content up to 75vh.
- Menus and popovers open 4 px below their anchor; palettes sit 12 px below the toolbar.
- Text inputs inside dialogs are white with `--n-input-shadow` (30 px, a 12 px 500 `--n-text-2` label 5 px above); selects use `--n-select-shadow` and are 28 px (`select.form-control`).
- Slide-in ~180 ms, gated on `prefers-reduced-motion`. The URL autocomplete is closed before any modal overlay opens (unchanged).
- The URL autocomplete hangs 6 px under the toolbar, inset 2 px from each side of the address field. Its overlay view covers just the dropdown and its shadow's reach (6 px above, up to the toolbar's bottom line, 60 px either side, 84 px below), so the rest of the window stays clickable and the shadow shows whole except where the toolbar cuts it. A press in the shadow's margin is a click outside: the dropdown closes and the press (left, middle or right button, with its modifier keys) goes on to whatever lies beneath, the page or the chrome. Three limits while the dropdown is open: a press there can't reach a cross-site iframe, the mouse's Back and Forward buttons only close the dropdown (focus goes to the page), and wheel, hover and drags over the margin don't reach the page.

### 4.5 Dialogs and interstitials

- Dialogs: overlay material, `--n-r-dialog`, 20 px padding, title Headline (17 / 22, 600); actions right-aligned: Cancel (secondary) then the primary action. A destructive confirm uses the danger button — the only place red fills a surface.
- Page dialogs (`alert`, `confirm`, `prompt`) have no Headline: the "… says" line naming the page's origin is 13 px 600 `--n-text-1`, the message (13 / 19 px `--n-text-2`) sits 6 px under it; a prompt's field (`.form-control`) sits 12 px under the message; the actions come 16 px after the last of these.
- Network error and certificate warning pages are **light** like every other page: an icon well, a small mono code line, a 22 px heading, plain-language text, a numbered "Try this" list (not radio circles), and one primary action. The certificate warning uses a red title and icon; "Proceed (unsafe)" is a red text link behind "Advanced".

---

## 5. Component patterns

Every class named below lives in `global.css` — **reuse it.** Fork a class into page-local CSS only when the design genuinely diverges. The switch, checkbox and radio have no shared class yet: build them from the tokens and the exact values given here.

### 5.1 Buttons (32 px on pages, 26–30 px in panels and dialogs; `--n-r-control`; 13 px 500)

`.btn` is the base: 32 px tall, `0 14px` padding, no border, 13 px 500. A Lucide icon is 14 px and sits 6 px from the label (the flex `gap`, never an icon margin). `.btn-sm` makes it 28 px for panels and dialogs; set other heights (26 or 30 px) on the page.

| Class            | Look                                                                           | Use                                             |
| ---------------- | ------------------------------------------------------------------------------ | ----------------------------------------------- |
| `.btn-primary`   | `--n-accent` fill, `--n-on-accent` text; hover `--n-accent-hover`              | One per view                                    |
| `.btn-secondary` | `--n-fill`, `--n-text-1`; hover `--n-fill-2`                                   | Default action on a white page; Cancel          |
| `.btn-raised`    | White, `--n-raised-shadow` (kept under the focus ring)                         | Actions inside grey panels                      |
| `.btn-ghost`     | Transparent, `--n-text-2`; hover `--n-fill`                                    | Reset and other tertiary actions                |
| `.btn-danger`    | `--n-danger` fill, `--n-on-accent` text                                        | Only the confirm button of a destructive action |
| `.btn-icon`      | 32 × 32 (toolbar) or 28 × 28 (fields, bars), `--n-r-icon`, no border or margin | Icon-only; always `aria-label` + `title`        |

Pair `.btn-icon` with `.btn-ghost` for its hover fill; the container sets the spacing between icon buttons (2 px in the toolbar).

### 5.2 Form controls

- **Text input** (`.form-control`): white, `--n-input-shadow`, `--n-r-control`, 30 px (13 / 18 text, 10 px side padding), `--n-text-1`, placeholder `--n-text-3`; focus `--n-focus-ring-field`. Its label (`.form-label`) is 12 px 500 `--n-text-2`, 5 px above. The address and find fields in the chrome use `--n-field-shadow` instead.
- **Select**: a white pop-up button: `--n-select-shadow`, `--n-r-control`, 32 px on a page and 28 px in a panel or dialog, text 10 px in, a 13 px `chevron-down` in `--n-text-2` 8 px from the right. The bare `select` element gets this look by default at 32 px; `select.form-control` is the 28 px size. The field ring is on `:focus-visible`; Chromium also matches that after a mouse click on a select (it takes typed input, like a text field), so the ring follows a click there too.
- **Search field on a page** (`.search-field`): filled, not white: 32 px, `--n-fill`, `--n-r-control`, a 16 px search icon and the placeholder in `--n-text-3`, 8 px apart. While its input has focus, the field turns `--n-card` with `--n-focus-ring-field`; the icon stays `--n-text-3`. The input inside draws no ring of its own.
- Every search field on a page focuses this way, white with `--n-focus-ring-field`, never staying grey: History, Bookmarks, Downloads, and the Settings Keyboard Shortcuts and Site Permissions searches.
- **Switch**: 38 × 22, round; on = `--n-accent`; off = `--n-track` with an inset 1 px `--n-control-edge`. A white knob (18 px) 2 px in from the edge, `--n-knob-shadow` when on and `--n-knob-shadow-off` when off. Disabled = the switch at 40 % opacity and its label in `--n-text-4`.
- **Checkbox** 16 px, `--n-r-key`; **radio** 16 px round. On = `--n-accent` with an `--n-on-accent` mark (an 11 px check, a 6 px dot); off = white with an inset 1 px `--n-control-edge`.
- **Segmented control**: a 32 px track, `--n-fill-2`, `--n-r-control`, 2 px padding and 2 px between segments. Segments are 28 px, `0 12px`, `--n-r-key`, 13 px `--n-text-2`; the chosen one is a white thumb with `--n-thumb-shadow` and `--n-text-1` 500 text (no colour).
- The segmented control is `.segmented` holding `.segmented-btn` segments; the chosen one is `.active` (hover turns a segment's text `--n-text-1`), and a segment's count is a `.segmented-count` in `--n-text-3`.

### 5.3 Panels, rows, chips, badges, keycaps, progress

- Panel (`.card`): `--n-grouped`, `--n-r-panel`, no border, no shadow. Dividers inside it are `--n-panel-line`.
- Padded panel (`.panel`): the same grey panel with 20 px padding, for charts, summaries and the storage bar. Its header (`.panel-head`, 12 px above the content) holds a 13 px 600 `.panel-title` and, on the right, 12 px `--n-text-3` `.panel-meta`.
- Chip row (`.chip-row`): a `.chip-row-label` ("Categories", 12 px 600 `--n-text-3`), then the chips in a `.chip-row-chips` box.
- Chip rows never wrap; the "Categories" label sits beside them. Every chip row (Bookmarks, Downloads and the Settings Keyboard Shortcuts) keeps its chips on one line, 6 px apart. Past the column they scroll sideways with no scrollbar, a 32 px fade (a mask, not a surface gradient) marks each edge with more chips beyond it, and a mouse wheel scrolls them; choosing a chip brings it clear of the fades. `ChipRow.attach()` (`src/renderer/common/chip-row.ts`) does the fades, the wheel and the scrolling, once per `.chip-row-chips`; don't copy it.
- Filter chip (`.chip`; chosen = `.selected` or `.active`): 28 px, `0 10px`, `--n-r-chip`, `--n-fill` (hover `--n-fill-2`), 13 px `--n-text-1` with a 14 px `--n-text-2` icon 6 px from the label. Chosen = the selection style (`--n-accent-soft`, 500, icon `--n-accent`).
- Badge (`.badge`): 22 px, `0 8px`, `--n-r-badge`, `--n-fill`, 12 px `--n-text-2`, an optional 12 px icon 5 px from the label. Never a colour per category. `.badge-sm` is the 18 px, `0 7px`, 11 px 600 neutral tag ("Recommended"). A state badge (`.badge-success`, `.badge-warning`, `.badge-danger`) is a 20 px, `0 7px`, 11 px 600 tag in a soft pair (`--n-success` on `--n-success-soft`, and so on), like the Release / Dev build badge on About.
- Keycaps (`.keycap`): 20 px tall, min-width 20, `0 5px`, `--n-r-key`, `--n-fill-2`, 11 px 500 `--n-text-2` in the system sans stack, one keycap per key, no border, shadow or margin. Put a row of caps in a flex container 4 px apart.
- Favicon fallback (`.favicon-tile`): wherever a site icon can be missing (the tab strip, ⌘K, ⌘O, the URL autocomplete, History, Bookmarks, New Tab, Site Permissions, recently closed tabs), its slot shows a tile: `--n-text-3`, the first letter of the host without `www.` in 11 px 600 `--n-on-accent`, `--n-r-icon` corners, sized to the slot (16 px; 28 px with a 17 px letter on New Tab's tiles). The real icon takes its place once it loads, and a failed load brings the tile back. The letter and the swap come from `FaviconTile` (`src/renderer/common/favicon-tile.ts`); don't copy them. Never a globe, a window icon or an empty slot. Downloads keep their file-type icons.
- Progress bar (`.progress-track` holding a `.progress-fill`): 4 px, track `--n-track`, fill `--n-accent`, both `--n-r-key`. Download ring: 2 px.
- Tooltip (`.tooltip` + `.tooltip-text`): a small popover in the menu material (`--n-menu-bg`, `--n-menu-blur`, `--n-menu-shadow`), `--n-r-control`, 24 px tall: one line of 12 px `--n-text-1` on a 14 px line inside `5px 9px` padding, 8 px above the element it describes. The tight line and the 5 / 9 px padding are deliberate exceptions to §3.6 and §3.7. A confirmation that appears after an action ("Copied" on About) is a dark status bubble instead: `--n-text-1` fill, `--n-on-accent` 11 px text, `4px 8px`, `--n-r-control`.
- Toast (`.toast`, inside a persistent `role="status"` container that's in the page from load, so screen readers announce it): the page-wide form of the status bubble, for a short message after an action that isn't tied to one control ("Startup page added" in Settings, or why an entry was rejected). `--n-text-1` fill, 13 px 500 `--n-on-accent` text on an 18 px line, `8px 16px`, `--n-r-panel`, no shadow; centred 24 px above the bottom edge at `--z-toast`, as wide as its message up to the 24 px side gutters (a longer message wraps, breaking a long URL anywhere). It rises 8 px and fades in over 180 ms (none under reduced motion), and shows one at a time: a new toast replaces the old one.
- The `hidden` attribute always wins: `global.css` sets `[hidden] { display: none !important }`, so a page's `display` rule can't reveal a hidden element. Show and hide with `el.hidden`; an `<svg>` (a Lucide icon included) has no `hidden` property, so it takes `el.toggleAttribute('hidden', …)`.

---

## 6. Iconography — Lucide only

```html
<i data-lucide="lock" width="16" height="16"></i>
```

```ts
import { createIcons, icons } from 'lucide';
createIcons({ icons });
```

- Sizes, at the default 2 px stroke unless noted:

  | Size     | Where                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
  | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | 18 px    | The toolbar, the new-tab "+" and tab-scroll buttons; the large search fields (⌘K, new tab); the Report an Issue attachment area                                                                                                                                                                                                                                                                                                                                                              |
  | 16 px    | The address field (security indicator and field buttons); menu, popover, ⌘K and autocomplete rows; dialog and popover title icons (Sign In, Report an Issue, site info); find-bar buttons; list rows on a white page (in a 28 px well), About's link rows and History's top-site and category rows; search fields on a page (History, Bookmarks, Downloads, Site Permissions, Keyboard Shortcuts) and the ⌘O search field; Settings permission rows                                          |
  | 15 px    | Settings sidebar items, and nowhere else                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
  | 14 px    | Text buttons, segments and filter chips; small icon buttons (tab close, row actions, popover close, zoom, attachment remove) and icon buttons inside a field (About's copy buttons), submenu chevrons and About's trailing link arrows; icons in page group headers and labels (About's group headers, the Bookmarks folder header, the "Private" label) and icons inline with a line of text (the permission strip, the sign-in warning); the 30 px find and Settings sidebar search fields |
  | 12 px    | Badges; small marks beside text (the pin on a ⌘O card, the Downloads status line)                                                                                                                                                                                                                                                                                                                                                                                                            |
  | 30–32 px | The one icon of an empty state or a file preview                                                                                                                                                                                                                                                                                                                                                                                                                                             |

  Icons are 18, 16 or 14 px; 15 px is only for the Settings sidebar, and no icon is 13 px. The only smaller or larger ones are the 12 px marks above, the empty-state icons and the two heavier marks below (the select chevron is part of the control, not an icon).

  Two marks are drawn heavier: the fullscreen traffic lights (8 px glyphs, `stroke-width="3.5"`, to match the native buttons) and the select chevron `global.css` draws (the 13 px `chevron-down` at stroke 2.4, §5.2).

- Colour comes from `currentColor` — set `color` on the container.
- The error page and certificate warning keep their own inline SVGs (they're served from the main process); everything in the renderer uses Lucide.
- **The ⋮ menu's names and icons win.** Where a command appears in the ⋮ menu, every other place (Keyboard Shortcuts, About, dialogs, the chrome) uses the menu's wording, with the case its role takes (§3.7): "Find in Page", not "Find on Page"; "New Private Window", not "Private Window"; "Show All History", "Developer Tools", "Report an Issue". One icon per concept, the menu's:

  | Concept                                                            | Icon                     |
  | ------------------------------------------------------------------ | ------------------------ |
  | New Tab; the Keyboard Shortcuts "Tabs" chip                        | `file-plus-2`            |
  | New Window; the "Window" chip                                      | `app-window`             |
  | New Private Window; the private window's "Private" label           | `eye-off`                |
  | Open PDF File                                                      | `file-text`              |
  | Print                                                              | `printer`                |
  | Find in Page                                                       | `text-search`            |
  | Zoom                                                               | `zoom-in`                |
  | Downloads                                                          | `download`               |
  | History, Show All History                                          | `clock`                  |
  | Restore Previous Session                                           | `rotate-ccw`             |
  | Bookmarks: the menu, the "Bookmarks" chip and the Reference folder | `bookmark`               |
  | Help                                                               | `circle-help`            |
  | About Nav0                                                         | `info`                   |
  | Privacy Policy (the menu and About)                                | `shield-check`           |
  | Terms of Use                                                       | `scale`                  |
  | Disclaimer                                                         | `triangle-alert`         |
  | Report an Issue (the menu, About and the dialog's title)           | `message-square-warning` |
  | Developer Tools; the "Developer" chip and Settings section         | `code`                   |
  | Settings                                                           | `settings`               |

  The plain `shield` means Privacy & Security in Settings; a private window never uses a shield.

---

## 7. File organisation

| Where                                           | What                                                    |
| ----------------------------------------------- | ------------------------------------------------------- |
| `src/renderer/styles/global.css`                | Tokens, resets, utilities, base components              |
| `src/renderer/pages/<page>/index.css`           | Per-page CSS — must `@import` global.css                |
| `src/renderer/overlay/panels/<name>/<name>.css` | Overlay panel CSS                                       |
| `src/renderer/browser-layout/*.css`             | Chrome (tabs, nav bar, find in page, permission prompt) |
| `src/renderer/assets/`                          | Logo, favicon — no inline data URLs for branding        |

One exception: `ImageBase64Strings.FAVICON` (`src/constants/app-constants.ts`) is the 32 × 32 image from `src/renderer/assets/favicon.ico` as a data URL, because the main process hands it to the chrome and the overlays over IPC for built-in pages. Re-export it whenever the favicon changes.

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
- [ ] Icons are Lucide at the §6 sizes; no inline `<svg>` in the renderer.
- [ ] No inline `style=""` in HTML; no DOM-level inline styles in TS.
- [ ] Mono only on code-like content.
- [ ] `prefers-reduced-motion` and `prefers-reduced-transparency` honoured.
- [ ] `npm run lint` passes; the app boots with `npm run start`; checked in a normal and a private window.
- [ ] Any new token or component is in `global.css` **and** documented here.

If you can't tick every relevant box, say so explicitly — don't report the change as complete.
