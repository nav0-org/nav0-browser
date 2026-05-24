import './url-autocomplete.css';
import { createIcons, icons } from 'lucide';

type Suggestion = {
  type: 'tab' | 'bookmark' | 'history' | 'search';
  title: string;
  url: string;
  faviconUrl?: string | null;
  meta?: string;
  tabId?: string;
  isBookmark?: boolean;
};

let resultsContainer: HTMLElement;
let currentResults: Suggestion[] = [];
let activeIndex = -1;
let initialized = false;

const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

const getFaviconLetter = (url: string): string => {
  try {
    return new URL(url).hostname.replace('www.', '').charAt(0).toUpperCase() || '?';
  } catch {
    return (url || '').charAt(0).toUpperCase() || '?';
  }
};

const buildItem = (item: Suggestion, index: number): HTMLElement => {
  const el = document.createElement('div');
  el.className = `url-ac-item${index === activeIndex ? ' active' : ''}`;
  el.dataset.index = String(index);

  let iconHtml = '';
  if (item.type === 'search') {
    iconHtml = `<div class="url-ac-icon"><i data-lucide="search" width="16" height="16"></i></div>`;
  } else if (item.faviconUrl) {
    iconHtml = `<div class="url-ac-favicon"><img src="${escapeHtml(item.faviconUrl)}" onerror="this.parentElement.textContent='${getFaviconLetter(item.url)}'"></div>`;
  } else if (item.type === 'tab') {
    iconHtml = `<div class="url-ac-icon"><i data-lucide="app-window" width="16" height="16"></i></div>`;
  } else {
    iconHtml = `<div class="url-ac-favicon">${getFaviconLetter(item.url)}</div>`;
  }

  const metaHtml = item.meta
    ? `<div class="url-ac-meta"><span>${escapeHtml(item.meta)}</span></div>`
    : '';
  const urlHtml =
    item.type !== 'search' && item.url
      ? `<div class="url-ac-url">${escapeHtml(item.url)}</div>`
      : '';
  const sublineHtml =
    metaHtml || urlHtml ? `<div class="url-ac-subline">${metaHtml}${urlHtml}</div>` : '';

  el.innerHTML = `
    ${iconHtml}
    <div class="url-ac-content">
      <div class="url-ac-title">${escapeHtml(item.title)}</div>
      ${sublineHtml}
    </div>
  `;

  el.addEventListener('mousedown', (e) => {
    e.preventDefault();
    window.BrowserAPI.sendUrlAutocompleteResultClicked(window.BrowserAPI.appWindowId, {
      index,
      item,
    });
  });

  return el;
};

const render = () => {
  resultsContainer.innerHTML = '';
  if (currentResults.length === 0) return;

  const fragment = document.createDocumentFragment();
  currentResults.forEach((item, idx) => fragment.appendChild(buildItem(item, idx)));
  resultsContainer.appendChild(fragment);
  createIcons({ icons });
};

const applyData = (data?: { results?: Suggestion[]; activeIndex?: number }) => {
  if (!data) return;
  if (Array.isArray(data.results)) {
    currentResults = data.results;
  }
  if (typeof data.activeIndex === 'number') {
    activeIndex = data.activeIndex;
  }
  render();
};

export function init(container: HTMLElement): void {
  if (initialized) return;
  initialized = true;
  container.innerHTML = `
    <div class="url-autocomplete-shell">
      <div class="url-autocomplete-panel">
        <div class="url-autocomplete-results" id="url-ac-results"></div>
      </div>
    </div>
  `;
  resultsContainer = container.querySelector('#url-ac-results') as HTMLElement;

  window.BrowserAPI.onUrlAutocompleteUpdate(
    (data: { results?: Suggestion[]; activeIndex: number }) => {
      applyData(data);
    }
  );

  // Close the dropdown when the overlay view itself has keyboard focus
  // (the main-renderer keydown handler can't see events here).
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      window.BrowserAPI.hideUrlAutocompleteOverlay(window.BrowserAPI.appWindowId);
    }
  });
}

export function show(data?: { results?: Suggestion[]; activeIndex?: number }): void {
  applyData(data);
}

export function hide(): void {
  currentResults = [];
  activeIndex = -1;
  if (resultsContainer) resultsContainer.innerHTML = '';
}
