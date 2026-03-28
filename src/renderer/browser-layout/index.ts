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

export default browserTabManager;
