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
  'tpc.googlesyndication.com',
  'securepubads.g.doubleclick.net',
  'ad.doubleclick.net',
  'stats.g.doubleclick.net',
  'cm.g.doubleclick.net',
  's0.2mdn.net',
  'z.moatads.com',
  'geo.moatads.com',
  'px.moatads.com',

  // Facebook / Meta
  // Note: facebook.net and connect.facebook.net removed — blocking them
  // breaks "Login with Facebook" on third-party sites. Tracking is still
  // mitigated by third-party cookie blocking.
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

  // Video Ad Networks & VAST/VPAID
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
  'vid.springserve.com',
  'ads.stickyadstv.com',
  'vast.adsrvr.org',
  'vpaid.pubmatic.com',
  'vdopia.com',
  'mantisadnetwork.com',
  'avocet.io',
  'nexage.com',

  // Content Recommendation
  'taboola.com',
  'cdn.taboola.com',
  'outbrain.com',
  'cdn.outbrain.com',
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
  // Note: onesignal.com removed — it's a legitimate push notification
  // service used by many sites, not an ad network
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
  'clmbtech.com',
  'jsrdn.com',
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
  'netcore.co.in',
  'moengage.com',
  'webengage.com',
  'clevertap.com',
  'vizury.com',
  'jeeng.com',
  'gamooga.com',
  'onclickmedia.net',
  'revx.io',
  'lemmadigital.com',

  // Consent / Cookie Wall (tracking-related)
  // Note: cdn.cookielaw.org removed — blocking it breaks sites like Spotify
  // that depend on OneTrust for initialization
  'consent.cookiebot.com',
  'quantcast.mgr.consensu.org',
  'cmpv2.ad.gt',
  'consensu.org',

  // Ad Monetization Platforms
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
  /\/ima3?\//i,
  /[?&]ad_rule=/i,
  /[?&]cust_params=.*ad/i,
];

// CSS selectors for cosmetic ad filtering
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
div[id^="google_ads_iframe_"],
div[class*="gpt-ad"],
div[class*="gpt_ad"],

/* Common ad containers */
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
.adsbox,
.ad-box,
.ad-player,
.advertising,
[data-ad-format],

/* Broader ad pattern matching — use specific prefixes to avoid
   false-positives on legitimate classes like "upload-addon", "breadcrumb-addon",
   "spread-admin", etc. */
[class*="banner-ad"],
[class*="sidebar-ad"],
[class*="google-ad"],
[class*="display-ad"],
[class*="native-ad"],
[class*="sticky-ad"],
[class*="inline-ad"],
[id*="banner-ad"],
[id*="sidebar-ad"],
[id*="google-ad"],
[id*="display-ad"],

/* Ad iframes by generic src patterns */
iframe[src*="ad."],
iframe[src*="ads."],
iframe[src*="adserver"],

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
[aria-label*="Advertisement"],

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
iframe[src*="imasdk.googleapis.com"],
iframe[id*="google_ads"],
iframe[name*="google_ads"],

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

/* Video Ad Containers & Players */
[id*="video-ad"],
[id*="video_ad"],
[id*="videoAd"],
[id*="player-ads"],
[class*="video-ad-"],
[class*="video_ad_"],
[class*="videoAd"],
.video-ads,
.video-ad-container,
.video-ad-module,
.video-advertisement,
.preroll-ads,
.player-ads,
.ad-player,
[class*="preroll"],
[class*="pre-roll"],
[class*="midroll"],
[class*="postroll"],
[class*="post-roll"],
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
.ad-showing,

/* Google IMA / Video Ad Overlays */
.ima-ad-container,
.ima-container,
[class*="ima-countdown"],
.vjs-ad-playing,
[class*="video-ad-overlay"],
[class*="ad-overlay"],
[class*="ad_overlay"],
[class*="adOverlay"],
div[class*="ima-"],
.ytp-ad-overlay-container,
.ytp-ad-text,
.ytp-ad-preview-container,

/* JW Player ad state */
.jwplayer.jw-state-advertising,

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

/* Colombia / clmbtech (Indian ad network) */
[id*="clmb"],
[class*="clmb"],

/* Generic high z-index overlays (ad wrappers) */
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
 * Early-injection script that sets up API-level hooks BEFORE page scripts run.
 * This neutralizes the Google IMA SDK, hooks HTMLMediaElement.prototype.play,
 * and prevents ad scripts from functioning even if loaded from cache.
 */
export const AD_BLOCK_EARLY_SCRIPT = `
(function() {
  'use strict';
  if (window.__Nav0AdBlockEarly) return;
  window.__Nav0AdBlockEarly = true;

  // Detect known video/streaming platforms where IMA mocking breaks playback
  var hostname = window.location.hostname.toLowerCase();
  var videoSites = ['youtube.com', 'youtu.be', 'youtube-nocookie.com',
                    'spotify.com', 'netflix.com', 'hulu.com',
                    'disneyplus.com', 'twitch.tv', 'vimeo.com', 'dailymotion.com',
                    'crunchyroll.com', 'primevideo.com', 'peacocktv.com'];
  var skipIMA = videoSites.some(function(site) {
    return hostname === site || hostname.endsWith('.' + site);
  });

  // ============================================================
  // 1. Google IMA SDK Mock
  //    Replaces the Google Interactive Media Ads SDK with a no-op
  //    stub so video players skip ads and play content directly.
  //    Skipped on known video platforms to avoid breaking playback.
  // ============================================================
  if (!skipIMA) {
  function NoopFn() {}
  function EventTarget() { this._handlers = {}; }
  EventTarget.prototype.addEventListener = function(e, fn) {
    if (!this._handlers[e]) this._handlers[e] = [];
    this._handlers[e].push(fn);
  };
  EventTarget.prototype.removeEventListener = function(e, fn) {
    if (!this._handlers[e]) return;
    this._handlers[e] = this._handlers[e].filter(function(h) { return h !== fn; });
  };
  EventTarget.prototype._fire = function(e, data) {
    var handlers = this._handlers[e] || [];
    for (var i = 0; i < handlers.length; i++) {
      try { handlers[i](data); } catch(ex) {}
    }
  };

  function AdDisplayContainer() {}
  AdDisplayContainer.prototype.initialize = NoopFn;
  AdDisplayContainer.prototype.destroy = NoopFn;

  function AdsRenderingSettings() {}

  function CompanionAdSelectionSettings() {}
  CompanionAdSelectionSettings.CreativeType = { ALL: 'ALL', IMAGE: 'IMAGE', FLASH: 'FLASH' };
  CompanionAdSelectionSettings.ResourceType = { ALL: 'ALL', HTML: 'HTML', IFRAME: 'IFRAME', STATIC: 'STATIC' };
  CompanionAdSelectionSettings.SizeCriteria = { IGNORE: 'IGNORE', SELECT_EXACT_MATCH: 'SELECT_EXACT_MATCH', SELECT_NEAR_MATCH: 'SELECT_NEAR_MATCH' };

  function AdsManager() {
    EventTarget.call(this);
  }
  AdsManager.prototype = Object.create(EventTarget.prototype);
  AdsManager.prototype.constructor = AdsManager;
  AdsManager.prototype.getCuePoints = function() { return []; };
  AdsManager.prototype.destroy = NoopFn;
  AdsManager.prototype.init = NoopFn;
  AdsManager.prototype.start = NoopFn;
  AdsManager.prototype.stop = NoopFn;
  AdsManager.prototype.skip = NoopFn;
  AdsManager.prototype.pause = NoopFn;
  AdsManager.prototype.resume = NoopFn;
  AdsManager.prototype.resize = NoopFn;
  AdsManager.prototype.setVolume = NoopFn;
  AdsManager.prototype.getVolume = function() { return 1; };
  AdsManager.prototype.collapse = NoopFn;
  AdsManager.prototype.expand = NoopFn;
  AdsManager.prototype.getRemainingTime = function() { return 0; };
  AdsManager.prototype.getAdSkippableState = function() { return false; };
  AdsManager.prototype.isCustomClickTrackingUsed = function() { return false; };
  AdsManager.prototype.isCustomPlaybackUsed = function() { return false; };
  AdsManager.prototype.discardAdBreak = NoopFn;
  AdsManager.prototype.updateAdsRenderingSettings = NoopFn;

  function AdsManagerLoadedEvent(adsManager) {
    this.type = 'ADS_MANAGER_LOADED';
    this._adsManager = adsManager;
  }
  AdsManagerLoadedEvent.Type = { ADS_MANAGER_LOADED: 'ADS_MANAGER_LOADED' };
  AdsManagerLoadedEvent.prototype.getAdsManager = function() { return this._adsManager; };
  AdsManagerLoadedEvent.prototype.getUserRequestContext = function() { return {}; };

  function AdsLoader(container) {
    EventTarget.call(this);
    this._container = container;
  }
  AdsLoader.prototype = Object.create(EventTarget.prototype);
  AdsLoader.prototype.constructor = AdsLoader;
  AdsLoader.prototype.contentComplete = NoopFn;
  AdsLoader.prototype.destroy = NoopFn;
  AdsLoader.prototype.getSettings = function() { return new ImaSdkSettings(); };
  AdsLoader.prototype.requestAds = function() {
    var self = this;
    var mgr = new AdsManager();
    // Fire ADS_MANAGER_LOADED so the player thinks ads loaded (but there are none)
    setTimeout(function() {
      self._fire('ADS_MANAGER_LOADED', new AdsManagerLoadedEvent(mgr));
    }, 5);
  };

  function AdsRequest() {}
  AdsRequest.prototype.setAdWillAutoPlay = NoopFn;
  AdsRequest.prototype.setAdWillPlayMuted = NoopFn;
  AdsRequest.prototype.setContinuousPlayback = NoopFn;

  function AdError(msg) { this.message = msg || ''; this.type = 'adError'; }
  AdError.ErrorCode = {};
  AdError.prototype.getErrorCode = function() { return 0; };
  AdError.prototype.getVastErrorCode = function() { return 0; };
  AdError.prototype.getMessage = function() { return this.message; };
  AdError.prototype.getType = function() { return this.type; };
  AdError.prototype.getInnerError = function() { return null; };

  function AdErrorEvent(error) { this.type = 'AD_ERROR'; this._error = error; }
  AdErrorEvent.Type = { AD_ERROR: 'AD_ERROR' };
  AdErrorEvent.prototype.getError = function() { return this._error; };
  AdErrorEvent.prototype.getUserRequestContext = function() { return {}; };

  function AdEvent(type) { this.type = type; }
  AdEvent.Type = {
    AD_BREAK_READY: 'adBreakReady', AD_BUFFERING: 'adBuffering',
    AD_CAN_PLAY: 'adCanPlay', AD_METADATA: 'adMetadata',
    ALL_ADS_COMPLETED: 'allAdsCompleted', CLICK: 'click',
    COMPLETE: 'complete', CONTENT_PAUSE_REQUESTED: 'contentPauseRequested',
    CONTENT_RESUME_REQUESTED: 'contentResumeRequested',
    DURATION_CHANGE: 'durationChange', FIRST_QUARTILE: 'firstQuartile',
    IMPRESSION: 'impression', INTERACTION: 'interaction',
    LINEAR_CHANGED: 'linearChanged', LOADED: 'loaded', LOG: 'log',
    MIDPOINT: 'midpoint', PAUSED: 'pause', RESUMED: 'resume',
    SKIPPABLE_STATE_CHANGED: 'skippableStateChanged',
    SKIPPED: 'skip', STARTED: 'start',
    THIRD_QUARTILE: 'thirdQuartile', USER_CLOSE: 'userClose',
    VIDEO_CLICKED: 'videoClicked', VIDEO_ICON_CLICKED: 'videoIconClicked',
    VOLUME_CHANGED: 'volumeChange', VOLUME_MUTED: 'mute'
  };
  AdEvent.prototype.getAd = function() { return {}; };
  AdEvent.prototype.getAdData = function() { return {}; };

  function ImaSdkSettings() {}
  ImaSdkSettings.CompanionBackfillMode = { ALWAYS: 'always', ON_MASTER_AD: 'on_master_ad' };
  ImaSdkSettings.VpaidMode = { DISABLED: 0, ENABLED: 1, INSECURE: 2 };
  ImaSdkSettings.prototype.getCompanionBackfill = NoopFn;
  ImaSdkSettings.prototype.setCompanionBackfill = NoopFn;
  ImaSdkSettings.prototype.setAutoPlayAdBreaks = NoopFn;
  ImaSdkSettings.prototype.getDisableCustomPlaybackForIOS10Plus = function() { return false; };
  ImaSdkSettings.prototype.setDisableCustomPlaybackForIOS10Plus = NoopFn;
  ImaSdkSettings.prototype.setLocale = NoopFn;
  ImaSdkSettings.prototype.setNumRedirects = NoopFn;
  ImaSdkSettings.prototype.setPlayerType = NoopFn;
  ImaSdkSettings.prototype.setPlayerVersion = NoopFn;
  ImaSdkSettings.prototype.setVpaidAllowed = NoopFn;
  ImaSdkSettings.prototype.setVpaidMode = NoopFn;
  ImaSdkSettings.prototype.setSessionId = NoopFn;
  ImaSdkSettings.prototype.setStreamCorrelator = NoopFn;
  ImaSdkSettings.prototype.getLocale = function() { return ''; };
  ImaSdkSettings.prototype.getPlayerType = function() { return ''; };
  ImaSdkSettings.prototype.getPlayerVersion = function() { return ''; };

  function ViewMode() {}
  ViewMode.FULLSCREEN = 'fullscreen';
  ViewMode.NORMAL = 'normal';

  // Install the mock IMA namespace
  if (!window.google) window.google = {};
  window.google.ima = {
    AdDisplayContainer: AdDisplayContainer,
    AdError: AdError,
    AdErrorEvent: AdErrorEvent,
    AdEvent: AdEvent,
    AdsLoader: AdsLoader,
    AdsManager: AdsManager,
    AdsManagerLoadedEvent: AdsManagerLoadedEvent,
    AdsRenderingSettings: AdsRenderingSettings,
    AdsRequest: AdsRequest,
    CompanionAdSelectionSettings: CompanionAdSelectionSettings,
    ImaSdkSettings: ImaSdkSettings,
    OmidAccessMode: { DOMAIN: 'domain', FULL: 'full', LIMITED: 'limited' },
    OmidVerificationVendor: {},
    UiElements: { COUNTDOWN: 'countdown', AD_ATTRIBUTION: 'adAttribution' },
    UniversalAdIdInfo: NoopFn,
    ViewMode: ViewMode,
    VERSION: '3.0.0',
    settings: new ImaSdkSettings()
  };

  // Prevent scripts from overriding our mock
  try {
    Object.defineProperty(window.google, 'ima', {
      value: window.google.ima,
      writable: false,
      configurable: false
    });
  } catch(e) {}
  } // end if (!skipIMA)

  // ============================================================
  // 2. HTMLMediaElement.prototype.play hook
  //    Intercepts all play() calls and blocks ad videos.
  // ============================================================
  var adDomainPatterns = [
    'doubleclick', 'googlesyndication', 'googleadservices', 'imasdk',
    'adnxs', 'taboola', 'outbrain', 'amazon-adsystem',
    'criteo', 'pubmatic', 'serving-sys', 'ads.', 'adserver',
    'vdo.ai', 'primis', 'connatix', 'springserve', 'clmbtech', 'jsrdn'
  ];

  var originalPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function() {
    try {
      var video = this;
      var src = (video.src || video.currentSrc || '').toLowerCase();

      // Don't intercept same-origin videos (e.g. YouTube serving its own content)
      try {
        if (src && new URL(src).hostname === window.location.hostname) {
          return originalPlay.apply(video, arguments);
        }
      } catch(e) {}

      // Check source URL for ad patterns
      for (var i = 0; i < adDomainPatterns.length; i++) {
        if (src.indexOf(adDomainPatterns[i]) > -1) {
          video.pause();
          video.muted = true;
          return Promise.resolve();
        }
      }
      if (src.indexOf('/vast') > -1 || src.indexOf('/vpaid') > -1 ||
          src.indexOf('/preroll') > -1 || src.indexOf('/midroll') > -1) {
        video.pause();
        video.muted = true;
        return Promise.resolve();
      }

      // Check parent elements for ad containers
      var el = video.parentElement;
      for (var j = 0; j < 8 && el; j++) {
        var id = (el.id || '').toLowerCase();
        var cls = (el.className && typeof el.className === 'string') ? el.className.toLowerCase() : '';

        if (id.indexOf('ad-') > -1 || id.indexOf('ad_') > -1 || id.indexOf('ads-') > -1 ||
            id.indexOf('video-ad') > -1 || id.indexOf('video_ad') > -1 || id.indexOf('videoad') > -1 ||
            cls.indexOf('ad-container') > -1 || cls.indexOf('ad_container') > -1 ||
            cls.indexOf('ad-wrapper') > -1 || cls.indexOf('ad_wrapper') > -1 ||
            cls.indexOf('video-ad') > -1 || cls.indexOf('video_ad') > -1 || cls.indexOf('videoad') > -1 ||
            cls.indexOf('preroll') > -1 || cls.indexOf('outstream') > -1 ||
            cls.indexOf('ima-') > -1 || cls.indexOf('ima_') > -1 ||
            cls.indexOf('vdo-ai') > -1 || cls.indexOf('primis') > -1 || cls.indexOf('connatix') > -1 ||
            cls.indexOf('clmb') > -1 ||
            el.hasAttribute('data-ad-client') || el.hasAttribute('data-ad-slot') ||
            el.hasAttribute('data-google-query-id')) {
          video.pause();
          video.muted = true;
          return Promise.resolve();
        }
        el = el.parentElement;
      }

      // Check <source> children for ad URLs
      var sources = video.querySelectorAll('source');
      for (var s = 0; s < sources.length; s++) {
        var sSrc = (sources[s].src || '').toLowerCase();
        for (var d = 0; d < adDomainPatterns.length; d++) {
          if (sSrc.indexOf(adDomainPatterns[d]) > -1) {
            video.pause();
            video.muted = true;
            return Promise.resolve();
          }
        }
      }
    } catch(e) {}

    return originalPlay.apply(this, arguments);
  };

  // ============================================================
  // 3. Block ad-related script loading
  //    Prevent known ad scripts from executing by intercepting
  //    createElement('script') and checking src.
  // ============================================================
  var blockedScriptDomains = [
    'imasdk.googleapis.com',
    'securepubads.g.doubleclick.net',
    'pagead2.googlesyndication.com',
    'adservice.google.com',
    'cdn.taboola.com',
    'cdn.outbrain.com',
    'vdo.ai',
    'primis.tech',
    'connatix.com',
    'clmbtech.com',
    'jsrdn.com',
    'colombiaonline.com'
  ];

  var origCreateElement = document.createElement.bind(document);
  document.createElement = function(tag) {
    var el = origCreateElement(tag);
    var lcTag = (tag || '').toLowerCase();

    if (lcTag === 'script') {
      var origSetAttr = el.setAttribute.bind(el);
      el.setAttribute = function(name, value) {
        if (name === 'src' && typeof value === 'string') {
          var lcVal = value.toLowerCase();
          for (var i = 0; i < blockedScriptDomains.length; i++) {
            if (lcVal.indexOf(blockedScriptDomains[i]) > -1) {
              return; // silently drop the src
            }
          }
        }
        return origSetAttr(name, value);
      };
      // Also intercept .src property
      var srcDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
      if (srcDesc && srcDesc.set) {
        Object.defineProperty(el, 'src', {
          set: function(v) {
            if (typeof v === 'string') {
              var lcv = v.toLowerCase();
              for (var i = 0; i < blockedScriptDomains.length; i++) {
                if (lcv.indexOf(blockedScriptDomains[i]) > -1) return;
              }
            }
            srcDesc.set.call(this, v);
          },
          get: function() { return srcDesc.get.call(this); },
          configurable: true
        });
      }
    }

    if (lcTag === 'iframe') {
      var origSetAttrIframe = el.setAttribute.bind(el);
      el.setAttribute = function(name, value) {
        if (name === 'src' && typeof value === 'string') {
          var lcVal = value.toLowerCase();
          for (var i = 0; i < blockedScriptDomains.length; i++) {
            if (lcVal.indexOf(blockedScriptDomains[i]) > -1) {
              value = 'about:blank';
              break;
            }
          }
          if (lcVal.indexOf('doubleclick.net') > -1 || lcVal.indexOf('adnxs.com') > -1 ||
              lcVal.indexOf('amazon-adsystem.com') > -1 || lcVal.indexOf('criteo.') > -1 ||
              lcVal.indexOf('serving-sys.com') > -1 || lcVal.indexOf('pubmatic.com') > -1) {
            value = 'about:blank';
          }
        }
        return origSetAttrIframe(name, value);
      };
    }

    return el;
  };
})();
`;

/**
 * DOM-ready script for cosmetic ad removal, MutationObserver, and cleanup.
 * Runs after the DOM is ready to actively remove ad elements.
 */
export const AD_BLOCK_SCRIPT = `
(function() {
  'use strict';
  if (window.__Nav0AdBlockerDOM) return;
  window.__Nav0AdBlockerDOM = true;

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
    '.ima-container',
    'div[class*="ima-"]',
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
    '[id*="adbox"]',
    '[id*="clmb"]',
    '[class*="clmb"]'
  ];

  var combinedSelector = adSelectors.join(',');

  // Guard: don't hide elements that are major content containers
  function isLikelyMainContent(el) {
    try {
      if (el.querySelectorAll('p, h1, h2, h3, article, section').length > 5) return true;
      var tag = el.tagName;
      if (tag === 'NAV' || tag === 'MAIN' || tag === 'ARTICLE') return true;
      var id = (el.id || '').toLowerCase();
      var cls = (el.className && typeof el.className === 'string') ? el.className.toLowerCase() : '';
      if (id.indexOf('nav') > -1 || cls.indexOf('nav') > -1) return true;
    } catch(e) {}
    return false;
  }

  function hideElement(el) {
    if (el && el.style && !el.getAttribute('data-Nav0-blocked')) {
      if (isLikelyMainContent(el)) return;
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('height', '0', 'important');
      el.style.setProperty('min-height', '0', 'important');
      el.style.setProperty('max-height', '0', 'important');
      el.style.setProperty('overflow', 'hidden', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
      el.setAttribute('data-Nav0-blocked', 'true');
    }
  }

  function removeExistingAds() {
    try {
      var ads = document.querySelectorAll(combinedSelector);
      for (var i = 0; i < ads.length; i++) hideElement(ads[i]);
    } catch(e) {}
  }

  // Check if a video element is an ad using multiple heuristics
  function isVideoAd(video) {
    var src = (video.src || video.currentSrc || '').toLowerCase();

    // Check source URL for ad patterns
    if (src.indexOf('doubleclick') > -1 || src.indexOf('googlesyndication') > -1 ||
        src.indexOf('imasdk') > -1 || src.indexOf('vast') > -1 || src.indexOf('vpaid') > -1 ||
        src.indexOf('preroll') > -1 || src.indexOf('adserver') > -1 ||
        src.indexOf('clmbtech') > -1 || src.indexOf('jsrdn') > -1 ||
        src.indexOf('googleads') > -1 || src.indexOf('advert') > -1 ||
        src.indexOf('promo') > -1 || src.indexOf('commercial') > -1) {
      return true;
    }

    // Check <source> children
    var sources = video.querySelectorAll('source');
    for (var s = 0; s < sources.length; s++) {
      var sSrc = (sources[s].src || '').toLowerCase();
      if (sSrc.indexOf('doubleclick') > -1 || sSrc.indexOf('googleads') > -1 ||
          sSrc.indexOf('advert') > -1 || sSrc.indexOf('promo') > -1 || sSrc.indexOf('adserver') > -1) {
        return true;
      }
    }

    // Check own class/id
    var vCls = (video.className && typeof video.className === 'string') ? video.className.toLowerCase() : '';
    var vId = (video.id || '').toLowerCase();
    if (vCls.match(/\\bad[s]?\\b|advertisement|commercial|promo/i) ||
        vId.match(/\\bad[s]?\\b|advertisement|commercial|promo/i)) {
      return true;
    }

    // Walk up parent containers
    var el = video.parentElement;
    for (var j = 0; j < 8 && el; j++) {
      var id = (el.id || '').toLowerCase();
      var cls = (el.className && typeof el.className === 'string') ? el.className.toLowerCase() : '';
      if (id.indexOf('ad-') > -1 || id.indexOf('ad_') > -1 || id.indexOf('ads-') > -1 ||
          id.indexOf('video-ad') > -1 || id.indexOf('video_ad') > -1 ||
          cls.indexOf('ad-container') > -1 || cls.indexOf('ad_container') > -1 ||
          cls.indexOf('ad-wrapper') > -1 || cls.indexOf('ad_wrapper') > -1 ||
          cls.indexOf('video-ad') > -1 || cls.indexOf('video_ad') > -1 ||
          cls.indexOf('preroll') > -1 || cls.indexOf('outstream') > -1 ||
          cls.indexOf('ima-') > -1 || cls.indexOf('ima_') > -1 ||
          cls.indexOf('vdo-ai') > -1 || cls.indexOf('primis') > -1 ||
          cls.indexOf('connatix') > -1 || cls.indexOf('clmb') > -1 ||
          cls.indexOf('ad-showing') > -1 || cls.indexOf('ad-player') > -1 ||
          cls.indexOf('jw-state-advertising') > -1 ||
          el.hasAttribute('data-ad-client') || el.hasAttribute('data-ad-slot') ||
          el.hasAttribute('data-google-query-id') || el.hasAttribute('data-ad-format')) {
        return true;
      }
      el = el.parentElement;
    }


    return false;
  }

  function killAdVideos() {
    try {
      var videos = document.querySelectorAll('video');
      for (var i = 0; i < videos.length; i++) {
        var video = videos[i];

        // Attach per-video listeners to intercept future play/load events
        if (!video.getAttribute('data-Nav0-monitored')) {
          video.setAttribute('data-Nav0-monitored', 'true');

          video.addEventListener('play', function() {
            if (isVideoAd(this)) {
              this.pause();
              this.muted = true;
            }
          });

          video.addEventListener('loadstart', function() {
            if (isVideoAd(this)) {
              this.pause();
              this.muted = true;
            }
          });
        }

        if (isVideoAd(video)) {
          video.pause();
          video.removeAttribute('autoplay');
          video.autoplay = false;
          video.muted = true;
          try { video.src = ''; video.load(); } catch(e) {}
          hideElement(video);
          if (video.parentElement) hideElement(video.parentElement);
        }
      }

      // Also check iframe-based video players whose parent is an ad container
      var iframes = document.querySelectorAll('iframe');
      for (var f = 0; f < iframes.length; f++) {
        var iframe = iframes[f];
        var iSrc = (iframe.src || '').toLowerCase();
        if (iSrc.match(/youtube|vimeo|dailymotion|jwplayer/)) {
          var iParent = iframe.parentElement;
          for (var ip = 0; ip < 4 && iParent; ip++) {
            var iCls = (iParent.className && typeof iParent.className === 'string') ? iParent.className.toLowerCase() : '';
            var iId = (iParent.id || '').toLowerCase();
            if (iCls.match(/ad|ads|advertisement/i) || iId.match(/ad|ads|advertisement/i)) {
              hideElement(iframe);
              break;
            }
            iParent = iParent.parentElement;
          }
        }
      }
    } catch(e) {}
  }

  function removeOverlayAds() {
    try {
      var all = document.querySelectorAll('div, section, aside');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        var style = window.getComputedStyle(el);
        var zIndex = parseInt(style.zIndex);
        var pos = style.position;
        if (zIndex > 999999 && (pos === 'fixed' || pos === 'absolute')) {
          var rect = el.getBoundingClientRect();
          if (rect.width > window.innerWidth * 0.4 && rect.height > window.innerHeight * 0.25) {
            var id = (el.id || '').toLowerCase();
            var cls = (el.className && typeof el.className === 'string') ? el.className.toLowerCase() : '';
            // Skip legitimate modals
            if (cls.indexOf('cookie') > -1 || cls.indexOf('consent') > -1 ||
                cls.indexOf('login') > -1 || cls.indexOf('signup') > -1 || cls.indexOf('paywall') > -1 ||
                id.indexOf('cookie') > -1 || id.indexOf('consent') > -1 ||
                id.indexOf('login') > -1) continue;
            hideElement(el);
            // Also remove any backdrop/scrim behind it
            if (el.previousElementSibling) {
              var sib = el.previousElementSibling;
              var sibStyle = window.getComputedStyle(sib);
              if (parseInt(sibStyle.zIndex) > 999998 && (sibStyle.position === 'fixed' || sibStyle.position === 'absolute')) {
                hideElement(sib);
              }
            }
          }
        }
      }
    } catch(e) {}
  }

  // MutationObserver for dynamically inserted ads
  var observer = new MutationObserver(function(mutations) {
    var shouldScanVideos = false;
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes.length > 0) {
        for (var j = 0; j < mutations[i].addedNodes.length; j++) {
          var node = mutations[i].addedNodes[j];
          if (node.nodeType === 1) {
            shouldScanVideos = true;
            try {
              if (node.matches && node.matches(combinedSelector)) hideElement(node);
              var childAds = node.querySelectorAll ? node.querySelectorAll(combinedSelector) : [];
              for (var k = 0; k < childAds.length; k++) hideElement(childAds[k]);
            } catch(e) {}
          }
        }
      }
    }
    if (shouldScanVideos) killAdVideos();
  });

  removeExistingAds();
  killAdVideos();

  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Periodic aggressive cleanup
  var count = 0;
  var interval = setInterval(function() {
    removeExistingAds();
    killAdVideos();
    removeOverlayAds();
    count++;
    if (count > 30) clearInterval(interval);
  }, 1000);

  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      setTimeout(function() {
        removeExistingAds();
        killAdVideos();
        removeOverlayAds();
      }, 500);
    }
  });
})();
`;
