"use strict";

const { shouldBlockRequest } = require("./ad-blocker");

const POPUP_AD_BLOCKER_SETTINGS = {
  enabled: true,
  mode: "lightweight",
  exceptions: [],
};

function isAllowedOAuthPopupUrl(value) {
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

module.exports = { isAllowedOAuthPopupUrl };
