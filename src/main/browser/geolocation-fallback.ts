/**
 * Geolocation fallback for platforms without a native provider (Linux).
 *
 * On Linux, Chromium's network-based geolocation requires a Google API key.
 * This module injects a thin wrapper around navigator.geolocation that tries
 * the native implementation first and, on failure, falls back to a free
 * IP-based geolocation service (city-level accuracy).
 */

import { WebContents } from 'electron';

const POLYFILL = `
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
    nativeGetCurrentPosition(success, function(err) {
      if (err && err.code === 2) {
        ipFallback(success, error);
      } else if (error) {
        error(err);
      }
    }, options);
  };

  navigator.geolocation.watchPosition = function(success, error, options) {
    var watchId = nativeWatchPosition(function(pos) {
      success(pos);
    }, function(err) {
      if (err && err.code === 2) {
        ipFallback(success, error);
      } else if (error) {
        error(err);
      }
    }, options);
    return watchId;
  };
})();
`;

/**
 * Inject the geolocation fallback polyfill into a webContents.
 * Call this after the page navigates so that future geolocation calls
 * use the fallback when the native provider is unavailable.
 */
export function injectGeolocationFallback(webContents: WebContents): void {
  webContents.executeJavaScript(POLYFILL).catch(() => {
    // Ignore injection errors (e.g. page navigated away)
  });
}
