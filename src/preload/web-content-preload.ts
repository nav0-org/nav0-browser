/**
 * Preload script for external web content.
 *
 * Runs before page scripts with contextIsolation: true.  Since we cannot
 * directly modify `navigator.geolocation` from the isolated preload world,
 * we use a MutationObserver to inject a <script> tag into the main-world
 * DOM the moment <html> appears — before any <head> scripts execute.
 *
 * The injected polyfill wraps navigator.geolocation so that when the native
 * provider fails with POSITION_UNAVAILABLE or TIMEOUT (e.g. Linux without
 * Google API key), it falls back to an IP-based lookup performed by the main
 * process via IPC (bypassing renderer CSP / network restrictions).
 */

import { contextBridge, ipcRenderer } from 'electron';

// Expose a function the main-world polyfill can call to get IP geolocation
// from the main process (uses Electron net.fetch, immune to page CSP).
contextBridge.exposeInMainWorld('__Nav0Geo', {
  getPosition: (): Promise<{ latitude: number; longitude: number } | null> =>
    ipcRenderer.invoke('get-ip-geolocation'),
});

contextBridge.exposeInMainWorld('__Nav0Share', {
  share: (data: { title?: string; text?: string; url?: string }): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('web-share', data),
});

// ─── Notification API Bridge ───────────────────────────────────────
// Bridges web content Notification API to Electron's native notifications
// via the main process NotificationManager.

let notifEventCallback: ((data: { id: string; type: string }) => void) | null = null;

contextBridge.exposeInMainWorld('__Nav0Notify', {
  show: (data: {
    id: string;
    title: string;
    body: string;
    icon: string;
    tag: string;
    silent: boolean;
    requireInteraction: boolean;
  }): Promise<{ success?: boolean; error?: string }> =>
    ipcRenderer.invoke('notification:show', data),
  close: (id: string): void => {
    ipcRenderer.send('notification:close', id);
  },
  getPermissionSync: (): string =>
    ipcRenderer.sendSync('notification:check-permission'),
  requestPermission: (): Promise<string> =>
    ipcRenderer.invoke('notification:request-permission'),
  onEvent: (callback: (data: { id: string; type: string }) => void): void => {
    notifEventCallback = callback;
  },
});

ipcRenderer.on('notification:event', (_event, data: { id: string; type: string }) => {
  if (notifEventCallback) notifEventCallback(data);
});

const POLYFILL_CODE = `
(function() {
  if (window.__Nav0GeolocationPatched) return;
  window.__Nav0GeolocationPatched = true;

  var nativeGetCurrentPosition = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
  var nativeWatchPosition = navigator.geolocation.watchPosition.bind(navigator.geolocation);

  function ipFallback(success, error) {
    if (!window.__Nav0Geo || !window.__Nav0Geo.getPosition) {
      if (error) error({ code: 2, message: 'Position unavailable', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
      return;
    }
    window.__Nav0Geo.getPosition()
      .then(function(result) {
        if (!result) throw new Error('No result');
        success({
          coords: {
            latitude: result.latitude,
            longitude: result.longitude,
            accuracy: 5000,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: Date.now()
        });
      })
      .catch(function() {
        if (error) {
          error({ code: 2, message: 'Position unavailable', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
        }
      });
  }

  navigator.geolocation.getCurrentPosition = function(success, error, options) {
    var opts = Object.assign({}, options);
    if (!opts.timeout || opts.timeout > 5000) opts.timeout = 5000;
    nativeGetCurrentPosition(success, function(err) {
      if (err && (err.code === 2 || err.code === 3)) {
        ipFallback(success, error);
      } else if (error) {
        error(err);
      }
    }, opts);
  };

  navigator.geolocation.watchPosition = function(success, error, options) {
    var fallbackDone = false;
    var opts = Object.assign({}, options);
    if (!opts.timeout || opts.timeout > 5000) opts.timeout = 5000;
    var watchId = nativeWatchPosition(function(pos) {
      success(pos);
    }, function(err) {
      if (err && (err.code === 2 || err.code === 3) && !fallbackDone) {
        fallbackDone = true;
        ipFallback(success, error);
      } else if (error) {
        error(err);
      }
    }, opts);
    return watchId;
  };
})();
`;

const NOTIFICATION_POLYFILL_CODE = `
(function() {
  if (window.__Nav0NotificationPatched) return;
  window.__Nav0NotificationPatched = true;
  if (!window.__Nav0Notify) return;

  var _permission = window.__Nav0Notify.getPermissionSync() || 'default';
  var _instances = {};

  function Nav0Notification(title, options) {
    if (!(this instanceof Nav0Notification)) {
      throw new TypeError("Failed to construct 'Notification': Please use the 'new' operator.");
    }
    if (arguments.length === 0) {
      throw new TypeError("Failed to construct 'Notification': 1 argument required, but only 0 present.");
    }

    options = options || {};
    var self = this;

    this._id = 'n-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    this.title = String(title);
    this.body = options.body != null ? String(options.body) : '';
    this.icon = options.icon != null ? String(options.icon) : '';
    this.tag = options.tag != null ? String(options.tag) : '';
    this.data = options.data !== undefined ? options.data : null;
    this.silent = !!options.silent;
    this.requireInteraction = !!options.requireInteraction;
    this.dir = options.dir || 'auto';
    this.lang = options.lang || '';
    this.badge = options.badge != null ? String(options.badge) : '';
    this.image = options.image != null ? String(options.image) : '';
    this.timestamp = options.timestamp || Date.now();

    this.onclick = null;
    this.onclose = null;
    this.onerror = null;
    this.onshow = null;

    this._listeners = {};

    _instances[this._id] = this;

    window.__Nav0Notify.show({
      id: this._id,
      title: this.title,
      body: this.body,
      icon: this.icon,
      tag: this.tag,
      silent: this.silent,
      requireInteraction: this.requireInteraction,
    }).then(function(result) {
      if (result && result.error) {
        var evt = new Event('error');
        self.dispatchEvent(evt);
      }
    }).catch(function() {
      var evt = new Event('error');
      self.dispatchEvent(evt);
    });
  }

  Nav0Notification.prototype.close = function() {
    window.__Nav0Notify.close(this._id);
    delete _instances[this._id];
  };

  Nav0Notification.prototype.addEventListener = function(type, listener) {
    if (typeof listener !== 'function') return;
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(listener);
  };

  Nav0Notification.prototype.removeEventListener = function(type, listener) {
    if (!this._listeners[type]) return;
    this._listeners[type] = this._listeners[type].filter(function(l) { return l !== listener; });
  };

  Nav0Notification.prototype.dispatchEvent = function(event) {
    var listeners = this._listeners[event.type] || [];
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i].call(this, event); } catch(e) { console.error(e); }
    }
    var handler = this['on' + event.type];
    if (typeof handler === 'function') {
      try { handler.call(this, event); } catch(e) { console.error(e); }
    }
    return true;
  };

  Object.defineProperty(Nav0Notification, 'permission', {
    get: function() { return _permission; },
    configurable: true,
    enumerable: true,
  });

  Object.defineProperty(Nav0Notification, 'maxActions', {
    get: function() { return 0; },
    configurable: true,
    enumerable: true,
  });

  Nav0Notification.requestPermission = function(callback) {
    return window.__Nav0Notify.requestPermission().then(function(result) {
      _permission = result;
      if (typeof callback === 'function') callback(result);
      return result;
    });
  };

  // Route events from main process to notification instances
  window.__Nav0Notify.onEvent(function(data) {
    var notif = _instances[data.id];
    if (!notif) return;
    var event = new Event(data.type);
    notif.dispatchEvent(event);
    if (data.type === 'close') {
      delete _instances[data.id];
    }
  });

  window.Notification = Nav0Notification;
})();
`;

const SHARE_POLYFILL_CODE = `
(function() {
  if (window.__Nav0SharePatched) return;
  window.__Nav0SharePatched = true;

  navigator.canShare = function(data) {
    if (!data) return false;
    if (data.files && data.files.length > 0) return false;
    if (!data.title && !data.text && !data.url) return false;
    if (data.url) {
      try { new URL(data.url); } catch(e) {
        try { new URL(data.url, location.href); } catch(e2) { return false; }
      }
    }
    return true;
  };

  navigator.share = function(data) {
    if (!data || typeof data !== 'object') {
      return Promise.reject(new TypeError('Invalid share data'));
    }
    if (data.files && data.files.length > 0) {
      return Promise.reject(new TypeError('File sharing is not supported'));
    }
    if (!data.title && !data.text && !data.url) {
      return Promise.reject(new TypeError('Share data must have at least one of: title, text, url'));
    }
    var shareData = { title: data.title, text: data.text, url: data.url };
    if (shareData.url) {
      try {
        shareData.url = new URL(shareData.url, location.href).href;
      } catch(e) {
        return Promise.reject(new TypeError('Invalid URL: ' + shareData.url));
      }
    }
    if (!window.__Nav0Share || !window.__Nav0Share.share) {
      return Promise.reject(new DOMException('Share API unavailable', 'AbortError'));
    }
    return window.__Nav0Share.share(shareData).then(function(result) {
      if (!result || !result.success) {
        throw new DOMException(result && result.error || 'Share failed', 'AbortError');
      }
      try {
        var toast = document.createElement('div');
        toast.textContent = 'Copied to clipboard';
        toast.setAttribute('style',
          'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);' +
          'background:rgba(0,0,0,0.8);color:#fff;padding:8px 16px;border-radius:8px;' +
          'font-size:14px;z-index:2147483647;pointer-events:none;' +
          'animation:nav0-share-fade 2s forwards;font-family:system-ui,sans-serif;'
        );
        var style = document.createElement('style');
        style.textContent = '@keyframes nav0-share-fade{0%{opacity:1}70%{opacity:1}100%{opacity:0}}';
        document.body.appendChild(style);
        document.body.appendChild(toast);
        setTimeout(function() { toast.remove(); style.remove(); }, 2000);
      } catch(e) {}
      return undefined;
    });
  };
})();
`;

// Browser identity patch: makes navigator.userAgentData report Chrome brands
// instead of Electron. This is always injected (including on challenge pages)
// because it corrects a browser identity mismatch, not adds new functionality.
const BROWSER_IDENTITY_PATCH = `
(function() {
  if (window.__Nav0IdentityPatched) return;
  window.__Nav0IdentityPatched = true;

  // Ensure window.chrome exists. Electron does not expose this object,
  // but real Chrome always has it. Its absence is a basic bot detection signal.
  try {
    if (!window.chrome) {
      window.chrome = {};
    }
    if (!window.chrome.runtime) {
      window.chrome.runtime = {
        connect: function() { return { onMessage: { addListener: function(){} }, postMessage: function(){}, onDisconnect: { addListener: function(){} } }; },
        sendMessage: function() {},
        id: undefined
      };
    }
    if (!window.chrome.csi) {
      window.chrome.csi = function() { return { startE: Date.now(), onloadT: Date.now(), pageT: Date.now() - performance.timing.navigationStart, tran: 15 }; };
    }
    if (!window.chrome.loadTimes) {
      window.chrome.loadTimes = function() { return { commitLoadTime: Date.now() / 1000, connectionInfo: 'h2', finishDocumentLoadTime: Date.now() / 1000, finishLoadTime: Date.now() / 1000, firstPaintAfterLoadTime: 0, firstPaintTime: Date.now() / 1000, navigationType: 'Other', npnNegotiatedProtocol: 'h2', requestTime: Date.now() / 1000 - 0.1, startLoadTime: Date.now() / 1000 - 0.1, wasAlternateProtocolAvailable: false, wasFetchedViaSpdy: true, wasNpnNegotiated: true }; };
    }
  } catch(e) {}

  // Patch navigator.userAgentData to report Chrome instead of Electron.
  // Electron includes "Electron" in the brands list, which bot-detection
  // scripts (Cloudflare Turnstile, etc.) flag as non-standard.
  try {
    var ua = navigator.userAgent || '';
    var chromeMatch = ua.match(/Chrome\\/(\\d+)/);
    if (chromeMatch && navigator.userAgentData) {
      var majorVersion = chromeMatch[1];
      var fakeBrands = [
        { brand: 'Chromium', version: majorVersion },
        { brand: 'Google Chrome', version: majorVersion },
        { brand: 'Not-A.Brand', version: '99' }
      ];
      var fakeMobile = navigator.userAgentData.mobile || false;
      var fakePlatform = navigator.userAgentData.platform || 'Unknown';

      Object.defineProperty(navigator, 'userAgentData', {
        get: function() {
          return {
            brands: fakeBrands,
            mobile: fakeMobile,
            platform: fakePlatform,
            getHighEntropyValues: function(hints) {
              return Promise.resolve({
                brands: fakeBrands,
                mobile: fakeMobile,
                platform: fakePlatform,
                uaFullVersion: majorVersion + '.0.0.0',
                fullVersionList: fakeBrands.map(function(b) { return { brand: b.brand, version: b.version + '.0.0.0' }; }),
                architecture: 'x86',
                bitness: '64',
                model: '',
                platformVersion: '10.0.0',
                wow64: false
              });
            },
            toJSON: function() {
              return { brands: fakeBrands, mobile: fakeMobile, platform: fakePlatform };
            }
          };
        },
        configurable: true
      });
    }
  } catch(e) {}
})();
`;

function injectScript(code: string): void {
  try {
    const blob = new Blob([code], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    const script = document.createElement('script');
    script.src = blobUrl;
    script.onload = () => { URL.revokeObjectURL(blobUrl); script.remove(); };
    script.onerror = () => { URL.revokeObjectURL(blobUrl); script.remove(); };
    (document.head || document.documentElement).appendChild(script);
  } catch { /* ignore */ }
}

function injectPolyfill(): void {
  try {
    // Always inject browser identity patches (including on challenge pages)
    // to correct Electron's userAgentData which exposes "Electron" in brands.
    injectScript(BROWSER_IDENTITY_PATCH);

    // Skip functionality polyfills on Cloudflare/CAPTCHA challenge pages so
    // Turnstile's environment integrity checks see unmodified native APIs.
    try {
      if (ipcRenderer.sendSync('is-challenge-page')) return;
    } catch { /* ignore — fall through to inject */ }

    // Skip injection on pages with strict CSP that blocks inline scripts.
    // Check for a meta CSP tag; server-sent CSP headers can't be read from
    // the preload, but the try/catch below handles that case silently.
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (cspMeta) {
      const content = cspMeta.getAttribute('content') || '';
      if (content.includes('script-src') && !content.includes("'unsafe-inline'")) {
        return; // CSP would block inline script injection
      }
    }

    const code = POLYFILL_CODE + SHARE_POLYFILL_CODE + NOTIFICATION_POLYFILL_CODE;
    injectScript(code);
  } catch {
    // Ignore injection errors
  }
}

// Observe the document for the first element addition (the <html> tag from
// the incoming page) and inject the polyfill immediately. This fires as a
// microtask before synchronous <head> scripts execute.
const observer = new MutationObserver(() => {
  if (document.documentElement) {
    observer.disconnect();
    injectPolyfill();
  }
});

observer.observe(document, { childList: true, subtree: true });

// Also inject for the initial about:blank document if <html> already exists
if (document.documentElement) {
  injectPolyfill();
}
