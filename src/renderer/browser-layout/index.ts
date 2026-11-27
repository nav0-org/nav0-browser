import { BrowserTabManager } from './browser-manager';
import './index.css';
import './find-in-page.css';
import './permission-prompt.css';
import { initFindInPage } from './find-in-page';
import { initPermissionPrompt } from './permission-prompt';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

// Create and export an instance of the browser tab manager
const browserTabManager = new BrowserTabManager();

document.addEventListener('DOMContentLoaded', () => {
  initFindInPage();
  initPermissionPrompt();
});

// A chrome button gives up focus once focus leaves the chrome (for the page,
// an overlay or another app); otherwise the chrome focuses it again the next
// time it takes focus, ring and all, and typing goes nowhere. The + button is
// the one macOS focuses as a new window becomes key, before the main process
// moves focus to the page. The address field keeps its own state.
window.addEventListener('blur', () => {
  const active = document.activeElement;
  if (active instanceof HTMLButtonElement) active.blur();
});

export default browserTabManager;
