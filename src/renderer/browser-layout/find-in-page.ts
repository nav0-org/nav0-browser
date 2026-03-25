import { createIcons, icons } from 'lucide';

let matchCase = false;
let wholeWord = false;
let useRegex = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 80;

let findInput: HTMLInputElement;
let matchCounter: HTMLElement;
let prevBtn: HTMLButtonElement;
let nextBtn: HTMLButtonElement;
let closeBtn: HTMLButtonElement;
let matchCaseBtn: HTMLButtonElement;
let wholeWordBtn: HTMLButtonElement;
let regexBtn: HTMLButtonElement;
let findBarContainer: HTMLElement;
let initialized = false;

const buildSearchText = (raw: string): string | null => {
  if (!raw) return null;
  if (useRegex) {
    try {
      new RegExp(raw);
    } catch {
      return null;
    }
    return raw;
  }
  return raw;
};

const isRegexValid = (raw: string): boolean => {
  if (!useRegex) return true;
  try {
    new RegExp(raw);
    return true;
  } catch {
    return false;
  }
};

const triggerSearch = () => {
  const raw = findInput.value;

  if (!raw) {
    matchCounter.textContent = '';
    matchCounter.classList.remove('no-match');
    findInput.classList.remove('no-match');
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    window.BrowserAPI.stopFindInPage(window.BrowserAPI.appWindowId);
    return;
  }

  if (useRegex && !isRegexValid(raw)) {
    matchCounter.textContent = 'Invalid regex';
    matchCounter.classList.add('no-match');
    findInput.classList.add('no-match');
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    window.BrowserAPI.stopFindInPage(window.BrowserAPI.appWindowId);
    return;
  }

  const searchText = buildSearchText(raw);
  if (!searchText) return;

  window.BrowserAPI.findInPage(window.BrowserAPI.appWindowId, searchText, { matchCase });
};

const debouncedSearch = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(triggerSearch, DEBOUNCE_MS);
};

function initElements(): void {
  findBarContainer = document.getElementById('find-in-page-bar') as HTMLElement;
  findInput = document.getElementById('find-input') as HTMLInputElement;
  matchCounter = document.getElementById('match-counter') as HTMLElement;
  prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
  nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
  closeBtn = document.getElementById('close-btn') as HTMLButtonElement;
  matchCaseBtn = document.getElementById('match-case-btn') as HTMLButtonElement;
  wholeWordBtn = document.getElementById('whole-word-btn') as HTMLButtonElement;
  regexBtn = document.getElementById('regex-btn') as HTMLButtonElement;
}

function bindEvents(): void {
  findInput.addEventListener('input', () => {
    debouncedSearch();
  });

  findInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = findInput.value;
      if (!text) return;
      if (useRegex && !isRegexValid(text)) return;
      if (e.shiftKey) {
        window.BrowserAPI.findInPagePrevious(window.BrowserAPI.appWindowId, text, { matchCase });
      } else {
        window.BrowserAPI.findInPageNext(window.BrowserAPI.appWindowId, text, { matchCase });
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      window.BrowserAPI.hideFindInPage(window.BrowserAPI.appWindowId);
    }
  });

  findBarContainer.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.altKey && e.key === 'c') {
      e.preventDefault();
      matchCaseBtn.click();
    } else if (e.altKey && e.key === 'w') {
      e.preventDefault();
      wholeWordBtn.click();
    } else if (e.altKey && e.key === 'r') {
      e.preventDefault();
      regexBtn.click();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      window.BrowserAPI.hideFindInPage(window.BrowserAPI.appWindowId);
    }
  });

  prevBtn.addEventListener('click', () => {
    const text = findInput.value;
    if (!text) return;
    window.BrowserAPI.findInPagePrevious(window.BrowserAPI.appWindowId, text, { matchCase });
  });

  nextBtn.addEventListener('click', () => {
    const text = findInput.value;
    if (!text) return;
    window.BrowserAPI.findInPageNext(window.BrowserAPI.appWindowId, text, { matchCase });
  });

  closeBtn.addEventListener('click', () => {
    window.BrowserAPI.hideFindInPage(window.BrowserAPI.appWindowId);
  });

  matchCaseBtn.addEventListener('click', () => {
    matchCase = !matchCase;
    matchCaseBtn.classList.toggle('active', matchCase);
    matchCaseBtn.setAttribute('aria-pressed', String(matchCase));
    triggerSearch();
  });

  wholeWordBtn.addEventListener('click', () => {
    wholeWord = !wholeWord;
    wholeWordBtn.classList.toggle('active', wholeWord);
    wholeWordBtn.setAttribute('aria-pressed', String(wholeWord));
    if (wholeWord && useRegex) {
      useRegex = false;
      regexBtn.classList.remove('active');
      regexBtn.setAttribute('aria-pressed', 'false');
    }
    triggerSearch();
  });

  regexBtn.addEventListener('click', () => {
    useRegex = !useRegex;
    regexBtn.classList.toggle('active', useRegex);
    regexBtn.setAttribute('aria-pressed', String(useRegex));
    if (useRegex && wholeWord) {
      wholeWord = false;
      wholeWordBtn.classList.remove('active');
      wholeWordBtn.setAttribute('aria-pressed', 'false');
    }
    triggerSearch();
  });

  prevBtn.disabled = true;
  nextBtn.disabled = true;

  window.BrowserAPI.onFindInPageResult((data: { activeMatchOrdinal: number; matches: number; finalUpdate: boolean }) => {
    if (!findInput.value) {
      matchCounter.textContent = '';
      matchCounter.classList.remove('no-match');
      findInput.classList.remove('no-match');
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    if (data.matches === 0) {
      matchCounter.textContent = 'No matches';
      matchCounter.classList.add('no-match');
      findInput.classList.add('no-match');
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    } else {
      matchCounter.textContent = `${data.activeMatchOrdinal} of ${data.matches}`;
      matchCounter.classList.remove('no-match');
      findInput.classList.remove('no-match');
      prevBtn.disabled = false;
      nextBtn.disabled = false;
    }
  });
}

function resetFindBar(): void {
  findInput.value = '';
  matchCase = false;
  wholeWord = false;
  useRegex = false;
  matchCaseBtn.classList.remove('active');
  wholeWordBtn.classList.remove('active');
  regexBtn.classList.remove('active');
  matchCaseBtn.setAttribute('aria-pressed', 'false');
  wholeWordBtn.setAttribute('aria-pressed', 'false');
  regexBtn.setAttribute('aria-pressed', 'false');
  matchCounter.textContent = '';
  matchCounter.classList.remove('no-match');
  findInput.classList.remove('no-match');
  prevBtn.disabled = true;
  nextBtn.disabled = true;
}

export function showFindBar(): void {
  findBarContainer.style.display = '';
  resetFindBar();
  // Re-render lucide icons inside the find bar
  createIcons({ icons, nameAttr: 'data-lucide' });
  findInput.focus();
}

export function hideFindBar(): void {
  findBarContainer.style.display = 'none';
  resetFindBar();
}

export function initFindInPage(): void {
  if (initialized) return;
  initialized = true;
  initElements();
  bindEvents();

  window.BrowserAPI.onShowFindInPageBar(() => {
    showFindBar();
  });

  window.BrowserAPI.onHideFindInPageBar(() => {
    hideFindBar();
  });
}
