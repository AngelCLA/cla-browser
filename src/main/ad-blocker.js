const LIGHTWEIGHT_DOMAINS = new Set([
  // Google / DoubleClick
  '2mdn.net',
  'doubleclick.net',
  'googleadservices.com',
  'googlesyndication.com',
  'googletagservices.com',
  'google-analytics.com',
  'googletagmanager.com',
  'googleoptimize.com',
  'googlesyndication.com',
  'pagead2.googlesyndication.com',
  'adservice.google.com',
  'adservice.google.com.mx',

  // Microsoft / Xandr / AppNexus
  'adnxs.com',
  'adsrvr.org',
  'bat.bing.com',
  'clarity.ms',
  'microsoftadvertising.com',
  'bingads.microsoft.com',

  // Amazon Ads
  'amazon-adsystem.com',
  'aax.amazon-adsystem.com',
  'fls-na.amazon.com',
  'assoc-amazon.com',

  // Meta
  'connect.facebook.net',
  'facebook.net',
  'pixel.facebook.com',

  // TikTok
  'analytics.tiktok.com',
  'ads.tiktok.com',
  'business-api.tiktok.com',
  'mon.tiktokv.com',

  // Twitter / X
  'ads-twitter.com',
  'static.ads-twitter.com',
  'analytics.twitter.com',

  // LinkedIn
  'snap.licdn.com',
  'px.ads.linkedin.com',

  // Pinterest
  'ct.pinterest.com',
  'log.pinterest.com',

  // Snapchat
  'sc-static.net',
  'tr.snapchat.com',

  // Reddit
  'alb.reddit.com',
  'events.redditmedia.com',

  // Criteo
  'criteo.com',
  'criteo.net',
  'static.criteo.net',
  'bidder.criteo.com',
  'dis.criteo.com',

  // Taboola
  'taboola.com',
  'trc.taboola.com',
  'cdn.taboola.com',
  'images.taboola.com',

  // Outbrain
  'outbrain.com',
  'widgets.outbrain.com',
  'log.outbrain.com',
  'amplify.outbrain.com',

  // Zedo
  'zedo.com',
  'zedo.net',

  // Moat
  'moatads.com',
  'moat.com',

  // Comscore
  'scorecardresearch.com',
  'comscore.com',

  // Hotjar
  'hotjar.com',
  'hotjar.io',
  'static.hotjar.com',
  'vars.hotjar.com',
  'insights.hotjar.com',

  // Adobe Analytics / Advertising
  'omtrdc.net',
  'demdex.net',
  'everesttech.net',
  'adobedtm.com',
  '2o7.net',

  // Quantcast
  'quantserve.com',
  'quantcount.com',
  'quantcast.com',

  // PubMatic
  'pubmatic.com',
  'ads.pubmatic.com',
  'image2.pubmatic.com',

  // OpenX
  'openx.net',
  'openx.com',
  'servedbyopenx.com',

  // Magnite / Rubicon
  'rubiconproject.com',
  'ads.rubiconproject.com',
  'magnite.com',

  // Index Exchange
  'indexww.com',
  'casalemedia.com',

  // Sovrn
  'sovrn.com',
  'lijit.com',
  'lijit.com',

  // Adform
  'adform.net',
  'adform.com',

  // Smart AdServer
  'smartadserver.com',
  'smartadserver.net',

  // Media.net
  'media.net',
  'contextweb.com',

  // Yahoo Ads
  'advertising.com',
  'yieldmanager.com',
  'yieldmanager.net',
  'yahoo.com',
  'gemini.yahoo.com',

  // AOL
  'atwola.com',

  // TripleLift
  'triplelift.com',

  // Sharethrough
  'sharethrough.com',

  // Teads
  'teads.tv',
  'teads.com',

  // GumGum
  'gumgum.com',
  'gumgum.io',

  // AdRoll
  'adroll.com',
  'adroll.mgr.consensu.org',
  'd.adroll.com',

  // StackAdapt
  'stackadapt.com',

  // AdColony
  'adcolony.com',

  // InMobi
  'inmobi.com',
  'inmobicdn.net',

  // Unity Ads
  'unityads.unity3d.com',
  'unityads.unity.com',

  // Vungle
  'vungle.com',
  'vungle.cn',

  // AppLovin
  'applovin.com',
  'applvn.com',

  // IronSource
  'ironsrc.com',
  'supersonicads.com',

  // Chartboost
  'chartboost.com',

  // Tapjoy
  'tapjoy.com',

  // Branch
  'branch.io',

  // Adjust
  'adjust.com',
  'adjust.io',

  // AppsFlyer
  'appsflyer.com',

  // Kochava
  'kochava.com',

  // Segment
  'segment.com',
  'segment.io',
  'segmentapis.com',

  // Mixpanel
  'mixpanel.com',

  // Amplitude
  'amplitude.com',

  // Heap
  'heap.io',

  // FullStory
  'fullstory.com',

  // Mouseflow
  'mouseflow.com',

  // Crazy Egg
  'crazyegg.com',

  // Lucky Orange
  'luckyorange.com',

  // Kissmetrics
  'kissmetrics.io',
  'kissmetrics.com',

  // New Relic
  'newrelic.com',
  'nr-data.net',

  // Sentry telemetry
  'sentry.io',

  // OneSignal
  'onesignal.com',

  // Pushwoosh
  'pushwoosh.com',

  // OneTag
  'onetag-sys.com',

  // BidSwitch
  'bidswitch.net',

  // Improve Digital
  'improvedigital.com',

  // AdKernel
  'adkernel.com',

  // AdYouLike
  'adyoulike.com',

  // Yieldlab
  'yieldlab.net',

  // Yieldmo
  'yieldmo.com',

  // Yieldlove
  'yieldlove.com',

  // RevContent
  'revcontent.com',

  // MGID
  'mgid.com',

  // Adsterra
  'adsterra.com',
  'adsterra.network',

  // PropellerAds
  'propellerads.com',
  'propellerads.net',

  // PopAds
  'popads.net',

  // ExoClick
  'exoclick.com',
  'exosrv.com',

  // TrafficJunky
  'trafficjunky.com',

  // TrafficStars
  'trafficstars.com',

  // HilltopAds
  'hilltopads.net',

  // Clickadu
  'clickadu.com',

  // Adcash
  'adcash.com',

  // AdMaven
  'admaven.com',

  // Monetag
  'monetag.com',

  // PopCash
  'popcash.net',

  // Ezoic
  'ezoic.net',
  'ezoic.com',

  // AdThrive / Raptive
  'adthrive.com',
  'raptive.com',

  // Mediavine
  'mediavine.com',

  // AdButler
  'adbutler.com',

  // AdSpirit
  'adspirit.de',

  // AdOcean
  'adocean.pl',

  // Adition
  'adition.com',

  // Flashtalking
  'flashtalking.com',

  // Sizmek
  'sizmek.com',

  // Eyeota
  'eyeota.net',

  // Lotame
  'lotame.com',

  // BlueKai
  'bluekai.com',

  // Neustar
  'agkn.com',

  // LiveRamp
  'liveramp.com',
  'rlcdn.com',

  // Tapad
  'tapad.com',

  // Neustar / identity tracking
  'krxd.net',

  // Oracle Advertising
  'addthis.com',
  'addthisedge.com',
  'addthiscdn.com',

  // ShareThis
  'sharethis.com',

  // Weborama
  'weborama.com',

  // Neustar / Aggregate Knowledge
  'aggregateknowledge.com',

  // DataXu
  'dataxu.com',

  // Rocket Fuel
  'rfihub.com',
  'rfihub.net',

  // Simpli.fi
  'simpli.fi',

  // Centro / Basis
  'sitescout.com',

  // Adscale
  'adscale.de',

  // SpotX
  'spotxchange.com',
  'spotx.tv',

  // FreeWheel
  'freewheel.tv',
  'fwmrm.net',

  // Innovid
  'innovid.com',

  // Extreme Reach
  'extremereach.io',

  // DoubleVerify
  'doubleverify.com',
  'adsafeprotected.com',

  // Integral Ad Science
  'iasds01.com',
  'integralads.com',

  // Nielsen
  'imrworldwide.com',
  'nielsen.com',

  // Neustar analytics
  'revsci.net',

  // Misc
  'zedo.com',
  'yieldmo.com',
  'adzerk.net',
  'kevel.co',
  'adsafeprotected.com',
  'serving-sys.com',
  'serving-sys.com',
  'mathtag.com',
  'mathtag.com',
  'adgrx.com',
  'adscale.de',
  'adtech.de',
  'adtechus.com',
  'adtechjp.com'
]);

const REINFORCED_PATHS = [
  /\/(?:ad|ads|advert|advertising|pagead|prebid)(?:[/?._-]|$)/i,
  /[?&](?:ad_client|ad_slot|adformat|gclid|utm_[^=]+)=/i,
  /\/api\/stats\/ads(?:[/?]|$)/i,
];

function normalizeHostname(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function matchesDomain(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function normalizeExceptions(exceptions) {
  if (!Array.isArray(exceptions)) return [];
  const seen = new Set();
  return exceptions.flatMap((exception) => {
    const hostname = normalizeHostname(exception);
    if (!hostname || seen.has(hostname)) return [];
    seen.add(hostname);
    return [hostname];
  });
}

function shouldBlockRequest({ url, resourceType, pageUrl, settings }) {
  if (!settings?.enabled || resourceType === 'mainFrame') return false;

  const pageHostname = normalizeHostname(pageUrl);
  if (pageHostname && normalizeExceptions(settings.exceptions).some((exception) => matchesDomain(pageHostname, exception))) return false;

  let request;
  try {
    request = new URL(url);
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(request.protocol)) return false;

  if ([...LIGHTWEIGHT_DOMAINS].some((domain) => matchesDomain(request.hostname, domain))) return true;
  return settings.mode === 'reinforced' && REINFORCED_PATHS.some((pattern) => pattern.test(`${request.pathname}${request.search}`));
}

function normalizeAdBlockerSettings(value) {
  return {
    enabled: typeof value?.enabled === 'boolean' ? value.enabled : true,
    mode: value?.mode === 'reinforced' ? 'reinforced' : 'lightweight',
    exceptions: normalizeExceptions(value?.exceptions),
  };
}

module.exports = { normalizeAdBlockerSettings, normalizeExceptions, normalizeHostname, shouldBlockRequest };
