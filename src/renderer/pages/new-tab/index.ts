import './index.css';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

const GREETINGS_BY_HOUR: { range: [number, number]; phrases: string[] }[] = [
  {
    range: [5, 8],
    phrases: [
      'Good morning',
      'Rise and shine',
      'Early bird',
      'Morning has broken',
      'Up with the sun',
      'Bright and early',
      'A fresh start',
      'The day is young',
      'First light',
      'Quiet mornings are the best',
    ],
  },
  {
    range: [8, 12],
    phrases: [
      'Good morning',
      'Morning',
      "Hope your morning's going well",
      'A fine morning to browse',
      'Hello, sunshine',
      "Let's make it a good one",
      'Fresh coffee somewhere?',
      'Off to a good start?',
      'Morning, friend',
      'Plenty of day ahead',
    ],
  },
  {
    range: [12, 14],
    phrases: [
      'Good afternoon',
      'Lunchtime already?',
      'Midday check-in',
      'Afternoon',
      'Halfway through the day',
      'High noon',
      'Take a breather',
      "Don't forget to eat",
      'Quick break?',
      'Sun is high',
    ],
  },
  {
    range: [14, 17],
    phrases: [
      'Good afternoon',
      'Afternoon',
      "Hope your day's going well",
      'Powering through?',
      'Keep it going',
      'Almost there',
      'Afternoon momentum',
      'Stay focused',
      'You got this',
      'A little further',
    ],
  },
  {
    range: [17, 21],
    phrases: [
      'Good evening',
      'Evening',
      'Winding down?',
      'Hope you had a good day',
      'Time to unwind',
      'Sun is setting',
      'Easy does it',
      'Evening, friend',
      'Done for the day?',
      'Slow it down',
    ],
  },
  {
    range: [21, 24],
    phrases: [
      'Good evening',
      'Getting late',
      "Evening's wrapping up",
      "Hope you're relaxing",
      'Almost bedtime',
      'Day is winding down',
      'Take it easy',
      'Cozy hours',
      'Quiet time',
      'A calm end to the day',
    ],
  },
  {
    range: [0, 5],
    phrases: [
      "It's a bit late",
      'Burning the midnight oil?',
      'Night owl mode',
      'Still up?',
      'Late night browsing',
      'The world is asleep',
      'Quiet hours',
      'Up past midnight',
      "Don't forget to rest",
      'The small hours',
    ],
  },
];

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  const bucket =
    GREETINGS_BY_HOUR.find(({ range: [start, end] }) => hour >= start && hour < end) ??
    GREETINGS_BY_HOUR[0];
  return bucket.phrases[Math.floor(Math.random() * bucket.phrases.length)];
}

const greetingEl = document.getElementById('greeting');
if (greetingEl) {
  greetingEl.textContent = getTimeBasedGreeting();
}

// Handle search input
const searchBar = document.getElementById('search-bar') as HTMLInputElement;
searchBar?.focus();
if (searchBar) {
  searchBar.addEventListener('keypress', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const query = (e.currentTarget as HTMLInputElement).value.trim();
      window.BrowserAPI.navigate(window.BrowserAPI.appWindowId, window.BrowserAPI.tabId, query);
    }
  });

  // Re-focus search bar when the page gains focus (e.g. tab switched back to new tab)
  window.addEventListener('focus', () => {
    searchBar.focus();
  });
}

// ---------------------------------------------------------------------------
// Bookmarks + Frequently visited tile rows
// ---------------------------------------------------------------------------

const TILE_LIMIT = 8;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(value: string): string {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function deriveDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '');
  } catch {
    return rawUrl;
  }
}

function deriveTitle(rawTitle: string, url: string): string {
  if (rawTitle && rawTitle.trim()) return rawTitle.trim();
  return deriveDomain(url);
}

function buildFaviconFallback(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}/favicon.ico`;
  } catch {
    return '';
  }
}

function renderTile(item: {
  url: string;
  title: string;
  faviconUrl?: string;
  visits?: number;
}): string {
  const domain = deriveDomain(item.url);
  const title = deriveTitle(item.title, item.url);
  const favicon = item.faviconUrl || buildFaviconFallback(item.url);
  const safeUrl = escapeAttr(item.url);
  const safeFavicon = escapeAttr(favicon);
  return `
    <a class="tile" href="${safeUrl}" data-url="${safeUrl}" title="${escapeAttr(title)}">
      <span class="tile-icon">
        ${
          safeFavicon
            ? `<img src="${safeFavicon}" alt="" onerror="this.parentElement.innerHTML='<i data-lucide=\\'globe\\' width=\\'18\\' height=\\'18\\'></i>'">`
            : `<i data-lucide="globe" width="18" height="18"></i>`
        }
      </span>
      <span class="tile-text">
        <span class="tile-title">${escapeText(title)}</span>
        <span class="tile-domain">${escapeText(domain)}</span>
      </span>
    </a>
  `;
}

function attachTileNavigation(row: HTMLElement): void {
  row.querySelectorAll<HTMLAnchorElement>('.tile').forEach((tile) => {
    tile.addEventListener('click', (e) => {
      e.preventDefault();
      const url = tile.dataset.url;
      if (url) {
        window.BrowserAPI.navigate(window.BrowserAPI.appWindowId, window.BrowserAPI.tabId, url);
      }
    });
  });
}

async function loadTileRows(): Promise<void> {
  const appWindowId = window.BrowserAPI.appWindowId;

  // Bookmarks — combined queue + reference, sorted by visits desc.
  const bookmarksSection = document.getElementById('bookmarks-section') as HTMLElement | null;
  const bookmarksRow = document.getElementById('bookmarks-row') as HTMLElement | null;
  if (bookmarksSection && bookmarksRow) {
    try {
      const [queue, reference] = await Promise.all([
        window.BrowserAPI.fetchBookmarksWithStats(appWindowId, 'queue', '', 100, 0),
        window.BrowserAPI.fetchBookmarksWithStats(appWindowId, 'reference', '', 100, 0),
      ]);
      const merged = [...(queue || []), ...(reference || [])] as Array<{
        url: string;
        title: string;
        faviconUrl?: string;
        visits: number;
      }>;
      const top = merged.sort((a, b) => (b.visits || 0) - (a.visits || 0)).slice(0, TILE_LIMIT);
      if (top.length > 0) {
        bookmarksRow.innerHTML = top.map(renderTile).join('');
        attachTileNavigation(bookmarksRow);
        bookmarksSection.hidden = false;
      }
    } catch {
      /* leave row hidden on failure */
    }
  }

  // Frequently visited — top URLs by visit count from browsing history.
  const topSitesSection = document.getElementById('top-sites-section') as HTMLElement | null;
  const topSitesRow = document.getElementById('top-sites-row') as HTMLElement | null;
  if (topSitesSection && topSitesRow) {
    try {
      const sites = await window.BrowserAPI.fetchTopSites(appWindowId, TILE_LIMIT);
      if (sites && sites.length > 0) {
        topSitesRow.innerHTML = sites.map(renderTile).join('');
        attachTileNavigation(topSitesRow);
        topSitesSection.hidden = false;
      }
    } catch {
      /* leave row hidden on failure */
    }
  }

  createIcons({ icons });
}

loadTileRows();
