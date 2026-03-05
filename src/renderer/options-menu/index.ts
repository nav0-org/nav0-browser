
import { OptionsMenuManager } from './options-menu-manager';
import './index.css';
import { initTheme } from '../common/theme';

import { createIcons, icons } from 'lucide';
createIcons({ icons });
initTheme();

// Create and export an instance of the browser tab manager
const manager = new OptionsMenuManager();
export default manager;