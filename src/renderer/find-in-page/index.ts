import './index.css';
import { createIcons, icons } from 'lucide';

let matchCase = false;
let wholeWord = false;
let useRegex = false;
let currentQuery = '';
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 80;

const init = () => {
  document.addEventListener('DOMContentLoaded', () => {
    const findInput = document.getElementById('find-input') as HTMLInputElement;
    const matchCounter = document.getElementById('match-counter') as HTMLElement;
    const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
    const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
    const closeBtn = document.getElementById('close-btn') as HTMLButtonElement;
    const matchCaseBtn = document.getElementById('match-case-btn') as HTMLButtonElement;
    const wholeWordBtn = document.getElementById('whole-word-btn') as HTMLButtonElement;
    const regexBtn = document.getElementById('regex-btn') as HTMLButtonElement;

    createIcons({ icons });

    findInput?.focus();

    // Build the actual search text based on toggle states
    const buildSearchText = (raw: string): string | null => {
      if (!raw) return null;

      if (useRegex) {
        // Validate regex
        try {
          new RegExp(raw);
        } catch {
          return null; // Invalid regex
        }
        return raw;
      }

      if (wholeWord) {
        // Wrap in word boundary markers - Electron findInPage doesn't support
        // regex directly, so we just pass the text. Whole-word matching is
        // approximate: we rely on exact text matching for now.
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
      currentQuery = raw;

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

    // Input handler
    findInput.addEventListener('input', () => {
      debouncedSearch();
    });

    // Keyboard shortcuts
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

    // Alt+C for match case, Alt+W for whole word, Alt+R for regex
    document.addEventListener('keydown', (e: KeyboardEvent) => {
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

    // Navigation buttons
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

    // Close button
    closeBtn.addEventListener('click', () => {
      window.BrowserAPI.hideFindInPage(window.BrowserAPI.appWindowId);
    });

    // Toggle buttons
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
      // If whole word is on and regex is on, disable regex
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
      // If regex is on and whole word is on, disable whole word
      if (useRegex && wholeWord) {
        wholeWord = false;
        wholeWordBtn.classList.remove('active');
        wholeWordBtn.setAttribute('aria-pressed', 'false');
      }
      triggerSearch();
    });

    // Disable nav buttons initially
    prevBtn.disabled = true;
    nextBtn.disabled = true;

    // Listen for results from main process
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

    // Expose functions for main process to call
    (window as any).resetFindBar = () => {
      findInput.value = '';
      currentQuery = '';
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
      findInput.focus();
    };

    (window as any).focusFindInput = () => {
      findInput.focus();
      findInput.select();
    };
  });
};

init();
