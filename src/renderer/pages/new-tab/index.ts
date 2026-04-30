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
