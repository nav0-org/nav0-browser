---
title: 'Nav0 Tab Management — Tabs, Pinning, Hibernation & Multi-Window'
description: 'Nav0 offers full tab management with pinning, hibernation, drag-and-drop between windows, tab restoration, Command-K search, and the Cmd+O tab switcher.'
eyebrow: Feature Guide
head:
  - - meta
    - property: og:type
      content: article
  - - meta
    - property: article:section
      content: Features
  - - script
    - type: application/ld+json
    - |
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Does Nav0 support tab pinning?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Right-click any tab and select Pin Tab. Pinned tabs are compacted to show only the favicon, stay anchored to the left of the tab strip, and persist across sessions."
            }
          },
          {
            "@type": "Question",
            "name": "Does Nav0 have tab hibernation or sleeping tabs?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Nav0 automatically suspends tabs that have been inactive for 72 hours or more. Hibernated tabs free up memory and CPU while preserving your session. They reload on demand when you click on them."
            }
          },
          {
            "@type": "Question",
            "name": "Can I restore recently closed tabs in Nav0?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Nav0 tracks up to 10 recently closed tabs and up to 3 recently closed windows. Use Cmd+Shift+T (macOS) or Ctrl+Shift+T (Windows/Linux) to reopen the last closed tab, or access the full list from the menu."
            }
          },
          {
            "@type": "Question",
            "name": "Can I move tabs between windows in Nav0?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Use the Cmd+O tab switcher to see all open tabs across all windows, organized by window. You can drag and drop tabs between windows directly from this overlay, or right-click a tab and choose Move to New Window."
            }
          },
          {
            "@type": "Question",
            "name": "What is the Cmd+O tab switcher in Nav0?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Cmd+O (or Ctrl+O on Windows/Linux) opens a visual grid overlay showing all open tabs organized by window. Each window group is color-coded. You can search, filter, switch tabs with keyboard navigation, and drag-and-drop tabs between windows."
            }
          }
        ]
      }
---

# Tab Management

Nav0 provides a full-featured tab system designed for efficiency. Open as many tabs as you need, organize them across windows, and let hibernation handle the memory.

## Opening & Closing Tabs

| Action                 | Shortcut (macOS) | Shortcut (Windows/Linux) |
| ---------------------- | ---------------- | ------------------------ |
| New tab                | Cmd+T            | Ctrl+T                   |
| Close tab              | Cmd+W            | Ctrl+W                   |
| Reopen last closed tab | Cmd+Shift+T      | Ctrl+Shift+T             |

- **New tabs open in the background** — Opening a link in a new tab doesn't steal focus from your current page
- **Middle-click to close** — Click the middle mouse button on any tab to close it
- **Close from context menu** — Right-click a tab for Close, Close Other Tabs, and more

## Tab Strip

The tab strip is designed for heavy tab use:

- **Scrollable** — When tabs exceed the window width, the strip scrolls horizontally instead of shrinking tabs to unreadable sizes. Tabs maintain a minimum readable width.
- **Drag to reorder** — Click and drag any tab to rearrange it within the strip
- **Loading indicator** — A spinner appears in the favicon area while a page is loading
- **Favicon display** — Each tab shows the site's favicon for quick identification

## Tab Pinning

Pin frequently-used tabs to keep them compact and persistent:

1. Right-click a tab → **Pin Tab**
2. The tab compresses to show only the favicon
3. Pinned tabs anchor to the left side of the tab strip

Pinned tabs survive browser restarts and stay in place when you open and close other tabs. Unpin anytime with right-click → Unpin Tab.

## Tab Context Menu

Right-click any tab to access:

| Action                 | What It Does                       |
| ---------------------- | ---------------------------------- |
| **Reload**             | Refresh the tab's page             |
| **Duplicate**          | Open a copy of the tab             |
| **Pin / Unpin**        | Toggle tab pinning                 |
| **Mute / Unmute**      | Toggle audio for the tab           |
| **Move to New Window** | Detach the tab into its own window |
| **Close**              | Close the tab                      |
| **Close Other Tabs**   | Close all tabs except this one     |

## Tab Hibernation

Nav0 automatically hibernates tabs that have been inactive for **72 hours or more**. Hibernated tabs:

- **Free memory and CPU** — The tab's web content is unloaded from memory
- **Preserve your session** — The tab's URL, title, and favicon remain in the tab strip
- **Reload on demand** — Click a hibernated tab to reload it

This means you can keep dozens of tabs open without the memory cost. Only the tabs you're actively using consume resources.

Hibernation is automatic — there's nothing to configure. Nav0 checks for inactive tabs periodically and suspends them in the background.

## Tab Restoration

Nav0 tracks recently closed tabs and windows so you can recover from accidental closes:

- **Recently closed tabs** — Up to 10 tabs are tracked per window, with URL, title, and favicon preserved
- **Recently closed windows** — Up to 3 windows are tracked, including their full tab list
- **Keyboard shortcut** — Cmd+Shift+T / Ctrl+Shift+T reopens the last closed tab

## Multi-Window Support

Nav0 supports multiple independent browser windows. Each window has its own tab strip, navigation bar, and session.

### Moving Tabs Between Windows

There are two ways to move tabs:

1. **Context menu** — Right-click a tab → Move to New Window (detaches the tab into a new window)
2. **Cmd+O tab switcher** — Drag and drop tabs between windows visually (see below)

### Private Windows

Private windows run in a completely separate partition. Tabs from private windows cannot be moved to normal windows, and vice versa. See [Private Browsing](/guide/private-browsing) for details.

## Cmd+O Tab Switcher

Press **Cmd+O** (macOS) or **Ctrl+O** (Windows/Linux) to open the tab switcher overlay — a visual grid of all open tabs across all windows.

### Features

- **Window grouping** — Tabs are organized by window, with each group color-coded
- **Search** — Type to filter tabs by title or URL
- **Keyboard navigation** — Arrow keys to move between tabs, Enter to switch
- **Drag and drop** — Move tabs between windows by dragging them between groups
- **Privacy-aware** — Only shows tabs matching the current context (private windows see only private tabs)

The tab switcher is the fastest way to find a specific tab when you have many open across multiple windows.

## Command-K Search

Press **Cmd+K** (macOS) or **Ctrl+K** (Windows/Linux) to open the command palette — a unified search across everything in your browser:

- **Open tabs** — Search by title or URL, with a "switch to tab" action
- **Bookmarks** — Search and navigate to bookmarks
- **History** — Search your browsing history
- **Downloads** — Search your download history
- **Web search** — Fall through to your configured search engine

### Search Filtering

Filter results by type using category tabs: All, Tabs, Bookmarks, History, Downloads. Each result shows its favicon, title, and metadata (date, file size, etc.).

## Keyboard Shortcuts for Tabs

| Action             | macOS       | Windows/Linux |
| ------------------ | ----------- | ------------- |
| New Tab            | Cmd+T       | Ctrl+T        |
| Close Tab          | Cmd+W       | Ctrl+W        |
| Reopen Closed Tab  | Cmd+Shift+T | Ctrl+Shift+T  |
| Command Palette    | Cmd+K       | Ctrl+K        |
| Tab Switcher       | Cmd+O       | Ctrl+O        |
| New Window         | Cmd+N       | Ctrl+N        |
| New Private Window | Cmd+Shift+N | Ctrl+Shift+N  |

All keyboard shortcuts are customizable. See [Keyboard Shortcuts](/guide/keyboard-shortcuts) for the full list.

## Frequently Asked Questions

### How many tabs can I have open?

There is no artificial limit. Nav0 supports unlimited tabs. With tab hibernation, inactive tabs consume minimal resources, so you can keep many tabs open without significant memory impact.

### Do pinned tabs persist across restarts?

Yes. Pinned tabs are preserved when you close and reopen the browser.

### Can I search across tabs from all windows?

Yes. Both the Cmd+O tab switcher and the Cmd+K command palette search across all open tabs in all windows (filtered by private/non-private context).

### Does tab hibernation lose my scroll position or form data?

When a tab is hibernated and later reloaded, the page loads fresh from the server. Scroll position and unsaved form data are not preserved. If you're working on something important, save your work before leaving the tab inactive for extended periods.

### Can I disable tab hibernation?

Tab hibernation is automatic and not configurable. Tabs must be inactive for 72 hours before they are considered for hibernation — regular use prevents it entirely.

---

_See also: [Keyboard Shortcuts](/guide/keyboard-shortcuts) · [Private Browsing](/guide/private-browsing) · [Features Overview](/guide/features)_
