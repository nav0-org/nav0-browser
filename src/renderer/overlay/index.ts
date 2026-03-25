import './index.css';
import { initTheme } from '../common/theme';
import { createIcons, icons } from 'lucide';

// Import panel modules
import * as commandKPanel from './panels/command-k/command-k';
import * as commandOPanel from './panels/command-o/command-o';
import * as optionsMenuPanel from './panels/options-menu/options-menu';
import * as permissionPromptPanel from './panels/permission-prompt/permission-prompt';
import * as issueReportPanel from './panels/issue-report/issue-report';
import * as sslInfoPanel from './panels/ssl-info/ssl-info';

// Import panel CSS
import './panels/command-k/command-k.css';
import './panels/command-o/command-o.css';
import './panels/options-menu/options-menu.css';
import './panels/permission-prompt/permission-prompt.css';
import './panels/issue-report/issue-report.css';
import './panels/ssl-info/ssl-info.css';

initTheme();

type PanelName = 'command-k' | 'command-o' | 'options-menu' | 'permission-prompt' | 'issue-report' | 'ssl-info';

const panels: Record<PanelName, { init: (container: HTMLElement) => void; show: (data?: any) => void; hide: () => void }> = {
  'command-k': commandKPanel,
  'command-o': commandOPanel,
  'options-menu': optionsMenuPanel,
  'permission-prompt': permissionPromptPanel,
  'issue-report': issueReportPanel,
  'ssl-info': sslInfoPanel,
};

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all panels with their container elements
  for (const [name, panel] of Object.entries(panels)) {
    const container = document.getElementById(`overlay-${name}`);
    if (container) {
      panel.init(container);
    }
  }

  // Create lucide icons for statically rendered HTML
  createIcons({ icons });

  // Listen for show/hide overlay panel IPC events
  window.BrowserAPI.onShowOverlayPanel((data: { type: string; data?: any }) => {
    const panelName = data.type as PanelName;
    const panel = panels[panelName];
    if (panel) {
      panel.show(data.data);
      const container = document.getElementById(`overlay-${panelName}`);
      if (container) {
        container.removeAttribute('hidden');
      }
      // Re-create icons for any dynamically injected HTML
      createIcons({ icons });
    }
  });

  window.BrowserAPI.onHideOverlayPanel((data: { type: string }) => {
    const panelName = data.type as PanelName;
    const panel = panels[panelName];
    if (panel) {
      panel.hide();
      const container = document.getElementById(`overlay-${panelName}`);
      if (container) {
        container.setAttribute('hidden', '');
      }
    }
  });

  // Permission prompt uses its own existing IPC channels
  window.BrowserAPI.onPermissionPromptShow((data: any) => {
    const container = document.getElementById('overlay-permission-prompt');
    if (container) {
      container.removeAttribute('hidden');
    }
    permissionPromptPanel.show(data);
    createIcons({ icons });
  });

  window.BrowserAPI.onPermissionPromptHide(() => {
    permissionPromptPanel.hide();
    const container = document.getElementById('overlay-permission-prompt');
    if (container) {
      container.setAttribute('hidden', '');
    }
  });

  // Signal readiness to the main process
  window.BrowserAPI.signalOverlayRendererReady();
});
