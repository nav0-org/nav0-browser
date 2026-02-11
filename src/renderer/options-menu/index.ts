
import { OptionsMenuManager } from './options-menu-manager';
import './index.css';

import { createIcons, icons } from 'lucide';
createIcons({ icons });

// Create and export an instance of the browser tab manager
const manager = new OptionsMenuManager();
export default manager;