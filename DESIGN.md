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
2. **Never hardcode a colour.** Use a token (`var(--bg-0)`, `var(--fg-2)`, `var(--accent)`, …). No `#fff`, `#000`, `rgb(...)`, named colours.
3. **Radii are tight: 2 / 3 / 4 / 6 px, or full circle.** Use `--r-xs`, `--r-sm`, `--r-md`, `--r-lg`, `--r-full`. Do **not** introduce 8/12/16px or 500px "pills". The URL-bar "pill" is `--r-pill` = 6px, not a Stadium shape.
4. **Hairline borders, paper-flat shadows.** `1px solid var(--border-1)` and `var(--shadow-sm/md/lg)`. No coloured glows, no `0 0 20px rgba(…)`.
5. **Spacing comes from the scale.** `--spacing-xs/sm/md/lg/xl/xxl` (4/8/16/24/32/48). Avoid odd values like `13px`, `19px` — round to the scale.
6. **Focus state = soft white halo, not a heavy border.** Inputs: `background-color: var(--bg-0); box-shadow: var(--shadow-focus);` on focus.
7. **No inline styles in HTML/TS.** Define a class in the page's CSS. (Reinforced by `CLAUDE.md` → Code Conventions.)
8. **Icons come from Lucide,** `<i data-lucide="<name>" width="16" height="16"></i>`, then `createIcons({ icons })` in TS. Don't ship raw SVGs or icon fonts.
9. **Mono is for tabular data** (dates, counts, durations, small-caps labels). Declare a page-local `--<page>-mono` stack — `global.css` doesn't define one globally.
10. **Sharp, minimal, utilitarian.** If a design choice feels playful, decorative, or "cloudy", it's wrong. We are paper — not glass, not neon, not aqua.

---

## 2. Design philosophy

Nav0 is a **minimal, privacy-first browser**. Its visual language reflects that:

- **Editorial, not app-y.** Pages read like a dashboard / printed document — left-aligned masthead, hairline rule, stats line in mono, generous gutter.
- **Utilitarian.** Sharp corners, hairline borders, paper-flat shadows. No gradients on surfaces, no coloured glows, no neumorphism.
- **Calm.** A single accent (`--accent` = Nav0 blue 600). Status colours (`--danger`, `--success`, `--warning`) only when the semantics demand it.
- **Hierarchy via type weight and white space,** not via colour or large radii.
- **Privacy mode is a visible signal.** Private windows use `--private-bg` (Nav0 red 700) — never reuse this colour for non-private affordances.

When in doubt: **default to less.** Smaller radius, lighter shadow, more white space.

---

## 3. Token reference (canonical: `global.css`)

### 3.1 Colour ramps (brand)

| Token              | Hex       | Use                                                |
| ------------------ | --------- | -------------------------------------------------- |
| `--nav0-red-500`   | `#ef4444` | Brand red ramp — private mode, danger accents      |
| `--nav0-red-600`   | `#dc2626` | (alias of `--danger`)                              |
| `--nav0-red-700`   | `#b91c1c` | `--private-bg`                                     |
| `--nav0-red-800`   | `#991b1b` | Pressed / very strong red                          |
| `--nav0-blue-500`  | `#3b82f6` | Brand blue ramp                                    |
| `--nav0-blue-600`  | `#2563eb` | `--accent`                                         |
| `--nav0-blue-700`  | `#1d4ed8` | `--accent-hover`                                   |
| `--nav0-blue-800`  | `#1e40af` | Pressed accent                                     |
| `--nav0-slate-300` | `#cbd5e1` | —                                                  |
| `--nav0-slate-400` | `#94a3b8` | —                                                  |
| `--nav0-slate-500` | `#64748b` | —                                                  |
| `--nav0-slate-700` | `#334155` | —                                                  |
| `--nav0-slate-900` | `#0f172a` | —                                                  |

> Reach for the slate ramp only when you need a neutral that isn't pure grey — most UI greys should come from `--bg-*` / `--fg-*` / `--border-*` below.

### 3.2 Surface & ink

| Token          | Hex       | Use                                                  |
| -------------- | --------- | ---------------------------------------------------- |
| `--bg-0`       | `#ffffff` | Canvas, cards, focused inputs                        |
| `--bg-1`       | `#fafafa` | Page background (e.g. new-tab)                       |
| `--bg-2`       | `#f5f5f5` | Subtle surface — input fields, segmented controls    |
| `--bg-3`       | `#ebebeb` | Hover                                                |
| `--bg-inverse` | `#0a0a0a` | Dark surfaces (tooltips, scrim contents)             |
| `--fg-1`       | `#0a0a0a` | Primary text                                         |
| `--fg-2`       | `#333333` | Body text                                            |
| `--fg-3`       | `#6b7280` | Secondary text, stats, captions                      |
| `--fg-4`       | `#9ca3af` | Placeholder, disabled, very low emphasis             |
| `--fg-on-dark` | `#ffffff` | Text on inverse surfaces                             |
| `--border-1`   | `#e5e5e5` | Hairline divider (default)                           |
| `--border-2`   | `#d4d4d4` | Heavier separator (rare)                             |

### 3.3 Semantic & status

| Token            | Maps to                | Use                                         |
| ---------------- | ---------------------- | ------------------------------------------- |
| `--accent`       | `--nav0-blue-600`      | Primary accent (links, focus, active tabs)  |
| `--accent-hover` | `--nav0-blue-700`      | Hover variant                               |
| `--danger`       | `--nav0-red-600`       | Destructive actions, errors                 |
| `--danger-soft`  | `#fdecea`              | Danger surface                              |
| `--success`      | `#16a34a`              | Success status                              |
| `--success-soft` | `#ecfdf5`              | Success surface                             |
| `--warning`      | `#d97706`              | Warning status                              |
| `--warning-soft` | `#fef3c7`              | Warning surface                             |
| `--private-bg`   | `--nav0-red-700`       | Private window chrome — **never reuse**     |
| `--private-fg`   | `#ffffff`              | Text on private chrome                      |

### 3.4 Shadows & focus

```
--shadow-sm:    0 1px 2px  rgba(0, 0, 0, 0.06);   /* resting cards */
--shadow-md:    0 2px 8px  rgba(0, 0, 0, 0.06);   /* dialogs, popovers */
--shadow-lg:    0 8px 24px rgba(0, 0, 0, 0.10);   /* command palette, modals */
--shadow-focus:        0 0 0 2px rgba(0, 0, 0, 0.10);     /* neutral focus halo */
--shadow-focus-accent: 0 0 0 3px rgba(37, 99, 235, 0.18); /* accent focus halo */
```

No other shadow values. No coloured drop shadows (`rgba(59, 130, 246, …)`, etc.) except `--shadow-focus-accent`.

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

Page-local mono stack (declare on the page root when needed):

```css
.history-page {
  --history-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
}
```

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

### 4.1 Editorial dashboard (built-in pages — bookmarks, history, downloads, settings)

```
┌────────────────────────────────────────────────────────────┐
│  Title (48px / 200 weight / -0.5 letter-spacing)   stats │  ← masthead
│  ─────────────────────────────────────────────────────── │  ← border-1 rule
│                                                            │
│  [ toolbar: search · segmented control · clear ]           │
│                                                            │
│  Content rows / panels                                     │
└────────────────────────────────────────────────────────────┘
```

Skeleton:

```css
.<page>-page {
  min-height: 100vh;
  background: var(--bg-0);
  color: var(--fg-2);
  opacity: 0;
  transition: opacity var(--transition-medium, 220ms) ease;
}
.<page>-page.loaded { opacity: 1; }

.<page>-wrapper {
  max-width: 1080px;        /* dashboard standard */
  margin: 0 auto;
  padding: 48px 56px 80px;
}

.<page>-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  flex-wrap: wrap;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-1);
}

.<page>-title {
  font-size: 48px;
  font-weight: 200;
  letter-spacing: -0.5px;
  color: var(--fg-1);
  margin: 0;
  line-height: 1.2;
}

.<page>-stats-label {
  font-family: var(--<page>-mono);
  font-size: 12px;
  color: var(--fg-3);
  margin: 0;
}
```

The TS counterpart toggles `.<page>-page.loaded` once data is ready, so the page fades in cleanly.

### 4.2 New-tab / centred content

`new-tab` uses `var(--bg-1)` page background, centred bento grid, large search-bar that mirrors the URL-bar (`--bg-2` rest → `--bg-0` + `--shadow-focus` on focus). Reuse those tokens; don't fork.

### 4.3 Overlay panels (`src/renderer/overlay/panels/<name>/`)

- Root element has `position: fixed; inset: 0; z-index: var(--z-modal);`.
- Scrim: `rgba(0, 0, 0, 0.4)` (alert) or `rgba(0, 0, 0, 0.7) + backdrop-filter: blur(5px)` (command-k).
- Dialog: `background: var(--bg-0); border-radius: var(--r-lg); box-shadow: var(--shadow-md);` (or `--shadow-lg` for command palette).
- Slide-in animation ~ 180ms, **always gated** on `@media (prefers-reduced-motion: reduce)`.
- Hairline border (`1px solid var(--border-1)`) on the dialog.

---

## 5. Component patterns

All of the following are pre-defined in `global.css` — **reuse them.** Only fork a class into page-local CSS when the design genuinely diverges (rare).

### 5.1 Buttons

| Class            | Use                                                   |
| ---------------- | ----------------------------------------------------- |
| `.btn`           | Base — always include                                 |
| `.btn-primary`   | Primary action (`--primary-color` bg, white text)     |
| `.btn-secondary` | Default action (`--bg-light` bg, border)              |
| `.btn-ghost`     | Tertiary — transparent, hover greys the bg            |
| `.btn-link`      | Looks like a link, underlines on hover                |
| `.btn-sm` `.btn-lg` | Size modifiers                                     |
| `.btn-icon`      | Square icon-only buttons                              |
| `.btn-block`     | Full-width                                            |

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

| Where                                        | What                                                   |
| -------------------------------------------- | ------------------------------------------------------ |
| `src/renderer/styles/global.css`             | Tokens, resets, utilities, base components             |
| `src/renderer/styles/notification.css`       | Cross-page notification styles                         |
| `src/renderer/pages/<page>/index.css`        | Per-page CSS — must `@import` global.css               |
| `src/renderer/overlay/panels/<name>/<name>.css` | Overlay panel CSS                                   |
| `src/renderer/browser-layout/*.css`          | Chrome (tabs, nav bar, find-in-page, permission prompt) |
| `src/renderer/assets/`                       | Logo, favicon — no inline data URLs for branding       |

**Never** add CSS under `src/main/`. Main process is headless.

**Never** add a new webpack entry point silently — register it in `forge.config.ts` *and* `webpack.renderer.config.ts` (see `CLAUDE.md` → Renderer Entry Points).

---

## 8. Anti-patterns — common mistakes to refuse

| Anti-pattern                                    | Why it's wrong                                          | Do this instead                                |
| ----------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------- |
| `border-radius: 12px` / `border-radius: 999px`  | Nav0 radii cap at 6px (full-circle only for avatars)    | `var(--r-md)` or `var(--r-lg)`                 |
| `box-shadow: 0 4px 20px rgba(59, 130, 246, .3)` | Coloured glow — not paper-flat                          | `var(--shadow-md)`                             |
| `color: #555` / `background: #f0f0f0`           | Hardcoded grey                                          | `var(--fg-3)` / `var(--bg-2)`                  |
| `style="margin-top: 13px"` in HTML              | Inline style + off-scale spacing                        | Class + `--spacing-md`                         |
| `padding: 7px 11px`                             | Off the spacing scale                                   | Round to 4/8/16/24                             |
| New `<svg>` markup pasted in HTML               | Bypasses Lucide                                         | `<i data-lucide="…">` + `createIcons`          |
| Gradient backgrounds, blur "glass" panels       | Not minimal/utilitarian                                 | Flat `--bg-0` / `--bg-1` + hairline border     |
| Reusing `--private-bg` red for danger CTAs      | That red is reserved for the private-mode signal        | `--danger` (Nav0 red 600)                      |
| `z-index: 9999`                                 | Bypasses the layer system                               | `var(--z-modal)` / `var(--z-toast)`            |
| Adding a new colour token without updating `global.css` and this doc | Drift                                  | Add it once, in `global.css`, then reference   |

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
- [ ] Shadows from the `--shadow-*` set only.
- [ ] Focus state is the soft halo (`--shadow-focus` or `--shadow-focus-accent`).
- [ ] Icons are Lucide; no inline `<svg>`.
- [ ] No inline `style=""` attributes in HTML / no DOM-level inline styles in TS.
- [ ] `prefers-reduced-motion` honoured for any new animation.
- [ ] Lints pass: `npm run lint` (and stylelint if you ran it).
- [ ] If a new token, utility, or component was introduced: added to `global.css` **and** documented in this file.
- [ ] App boots: `npm run start` and the affected page renders correctly in both normal and private windows.

If you cannot tick all the relevant boxes, say so explicitly in the reply — do **not** report the change as complete.
