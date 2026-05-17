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

const BACKGROUND_GRADIENTS: string[] = [
  'linear-gradient(135deg, #e7e4e2 0%, #e7e5e6 50%, #e5e5e7 100%)',
  'linear-gradient(135deg, #e8e6e2 0%, #e7e5e6 50%, #e6e4e7 100%)',
  'linear-gradient(135deg, #e4e6e8 0%, #e7e5e8 100%)',
  'linear-gradient(135deg, #e6e7e3 0%, #e4e7e8 100%)',
  'linear-gradient(135deg, #e8e7e1 0%, #e7e5e6 100%)',
  'linear-gradient(135deg, #e4e7e9 0%, #e6e5e8 100%)',
  'linear-gradient(135deg, #e7e5e6 0%, #e8e6e2 100%)',
  'linear-gradient(135deg, #e7e5e8 0%, #e5e5e7 50%, #e4e7e8 100%)',
  'linear-gradient(135deg, #e8e6e4 0%, #e5e6e9 100%)',
  'linear-gradient(135deg, #e8e7e1 0%, #e7e5e8 100%)',
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
