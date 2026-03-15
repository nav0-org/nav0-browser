
import './index.css';
import { initTheme } from '../../common/theme';

import { createIcons, icons } from 'lucide';
createIcons({ icons });
initTheme();

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

// --------------------------------------------------------------------------
// Google Auth & Calendar
// --------------------------------------------------------------------------

const signInBtn = document.getElementById('google-sign-in-btn') as HTMLButtonElement;
const signOutBtn = document.getElementById('google-sign-out-btn') as HTMLButtonElement;
const userInfoEl = document.getElementById('google-user-info') as HTMLDivElement;
const userAvatarEl = document.getElementById('google-user-avatar') as HTMLImageElement;
const userNameEl = document.getElementById('google-user-name') as HTMLSpanElement;
const calendarLoading = document.getElementById('calendar-loading') as HTMLDivElement;
const calendarNotSignedIn = document.getElementById('calendar-not-signed-in') as HTMLDivElement;
const calendarNoEvents = document.getElementById('calendar-no-events') as HTMLDivElement;
const calendarEventsList = document.getElementById('calendar-events-list') as HTMLDivElement;

function showCalendarState(state: 'loading' | 'not-signed-in' | 'no-events' | 'events') {
  calendarLoading.style.display = state === 'loading' ? 'flex' : 'none';
  calendarNotSignedIn.style.display = state === 'not-signed-in' ? 'flex' : 'none';
  calendarNoEvents.style.display = state === 'no-events' ? 'flex' : 'none';
  calendarEventsList.style.display = state === 'events' ? 'block' : 'none';
}

function updateAuthUI(status: { isSignedIn: boolean; user: { email: string; name: string; picture: string } | null }) {
  if (status.isSignedIn && status.user) {
    signInBtn.style.display = 'none';
    userInfoEl.style.display = 'flex';
    userAvatarEl.src = status.user.picture;
    userNameEl.textContent = status.user.name;
  } else {
    signInBtn.style.display = 'flex';
    userInfoEl.style.display = 'none';
  }
}

function formatEventTime(dateStr: string, allDay: boolean): string {
  if (allDay) return 'All day';
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getDateLabel(dateStr: string): string {
  const eventDate = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const eventDay = eventDate.toDateString();
  if (eventDay === today.toDateString()) return 'Today';
  if (eventDay === tomorrow.toDateString()) return 'Tomorrow';
  return eventDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

const EVENT_COLORS: Record<string, string> = {
  '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
  '5': '#f6bf26', '6': '#f4511e', '7': '#039be5', '8': '#616161',
  '9': '#3f51b5', '10': '#0b8043', '11': '#d50000',
};

function renderEvents(events: Array<{
  id: string; summary: string; start: string; end: string;
  allDay: boolean; location?: string; htmlLink?: string; colorId?: string;
}>) {
  if (events.length === 0) {
    showCalendarState('no-events');
    return;
  }

  calendarEventsList.innerHTML = '';
  let currentDateLabel = '';

  for (const event of events) {
    const dateLabel = getDateLabel(event.start);
    if (dateLabel !== currentDateLabel) {
      currentDateLabel = dateLabel;
      const header = document.createElement('div');
      header.className = 'calendar-date-header';
      header.textContent = dateLabel;
      calendarEventsList.appendChild(header);
    }

    const eventEl = document.createElement('div');
    eventEl.className = 'calendar-event';

    const color = EVENT_COLORS[event.colorId || ''] || '#4285f4';
    const timeStr = formatEventTime(event.start, event.allDay);

    eventEl.innerHTML = `
      <div class="event-color-bar" style="background-color: ${color}"></div>
      <div class="event-details">
        <div class="event-summary">${escapeHtml(event.summary)}</div>
        <div class="event-time">${timeStr}${event.location ? ' &middot; ' + escapeHtml(event.location) : ''}</div>
      </div>
    `;

    calendarEventsList.appendChild(eventEl);
  }

  showCalendarState('events');
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadCalendarEvents() {
  showCalendarState('loading');
  try {
    const events = await window.BrowserAPI.googleCalendarGetEvents();
    renderEvents(events);
  } catch (err) {
    console.error('Failed to load calendar events:', err);
    showCalendarState('no-events');
  }
}

// Sign in handler
signInBtn?.addEventListener('click', async () => {
  signInBtn.disabled = true;
  signInBtn.textContent = 'Signing in...';
  try {
    const status = await window.BrowserAPI.googleAuthSignIn();
    updateAuthUI(status);
    if (status.isSignedIn) {
      await loadCalendarEvents();
    }
  } catch (err) {
    console.error('Google sign-in failed:', err);
    showCalendarState('not-signed-in');
  } finally {
    signInBtn.disabled = false;
    signInBtn.innerHTML = '<i data-lucide="log-in" class="btn-icon-lucide"></i> Sign in with Google';
    createIcons({ icons });
  }
});

// Sign out handler
signOutBtn?.addEventListener('click', async () => {
  const status = await window.BrowserAPI.googleAuthSignOut();
  updateAuthUI(status);
  showCalendarState('not-signed-in');
});

// Check auth status on load
async function initCalendar() {
  try {
    const status = await window.BrowserAPI.googleAuthGetStatus();
    updateAuthUI(status);
    if (status.isSignedIn) {
      await loadCalendarEvents();
    } else {
      showCalendarState('not-signed-in');
    }
  } catch (err) {
    console.error('Failed to check auth status:', err);
    signInBtn.style.display = 'flex';
    showCalendarState('not-signed-in');
  }
}

initCalendar();
