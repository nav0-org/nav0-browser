/**
 * Comprehensive ad-blocker lists for domain blocking, URL pattern matching,
 * and cosmetic filtering.
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

  // Content Recommendation
  'taboola.com',
  'outbrain.com',
  'revcontent.com',
  'mgid.com',
  'content.ad',
  'contentad.net',
  'nativo.com',
  'zergnet.com',

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

  // PopUp / PopUnder
  'popads.net',
  'popcash.net',
  'propellerads.com',
  'juicyads.com',
  'exoclick.com',
  'trafficfactory.biz',
  'hilltopads.net',

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

  // Additional Trackers
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

  // Common CDN-hosted ad scripts
  'cdn.taboola.com',
  'cdn.outbrain.com',
  'securepubads.g.doubleclick.net',
  'ad.doubleclick.net',
  'stats.g.doubleclick.net',
  'tpc.googlesyndication.com',
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
iframe[id*="google_ads"],
iframe[name*="google_ads"],

/* Taboola / Outbrain */
.trc_rbox_container,
.OUTBRAIN,
[data-widget-id*="taboola"],
[id^="taboola-"],
#taboola-below-article,
.ob-widget,
.ob-smartfeed-wrapper,

/* Social tracking widgets */
.addthis_toolbox,
.sharethis-inline-share-buttons,

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
.sticky-ad,
.floating-ad {
  display: none !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}
`;
