(function (global) {
  'use strict';

  var androidStoreUrl =
    'https://play.google.com/store/apps/details?id=tw.com.grapes.yellow';

  function destinationForDevice(navigatorLike, iosStoreUrl) {
    var userAgent = String(navigatorLike.userAgent || '');
    var platform = String(navigatorLike.platform || '');
    var maxTouchPoints = Number(navigatorLike.maxTouchPoints || 0);
    var isAppleMobile = /iPhone|iPad|iPod/i.test(userAgent) ||
      (platform === 'MacIntel' && maxTouchPoints > 1);

    if (isAppleMobile) {
      return typeof iosStoreUrl === 'string' && iosStoreUrl.length > 0
        ? iosStoreUrl
        : null;
    }
    if (/Android/i.test(userAgent)) return androidStoreUrl;
    return null;
  }

  global.YellowGrapesManagerInvite = { destinationForDevice: destinationForDevice };
  if (typeof module === 'object' && module.exports) {
    module.exports = { androidStoreUrl: androidStoreUrl, destinationForDevice: destinationForDevice };
  }
})(typeof globalThis === 'undefined' ? this : globalThis);
