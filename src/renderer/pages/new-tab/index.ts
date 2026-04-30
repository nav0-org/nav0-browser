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

const BACKGROUND_GRADIENTS: string[] = [
  'linear-gradient(135deg, #fde6dc 0%, #fce4ec 50%, #e8eaf6 100%)',
  'linear-gradient(135deg, #ffe0b2 0%, #fce4ec 50%, #e1bee7 100%)',
  'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
  'linear-gradient(135deg, #f1f8e9 0%, #e0f7fa 100%)',
  'linear-gradient(135deg, #fff8e1 0%, #fce4ec 100%)',
  'linear-gradient(135deg, #e1f5fe 0%, #ede7f6 100%)',
  'linear-gradient(135deg, #fce4ec 0%, #fff3e0 100%)',
  'linear-gradient(135deg, #f3e5f5 0%, #e8eaf6 50%, #e0f7fa 100%)',
  'linear-gradient(135deg, #fff5f0 0%, #f0f4ff 100%)',
  'linear-gradient(135deg, #fef6e4 0%, #f4e9f7 100%)',
];

function pickRandomBackground(): string {
  return BACKGROUND_GRADIENTS[Math.floor(Math.random() * BACKGROUND_GRADIENTS.length)];
}

const greetingEl = document.getElementById('greeting');
if (greetingEl) {
  greetingEl.textContent = getTimeBasedGreeting();
}

document.body.style.backgroundImage = pickRandomBackground();
document.body.style.backgroundAttachment = 'fixed';

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
