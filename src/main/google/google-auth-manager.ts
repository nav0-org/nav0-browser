import { BrowserWindow, ipcMain } from 'electron';
import https from 'https';
import http from 'http';
import url from 'url';
import Store from 'electron-store';
import { RendererToMainEventsForBrowserIPC } from '../../constants/app-constants';

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
  expires_at: number;
}

interface GoogleUserInfo {
  email: string;
  name: string;
  picture: string;
}

export interface GoogleAuthStatus {
  isSignedIn: boolean;
  user: GoogleUserInfo | null;
}

// Google OAuth configuration for desktop apps
// Users should set these environment variables or configure in settings
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_PORT = 17823;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const tokenStore = new Store({ name: 'google-auth-tokens' });

export abstract class GoogleAuthManager {
  private static tokens: GoogleTokens | null = null;
  private static userInfo: GoogleUserInfo | null = null;

  public static init(): void {
    // Load stored tokens
    const stored = tokenStore.get('tokens') as GoogleTokens | undefined;
    if (stored) {
      GoogleAuthManager.tokens = stored;
    }
    const storedUser = tokenStore.get('userInfo') as GoogleUserInfo | undefined;
    if (storedUser) {
      GoogleAuthManager.userInfo = storedUser;
    }

    GoogleAuthManager.initListeners();
  }

  private static initListeners(): void {
    ipcMain.handle(RendererToMainEventsForBrowserIPC.GOOGLE_AUTH_SIGN_IN, async () => {
      return GoogleAuthManager.signIn();
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.GOOGLE_AUTH_SIGN_OUT, async () => {
      return GoogleAuthManager.signOut();
    });

    ipcMain.handle(RendererToMainEventsForBrowserIPC.GOOGLE_AUTH_GET_STATUS, async () => {
      return GoogleAuthManager.getAuthStatus();
    });
  }

  public static async signIn(): Promise<GoogleAuthStatus> {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error('Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
    }

    const authCode = await GoogleAuthManager.openAuthWindow();
    const tokens = await GoogleAuthManager.exchangeCodeForTokens(authCode);
    GoogleAuthManager.tokens = {
      ...tokens,
      expires_at: Date.now() + tokens.expires_in * 1000,
    };
    tokenStore.set('tokens', GoogleAuthManager.tokens);

    // Fetch user info
    GoogleAuthManager.userInfo = await GoogleAuthManager.fetchUserInfo();
    tokenStore.set('userInfo', GoogleAuthManager.userInfo);

    return GoogleAuthManager.getAuthStatus();
  }

  public static signOut(): GoogleAuthStatus {
    GoogleAuthManager.tokens = null;
    GoogleAuthManager.userInfo = null;
    tokenStore.delete('tokens');
    tokenStore.delete('userInfo');
    return GoogleAuthManager.getAuthStatus();
  }

  public static getAuthStatus(): GoogleAuthStatus {
    return {
      isSignedIn: GoogleAuthManager.tokens !== null,
      user: GoogleAuthManager.userInfo,
    };
  }

  public static async getAccessToken(): Promise<string | null> {
    if (!GoogleAuthManager.tokens) return null;

    // Refresh if expired (with 60s buffer)
    if (Date.now() >= GoogleAuthManager.tokens.expires_at - 60000) {
      if (GoogleAuthManager.tokens.refresh_token) {
        await GoogleAuthManager.refreshAccessToken();
      } else {
        // No refresh token, need to re-authenticate
        GoogleAuthManager.tokens = null;
        tokenStore.delete('tokens');
        return null;
      }
    }

    return GoogleAuthManager.tokens.access_token;
  }

  private static openAuthWindow(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create a local HTTP server to receive the OAuth callback
      const server = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url || '', true);

        if (parsedUrl.pathname === '/callback') {
          const code = parsedUrl.query.code as string;
          const error = parsedUrl.query.error as string;

          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><body><h2>Authentication failed</h2><p>You can close this window.</p></body></html>');
            server.close();
            authWindow?.close();
            reject(new Error(`Google auth error: ${error}`));
            return;
          }

          if (code) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><body><h2>Sign-in successful!</h2><p>You can close this window and return to Nav0 Browser.</p></body></html>');
            server.close();
            authWindow?.close();
            resolve(code);
            return;
          }
        }

        res.writeHead(404);
        res.end();
      });

      server.listen(REDIRECT_PORT);

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', SCOPES.join(' '));
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      const authWindow = new BrowserWindow({
        width: 500,
        height: 700,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      authWindow.loadURL(authUrl.toString());

      authWindow.on('closed', () => {
        server.close();
        // If the window was closed without completing auth, reject
        reject(new Error('Authentication window was closed'));
      });
    });
  }

  private static exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
    return new Promise((resolve, reject) => {
      const postData = new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString();

      const req = https.request(
        {
          hostname: 'oauth2.googleapis.com',
          path: '/token',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                reject(new Error(`Token exchange failed: ${parsed.error_description || parsed.error}`));
              } else {
                resolve(parsed);
              }
            } catch (e) {
              reject(new Error('Failed to parse token response'));
            }
          });
        }
      );

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  private static async refreshAccessToken(): Promise<void> {
    if (!GoogleAuthManager.tokens?.refresh_token) return;

    return new Promise((resolve, reject) => {
      const postData = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: GoogleAuthManager.tokens!.refresh_token!,
        grant_type: 'refresh_token',
      }).toString();

      const req = https.request(
        {
          hostname: 'oauth2.googleapis.com',
          path: '/token',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                // Refresh failed, clear tokens
                GoogleAuthManager.tokens = null;
                tokenStore.delete('tokens');
                reject(new Error(`Token refresh failed: ${parsed.error}`));
              } else {
                GoogleAuthManager.tokens = {
                  ...GoogleAuthManager.tokens!,
                  access_token: parsed.access_token,
                  expires_in: parsed.expires_in,
                  expires_at: Date.now() + parsed.expires_in * 1000,
                };
                tokenStore.set('tokens', GoogleAuthManager.tokens);
                resolve();
              }
            } catch (e) {
              reject(new Error('Failed to parse refresh token response'));
            }
          });
        }
      );

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  private static fetchUserInfo(): Promise<GoogleUserInfo> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'www.googleapis.com',
          path: '/oauth2/v2/userinfo',
          method: 'GET',
          headers: {
            Authorization: `Bearer ${GoogleAuthManager.tokens!.access_token}`,
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve({
                email: parsed.email,
                name: parsed.name,
                picture: parsed.picture,
              });
            } catch (e) {
              reject(new Error('Failed to parse user info'));
            }
          });
        }
      );

      req.on('error', reject);
      req.end();
    });
  }
}
