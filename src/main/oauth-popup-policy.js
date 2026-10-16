"use strict";

const { shouldBlockRequest } = require("./ad-blocker");

const POPUP_AD_BLOCKER_SETTINGS = {
  enabled: true,
  mode: "lightweight",
  exceptions: [],
};

function isAllowedPopupUrl(value) {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && !shouldBlockRequest({
      url: url.href,
      resourceType: "other",
      pageUrl: "",
      settings: POPUP_AD_BLOCKER_SETTINGS,
    });
  } catch {
    return false;
  }
}

function isAllowedOAuthPopupUrl(value) {
  if (!isAllowedPopupUrl(value)) return false;
  const url = new URL(value);
  if (url.username || url.password) return false;
  // Dedicated Google identity origin plus the established Figma Google entry point.
  // Window names/features alone are not evidence of an authentication request.
  return url.origin === "https://accounts.google.com" || (
    url.origin === "https://www.figma.com" && url.pathname === "/api/oauth/google"
  );
}

module.exports = { isAllowedPopupUrl, isAllowedOAuthPopupUrl };
