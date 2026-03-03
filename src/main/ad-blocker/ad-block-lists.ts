/**
 * Comprehensive ad-blocker lists for domain blocking, URL pattern matching,
 * cosmetic filtering, and dynamic ad removal.
 */

// Well-known ad and tracking domains
export const AD_BLOCK_DOMAINS: string[] = [
  // Google Ads & Analytics
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'google-analytics.com',
  'googletagmanager.com',
  'googletagservices.com',
  'pagead2.googlesyndication.com',
  'adservice.google.com',
  'ade.googlesyndication.com',
  'imasdk.googleapis.com',
  'fundingchoicesmessages.google.com',

  // Facebook / Meta
  'facebook.net',
  'connect.facebook.net',
  'pixel.facebook.com',
  'an.facebook.com',

  // Amazon Ads
  'amazon-adsystem.com',
  'aax.amazon-adsystem.com',
  'assoc-amazon.com',

  // Adobe / Demdex
  'adobedtm.com',
  'demdex.net',
  'omtrdc.net',
  'everesttech.net',

  // Major Ad Networks
  'adnxs.com',
  'adsrvr.org',
  'adform.net',
  'serving-sys.com',
  'criteo.com',
  'criteo.net',
  'casalemedia.com',
  'rubiconproject.com',
  'pubmatic.com',
  'openx.net',
  'bidswitch.net',
  'mathtag.com',
  'rlcdn.com',
  'contextweb.com',
  'indexexchange.com',
  'smartadserver.com',
  'yieldmo.com',
  'tribalfusion.com',
  'undertone.com',
  'zedo.com',
  'sovrn.com',
  'lijit.com',
  'districtm.io',
  'spotxchange.com',
  'spotx.tv',
  'sharethrough.com',
  'teads.tv',
  'yldbt.com',
  'medianet.com',
  'media.net',
  '33across.com',
  'triplelift.com',
  'gumgum.com',
  'rhythmone.com',
  'conversantmedia.com',
  'valueclick.com',

  // Video Ad Networks
  'vdo.ai',
  'vidoomy.com',
  'connatix.com',
  'primis.tech',
  'aniview.com',
  'cedato.com',
  'unruly.co',
  'vi.ai',
  'viralize.com',
  'springserve.com',
  'videohub.tv',
  'innovid.com',
  'extremereach.io',
  'flashtalking.com',
  'jivox.com',
  'brightroll.com',
  'tubemogul.com',
  'videologygroup.com',
  'adap.tv',
  'selectmedia.asia',
  'sekindo.com',
  'vertamedia.com',
  'chocolate-platform.com',
  'beachfront.com',
  'synacor.com',

  // Video Player Ad Integration
  'imasdk.googleapis.com',
  'vid.springserve.com',
  'ads.stickyadstv.com',
  'vast.adsrvr.org',
  'vpaid.pubmatic.com',

  // Content Recommendation
  'taboola.com',
  'outbrain.com',
  'revcontent.com',
  'mgid.com',
  'content.ad',
  'contentad.net',
  'nativo.com',
  'zergnet.com',
  'dianomi.com',
  'yahoogemini.com',
  'adblade.com',

  // Analytics & Tracking
  'hotjar.com',
  'fullstory.com',
  'mouseflow.com',
  'crazyegg.com',
  'luckyorange.com',
  'clicktale.net',
  'newrelic.com',
  'nr-data.net',
  'chartbeat.com',
  'parsely.com',
  'segment.com',
  'segment.io',
  'mixpanel.com',
  'amplitude.com',
  'heap.io',
  'heapanalytics.com',
  'quantserve.com',
  'scorecardresearch.com',
  'moatads.com',
  'comscore.com',
  'imrworldwide.com',
  'statcounter.com',
  'webtrends.com',
  'kissmetrics.com',
  'optimizely.com',
  'branch.io',
  'appsflyer.com',
  'adjust.com',
  'kochava.com',
  'singular.net',
  'clicky.com',
  'histats.com',
  'getclicky.com',
  'onecount.net',
  'effectivemeasure.net',

  // Data Management Platforms
  'bluekai.com',
  'krxd.net',
  'exelator.com',
  'eyeota.net',
  'lotame.com',
  'crwdcntrl.net',

  // Social Widgets & Sharing
  'sharethis.com',
  'addthis.com',
  'addtoany.com',

  // Retargeting & Remarketing
  'adroll.com',
  'perfectaudience.com',
  'retargeter.com',

  // Yahoo / Verizon Media
  'ads.yahoo.com',
  'advertising.com',
  'adtech.de',
  'gemini.yahoo.com',
  'bluelithium.com',

  // Microsoft Ads
  'ads.microsoft.com',
  'bat.bing.com',
  'bingads.microsoft.com',

  // Twitter/X Ads
  'ads-twitter.com',
  'ads-api.twitter.com',
  'analytics.twitter.com',

  // LinkedIn Ads
  'ads.linkedin.com',
  'snap.licdn.com',

  // Pinterest Ads
  'ads.pinterest.com',
  'ct.pinterest.com',

  // TikTok Ads
  'ads.tiktok.com',
  'analytics.tiktok.com',

  // PopUp / PopUnder / Interstitial
  'popads.net',
  'popcash.net',
  'propellerads.com',
  'juicyads.com',
  'exoclick.com',
  'trafficfactory.biz',
  'hilltopads.net',
  'clickadu.com',
  'admaven.com',
  'adcash.com',
  'evadav.com',
  'pushwoosh.com',
  'pushengage.com',
  'onesignal.com',
  'pushcrew.com',
  'subscribers.com',

  // Ad Verification
  'doubleverify.com',
  'adsafeprotected.com',
  'grapeshot.co.uk',
  'moat.com',
  'iasds01.com',

  // Mobile Ad Networks
  'adcolony.com',
  'inmobi.com',
  'mopub.com',
  'vungle.com',
  'applovin.com',
  'chartboost.com',
  'admob.com',
  'flurry.com',
  'ironsrc.com',
  'smaato.com',
  'tapjoy.com',
  'startapp.com',

  // Additional Ad Exchanges
  'liadm.com',
  'intentiq.com',
  'adsymptotic.com',
  'adlightning.com',
  'confiant-integrations.net',
  'id5-sync.com',

  // Affiliate & Click Tracking
  'bounceexchange.com',
  'narrativ.com',
  'skimresources.com',
  'skimlinks.com',
  'impact.com',
  'clickbank.net',
  'cj.com',
  'dpbolvw.net',
  'jdoqocy.com',
  'kqzyfj.com',
  'qksrv.net',
  'anrdoezrs.net',
  'commission-junction.com',
  'emjcd.com',
  'tqlkg.com',
  'awltovhc.com',
  'ftjcfx.com',
  'lduhtrp.net',
  'apmebf.com',

  // India-Specific Ad Networks & Providers
  'colombiaonline.com',
  'vserv.com',
  'inuxu.com',
  'vertoz.com',
  'adgebra.in',
  'izooto.com',
  'affle.com',
  'pokkt.com',
  'tyroo.com',
  'seventynine.in',
  'adyogi.com',
  'silverpush.co',

  // Indian News Site Common Ad Providers
  'grapeshot.co.uk',
  'netcore.co.in',
  'moengage.com',
  'webengage.com',
  'clevertap.com',
  'vizury.com',

  // Common CDN-hosted ad scripts
  'cdn.taboola.com',
  'cdn.outbrain.com',
  'securepubads.g.doubleclick.net',
  'ad.doubleclick.net',
  'stats.g.doubleclick.net',
  'tpc.googlesyndication.com',

  // Consent / Cookie Wall (tracking-related)
  'cdn.cookielaw.org',
  'consent.cookiebot.com',
  'quantcast.mgr.consensu.org',
  'cmpv2.ad.gt',
  'consensu.org',

  // Additional common ad domains
  'revrtb.com',
  'adsnative.com',
  'realsrv.com',
  'onaudience.com',
  'zemanta.com',
  'lockerdome.com',
  'snigelweb.com',
  'snigel.com',
  'mediavine.com',
  'adthrive.com',
  'ezoic.net',
  'ezoic.com',
  'ezojs.com',
  'monumetric.com',
  'freestar.com',
  'nitropay.com',
  'venatus.com',
  'playwire.com',
  'setupad.com',
  'yandex.ru/ads',
  'mc.yandex.ru',
  'an.yandex.ru',
];

// URL path patterns that indicate ad content
export const AD_URL_PATTERNS: RegExp[] = [
  /\/ads\//i,
  /\/advert/i,
  /\/banner[s]?\//i,
  /\/sponsor/i,
  /\/pixel[s]?\//i,
  /\/tracking\//i,
  /\/tracker\//i,
  /\/beacon\//i,
  /[?&]ad_/i,
  /[?&]adid=/i,
  /[?&]adserver/i,
  /\/pagead\//i,
  /\/aclk\?/i,
  /\/adsense/i,
  /\/adview/i,
  /\/adclick/i,
  /\/getads[/?]/i,
  /\/showads[/?]/i,
  /\/pop(?:up|under)/i,
  /\/interstitial/i,
  /\/ad-iframe/i,
  /\/ad_iframe/i,
  // Video ad patterns
  /\/vast\//i,
  /\/vast\.xml/i,
  /\/vpaid\//i,
  /\/vmap\//i,
  /[?&]vast=/i,
  /\/preroll/i,
  /\/midroll/i,
  /\/postroll/i,
  /\/video[_-]?ads?[/?]/i,
  /\/instream/i,
  /\/outstream/i,
  /\/adunit/i,
  /\/ad[_-]?tag/i,
];

// CSS selectors for cosmetic ad filtering - hides common ad containers
export const COSMETIC_FILTER_CSS = `
/* Google Ads */
ins.adsbygoogle,
[id^="google_ads_"],
[id^="div-gpt-ad"],
[id*="google_ads_iframe"],
.adsbygoogle,
[data-ad-client],
[data-ad-slot],
[data-google-query-id],

/* Common ad containers (specific patterns) */
[id^="ad-container"],
[id^="ad-wrapper"],
[id^="ad-banner"],
[id^="ad-leaderboard"],
[id^="ad-sidebar"],
[id^="ad-slot"],
[id^="ad_container"],
[id^="ad_wrapper"],
[id^="ad_banner"],
[id^="ad_slot"],
[class^="ad-container"],
[class^="ad-wrapper"],
[class^="ad-banner"],
[class^="ad-leaderboard"],
[class^="ad-sidebar"],
[class^="ad-slot"],
[class^="ad-unit"],
[class^="ad-zone"],
[class^="ad-placement"],

/* Advertisement labels */
[class*="advertisement"],
[class*="sponsored-content"],
[class*="sponsored-post"],
[class*="promoted-content"],
[id*="advertisement"],
[id*="sponsored-content"],
[aria-label="advertisement" i],
[aria-label="Ads" i],
[aria-label="Sponsored" i],

/* Ad iframes */
iframe[src*="doubleclick.net"],
iframe[src*="googlesyndication.com"],
iframe[src*="googleadservices.com"],
iframe[src*="amazon-adsystem.com"],
iframe[src*="adnxs.com"],
iframe[src*="taboola.com"],
iframe[src*="outbrain.com"],
iframe[src*="criteo."],
iframe[src*="adform."],
iframe[src*="serving-sys.com"],
iframe[src*="casalemedia.com"],
iframe[src*="pubmatic.com"],
iframe[src*="rubiconproject.com"],
iframe[src*="openx.net"],
iframe[id*="google_ads"],
iframe[name*="google_ads"],
iframe[src*="imasdk.googleapis.com"],

/* Taboola / Outbrain / Content Recommendation */
.trc_rbox_container,
.trc_related_container,
.trc_spotlight_widget,
.OUTBRAIN,
[data-widget-id*="taboola"],
[id^="taboola-"],
#taboola-below-article,
#taboola-below-article-thumbnails,
.ob-widget,
.ob-smartfeed-wrapper,
.ob-widget-section,
[data-outbrain-widget],
[data-revive-id],
.mgbox,
[id^="mgid_"],

/* Social tracking widgets */
.addthis_toolbox,
.sharethis-inline-share-buttons,

/* Video Ad Containers */
[id*="video-ad"],
[id*="video_ad"],
[id*="videoAd"],
[class*="video-ad-"],
[class*="video_ad_"],
[class*="videoAd"],
[class*="preroll"],
[class*="midroll"],
[class*="postroll"],
[class*="outstream-ad"],
[class*="outstream_ad"],
[class*="instream-ad"],
[data-ad-type="video"],
[class*="vdo-ai"],
[id*="vdo-ai"],
[class*="primis-"],
[id*="primis-"],
[class*="connatix-"],
[id*="connatix-"],
[class*="vjs-ad"],

/* Autoplay video ad overlays */
[class*="video-ad-overlay"],
[class*="ad-overlay"],
[class*="ad_overlay"],
[class*="adOverlay"],
.ima-ad-container,
.ima-container,
[class*="ima-countdown"],
.vjs-ad-playing,

/* Sticky / Fixed / Floating ads */
.sticky-ad,
.floating-ad,
[class*="sticky-ad"],
[class*="stickyad"],
[class*="sticky_ad"],
[class*="floating-ad"],
[class*="floating_ad"],
[class*="floatingAd"],
[class*="bottom-sticky"],
[class*="footer-ad"],
[class*="footer_ad"],
[id*="sticky-ad"],
[id*="sticky_ad"],
[id*="floating-ad"],
[id*="floating_ad"],

/* Interstitial / Overlay / Modal ads */
[class*="interstitial-ad"],
[class*="interstitial_ad"],
[class*="modal-ad"],
[class*="overlay-ad"],
[class*="overlay_ad"],
[class*="fullscreen-ad"],
[class*="fullscreen_ad"],
[id*="interstitial-ad"],
[id*="interstitial_ad"],
[id*="overlay-ad"],

/* Popup / Notification ads */
[class*="push-notification-ad"],
[class*="notification-ad"],
[class*="web-push"],
[id*="notification-ad"],

/* Common ad size classes */
.ad-300x250,
.ad-728x90,
.ad-160x600,
.ad-320x50,
.ad-970x250,
.ad-970x90,
.ad-300x600,
.ad-250x250,
.billboard-ad,
.leaderboard-ad,
.rectangle-ad,
.skyscraper-ad,

/* News site specific ad patterns */
[class*="story-ad"],
[class*="story_ad"],
[class*="article-ad"],
[class*="article_ad"],
[class*="inline-ad"],
[class*="inline_ad"],
[class*="inArticleAd"],
[class*="in-article-ad"],
[class*="mid-article-ad"],
[id*="story-ad"],
[id*="article-ad"],
[id*="inline-ad"],

/* Indian news sites common patterns */
[class*="_advertisement"],
[class*="_adunit"],
[class*="adbox"],
[id*="adbox"],
[class*="ads-wrapper"],
[id*="ads-wrapper"],
[class*="topAd"],
[class*="bottomAd"],
[class*="sideAd"],
[id*="topAd"],
[id*="bottomAd"],
[id*="sideAd"],

/* MediaVine / AdThrive / Freestar */
[id^="adhesion"],
[class*="adhesion"],
[data-freestar],
[class*="adthrive"],
[class*="mediavine"],
[id*="ezoic-pub-ad"],

/* GPT (Google Publisher Tag) ad containers */
[data-google-query-id],
div[id^="google_ads_iframe_"],
div[class*="gpt-ad"],
div[class*="gpt_ad"],

/* Generic patterns for dynamically injected ad wrappers */
[style*="z-index: 2147483647"],
[style*="z-index:2147483647"] {
  display: none !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}
`;

/**
 * JavaScript to inject into pages for dynamic ad blocking.
 * Uses MutationObserver to catch ads inserted after page load,
 * blocks autoplay on video ad elements, and removes overlay ads.
 */
export const AD_BLOCK_SCRIPT = `
(function() {
  'use strict';
  if (window.__nav0AdBlockerActive) return;
  window.__nav0AdBlockerActive = true;

  // Selectors for ad elements to remove/hide
  var adSelectors = [
    'ins.adsbygoogle',
    '[id^="google_ads_"]',
    '[id^="div-gpt-ad"]',
    '[id*="google_ads_iframe"]',
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="googlesyndication.com"]',
    'iframe[src*="imasdk.googleapis.com"]',
    '[class*="adsbygoogle"]',
    '[data-ad-client]',
    '[data-ad-slot]',
    '[data-google-query-id]',
    '[id^="taboola-"]',
    '.trc_rbox_container',
    '.trc_related_container',
    '.OUTBRAIN',
    '[data-outbrain-widget]',
    '[id*="video-ad"]',
    '[id*="video_ad"]',
    '[id*="videoAd"]',
    '[class*="video-ad-"]',
    '[class*="video_ad_"]',
    '[class*="videoAd"]',
    '[class*="preroll"]',
    '[class*="outstream-ad"]',
    '[class*="outstream_ad"]',
    '[class*="vdo-ai"]',
    '[id*="vdo-ai"]',
    '[class*="primis-"]',
    '[id*="primis-"]',
    '[class*="connatix-"]',
    '[id*="connatix-"]',
    '.ima-ad-container',
    '[class*="interstitial-ad"]',
    '[class*="interstitial_ad"]',
    '[class*="overlay-ad"]',
    '[class*="overlay_ad"]',
    '[class*="fullscreen-ad"]',
    '[class*="fullscreen_ad"]',
    '[id*="interstitial-ad"]',
    '[id*="overlay-ad"]',
    '[class*="sticky-ad"]',
    '[class*="sticky_ad"]',
    '[class*="floating-ad"]',
    '[class*="floating_ad"]',
    '[id*="sticky-ad"]',
    '[id*="sticky_ad"]',
    '[id*="floating-ad"]',
    '[id*="floating_ad"]',
    '[class*="story-ad"]',
    '[class*="story_ad"]',
    '[class*="article-ad"]',
    '[class*="article_ad"]',
    '[class*="inline-ad"]',
    '[class*="inline_ad"]',
    '[class*="in-article-ad"]',
    '[data-freestar]',
    '[id^="ezoic-pub-ad"]',
    '[id^="mgid_"]',
    '.mgbox',
    '[class*="adbox"]',
    '[id*="adbox"]'
  ];

  var combinedSelector = adSelectors.join(',');

  function hideElement(el) {
    if (el && el.style) {
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('height', '0', 'important');
      el.style.setProperty('min-height', '0', 'important');
      el.style.setProperty('max-height', '0', 'important');
      el.style.setProperty('overflow', 'hidden', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
      el.setAttribute('data-nav0-blocked', 'true');
    }
  }

  // Remove existing ad elements
  function removeExistingAds() {
    try {
      var ads = document.querySelectorAll(combinedSelector);
      for (var i = 0; i < ads.length; i++) {
        hideElement(ads[i]);
      }
    } catch(e) {}
  }

  // Block autoplay on video elements that appear to be ads
  function blockAdVideos() {
    try {
      var videos = document.querySelectorAll('video[autoplay]');
      for (var i = 0; i < videos.length; i++) {
        var video = videos[i];
        var parent = video.parentElement;
        var isAd = false;

        // Walk up 5 levels checking for ad-related attributes
        var el = parent;
        for (var j = 0; j < 5 && el; j++) {
          var id = (el.id || '').toLowerCase();
          var cls = (el.className && typeof el.className === 'string') ? el.className.toLowerCase() : '';

          if (id.indexOf('ad') > -1 && (id.indexOf('ad-') > -1 || id.indexOf('ad_') > -1 || id.indexOf('ads') > -1 || id === 'ad') ||
              cls.indexOf('ad-') > -1 || cls.indexOf('ad_') > -1 || cls.indexOf('ads-') > -1 ||
              cls.indexOf('video-ad') > -1 || cls.indexOf('video_ad') > -1 || cls.indexOf('videoad') > -1 ||
              cls.indexOf('preroll') > -1 || cls.indexOf('outstream') > -1 || cls.indexOf('instream-ad') > -1 ||
              cls.indexOf('vdo-ai') > -1 || cls.indexOf('primis') > -1 || cls.indexOf('connatix') > -1 ||
              el.hasAttribute('data-ad-client') || el.hasAttribute('data-ad-slot') ||
              el.hasAttribute('data-google-query-id')) {
            isAd = true;
            break;
          }
          el = el.parentElement;
        }

        // Check video source for ad indicators
        var src = (video.src || video.currentSrc || '').toLowerCase();
        if (src.indexOf('ads') > -1 || src.indexOf('vast') > -1 || src.indexOf('vpaid') > -1 ||
            src.indexOf('preroll') > -1 || src.indexOf('doubleclick') > -1 ||
            src.indexOf('googlesyndication') > -1 || src.indexOf('imasdk') > -1) {
          isAd = true;
        }

        if (isAd) {
          video.pause();
          video.removeAttribute('autoplay');
          video.muted = true;
          video.src = '';
          video.load();
          hideElement(video);
          if (parent) hideElement(parent);
        }
      }
    } catch(e) {}
  }

  // Remove high z-index overlay ads
  function removeOverlayAds() {
    try {
      var allElements = document.querySelectorAll('[style*="z-index"]');
      for (var i = 0; i < allElements.length; i++) {
        var el = allElements[i];
        var style = window.getComputedStyle(el);
        var zIndex = parseInt(style.zIndex);
        if (zIndex > 999999 && el.tagName !== 'DIALOG') {
          var rect = el.getBoundingClientRect();
          // Only target large overlays covering significant viewport area
          if (rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.3) {
            var id = (el.id || '').toLowerCase();
            var cls = (el.className && typeof el.className === 'string') ? el.className.toLowerCase() : '';
            // Avoid removing legitimate modals (cookie consent, login, etc.)
            if (cls.indexOf('cookie') > -1 || cls.indexOf('consent') > -1 ||
                cls.indexOf('login') > -1 || cls.indexOf('modal') > -1 ||
                id.indexOf('cookie') > -1 || id.indexOf('consent') > -1 ||
                id.indexOf('login') > -1) {
              continue;
            }
            // Check if it looks like an ad
            var innerHTML = el.innerHTML || '';
            if (innerHTML.indexOf('adsbygoogle') > -1 || innerHTML.indexOf('doubleclick') > -1 ||
                innerHTML.indexOf('googlesyndication') > -1 || innerHTML.indexOf('taboola') > -1 ||
                innerHTML.indexOf('outbrain') > -1 || innerHTML.indexOf('sponsor') > -1 ||
                cls.indexOf('ad') > -1 || id.indexOf('ad') > -1 ||
                cls.indexOf('interstitial') > -1 || cls.indexOf('overlay') > -1) {
              hideElement(el);
            }
          }
        }
      }
    } catch(e) {}
  }

  // Prevent scripts from creating ad-related iframes
  var originalCreateElement = document.createElement.bind(document);
  document.createElement = function(tagName) {
    var el = originalCreateElement(tagName);
    if (tagName.toLowerCase() === 'iframe') {
      var originalSetAttribute = el.setAttribute.bind(el);
      el.setAttribute = function(name, value) {
        if (name === 'src' && typeof value === 'string') {
          var lcValue = value.toLowerCase();
          if (lcValue.indexOf('doubleclick.net') > -1 ||
              lcValue.indexOf('googlesyndication.com') > -1 ||
              lcValue.indexOf('imasdk.googleapis.com') > -1 ||
              lcValue.indexOf('amazon-adsystem.com') > -1 ||
              lcValue.indexOf('taboola.com') > -1 ||
              lcValue.indexOf('outbrain.com') > -1 ||
              lcValue.indexOf('adnxs.com') > -1 ||
              lcValue.indexOf('criteo.') > -1 ||
              lcValue.indexOf('pubmatic.com') > -1 ||
              lcValue.indexOf('adform.net') > -1 ||
              lcValue.indexOf('serving-sys.com') > -1) {
            value = 'about:blank';
          }
        }
        return originalSetAttribute(name, value);
      };
      // Also intercept direct src property sets
      var srcDescriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
      if (srcDescriptor && srcDescriptor.set) {
        Object.defineProperty(el, 'src', {
          set: function(value) {
            if (typeof value === 'string') {
              var lcValue = value.toLowerCase();
              if (lcValue.indexOf('doubleclick.net') > -1 ||
                  lcValue.indexOf('googlesyndication.com') > -1 ||
                  lcValue.indexOf('imasdk.googleapis.com') > -1 ||
                  lcValue.indexOf('amazon-adsystem.com') > -1 ||
                  lcValue.indexOf('taboola.com') > -1 ||
                  lcValue.indexOf('outbrain.com') > -1 ||
                  lcValue.indexOf('adnxs.com') > -1 ||
                  lcValue.indexOf('criteo.') > -1) {
                value = 'about:blank';
              }
            }
            srcDescriptor.set.call(this, value);
          },
          get: function() {
            return srcDescriptor.get.call(this);
          },
          configurable: true
        });
      }
    }
    return el;
  };

  // MutationObserver to catch dynamically inserted ads
  var observer = new MutationObserver(function(mutations) {
    var shouldScan = false;
    for (var i = 0; i < mutations.length; i++) {
      var mutation = mutations[i];
      if (mutation.addedNodes.length > 0) {
        for (var j = 0; j < mutation.addedNodes.length; j++) {
          var node = mutation.addedNodes[j];
          if (node.nodeType === 1) {
            shouldScan = true;
            // Directly check the added node
            try {
              if (node.matches && node.matches(combinedSelector)) {
                hideElement(node);
              }
              // Check children of added node
              var childAds = node.querySelectorAll ? node.querySelectorAll(combinedSelector) : [];
              for (var k = 0; k < childAds.length; k++) {
                hideElement(childAds[k]);
              }
            } catch(e) {}
          }
        }
      }
    }
    if (shouldScan) {
      blockAdVideos();
    }
  });

  // Run initial cleanup
  removeExistingAds();
  blockAdVideos();

  // Start observing
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Periodic cleanup for stubborn ads
  var cleanupCount = 0;
  var cleanupInterval = setInterval(function() {
    removeExistingAds();
    blockAdVideos();
    removeOverlayAds();
    cleanupCount++;
    // Run aggressively for the first 30 seconds, then stop periodic checks
    if (cleanupCount > 30) {
      clearInterval(cleanupInterval);
    }
  }, 1000);

  // Also run on visibility change (tab becoming active can trigger ad loads)
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      setTimeout(function() {
        removeExistingAds();
        blockAdVideos();
        removeOverlayAds();
      }, 500);
    }
  });
})();
`;
