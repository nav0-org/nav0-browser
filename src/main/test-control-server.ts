import { AppWindowManager } from './browser/app-window-manager';

// Lightweight HTTP server for perf tests.
// Activated when REMOTE_DEBUGGING_PORT env var is set.
export function startTestControlServer(port: number): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const http = require('http') as typeof import('http');
  const server = http.createServer((req: import('http').IncomingMessage, res: import('http').ServerResponse) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET' && req.url === '/status') {
      const win = AppWindowManager.getActiveWindow();
      res.end(JSON.stringify({ ready: true, hasWindow: !!win }));
      return;
    }

    if (req.method === 'POST' && req.url?.startsWith('/create-tab')) {
      const parsed = new URL(req.url, `http://localhost:${port}`);
      const tabUrl = parsed.searchParams.get('url') || 'about:blank';
      const win = AppWindowManager.getActiveWindow();
      if (win) {
        win.createTab(tabUrl, true).then(() => {
          res.end(JSON.stringify({ ok: true }));
        }).catch((err: Error) => {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        });
      } else {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'no active window' }));
      }
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not found' }));
  });
  server.listen(port, '127.0.0.1');
}
