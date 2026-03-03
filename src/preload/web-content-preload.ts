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
 * Google API key), it falls back to a free IP-based lookup.
 */

const POLYFILL_CODE = `
(function() {
  if (window.__nav0GeolocationPatched) return;
  window.__nav0GeolocationPatched = true;

  var nativeGetCurrentPosition = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
  var nativeWatchPosition = navigator.geolocation.watchPosition.bind(navigator.geolocation);

  function ipFallback(success, error) {
    fetch('https://ipapi.co/json/')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
          throw new Error('Invalid response');
        }
        success({
          coords: {
            latitude: data.latitude,
            longitude: data.longitude,
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

function injectPolyfill(): void {
  try {
    const script = document.createElement('script');
    script.textContent = POLYFILL_CODE;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
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
