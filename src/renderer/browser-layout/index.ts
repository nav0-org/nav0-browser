import { BrowserTabManager } from './browser-manager';
import './index.css';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

console.log('👋 This message is being logged by "renderer.js", included via webpack');

// Create and export an instance of the browser tab manager
const browserTabManager = new BrowserTabManager();
export default browserTabManager;