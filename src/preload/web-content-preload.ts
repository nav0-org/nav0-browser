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

function injectPolyfill(): void {
  try {
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

    const code = POLYFILL_CODE + SHARE_POLYFILL_CODE;

    // Use a blob URL instead of inline script to avoid CSP violations.
    // Blob URLs are allowed by most CSPs that include 'blob:' in script-src.
    const blob = new Blob([code], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    const script = document.createElement('script');
    script.src = blobUrl;
    script.onload = () => {
      URL.revokeObjectURL(blobUrl);
      script.remove();
    };
    script.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      script.remove();
    };
    (document.head || document.documentElement).appendChild(script);
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
